import readline from 'readline';

import { DevContext, Platform } from '../types.ts';
import android from './watchers.android';
import ios from './watchers.ios.ts';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types.ts';
import { FSWatcher, watch } from 'fs';
import { debounce } from '../utils/debounce.ts';

const WATCHERS: Record<Platform, { filePaths: FileWatcherDef[]; keyCommands: KeyWatcherDef[] }> = { android, ios };

export async function runWatchers(ctx: DevContext): Promise<void> {
  // Setup shared context
  const { platform } = ctx;
  const abort = new AbortController();
  const cmdCtx = createCommandCtx(ctx);

  // Setup key press and file watchers
  const { filePaths, keyCommands } = WATCHERS[platform];

  const cleanup = setupKeypress((key) => {
    handleKeypress(key, cmdCtx, abort, keyCommands);
  });
  const fsWatchers = startFileWatchers(filePaths, cmdCtx);

  // Handle Signals
  abort.signal.addEventListener('abort', () => {
    cleanup();
    fsWatchers.forEach((w) => w.close());
  });

  const onSignal = (signal: NodeJS.Signals) => {
    console.log('\n👋 Shutting down...');
    abort.abort();
    process.kill(process.pid, signal);
  };
  process.once('SIGINT', () => onSignal('SIGINT'));
  process.once('SIGTERM', () => onSignal('SIGTERM'));

  console.log(`\n👀 Watching for changes...`);
  printHelp(keyCommands);

  await new Promise<void>((resolve) => {
    abort.signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

/**
 * Create a comman context used to block file watch and keypress actions
 * while existing actions are pending
 */
export function createCommandCtx(ctx: DevContext): WatchContext {
  let syncing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    ...ctx,
    isSyncing: () => syncing,
    setSyncing: (v: boolean) => {
      syncing = v;
    },
    clearDebounceTimer: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

/**
 * Watch platform-specific file paths and trigger related actions
 */
function startFileWatchers(defs: FileWatcherDef[], ctx: WatchContext): FSWatcher[] {
  return defs.map((def) => {
    const onChange = debounce(async () => {
      if (ctx.isSyncing()) return;
      ctx.clearDebounceTimer();
      ctx.setSyncing(true);
      await def.action(ctx);
      ctx.setSyncing(false);
      console.log(`\n👀 Watching for changes...`);
    }, 500);

    return watch(def.path, { recursive: true }, (_evt, filename) => {
      if (!filename) return;
      if (!def.pattern.test(filename)) return;
      onChange();
    });
  });
}

function handleKeypress(key: string, ctx: WatchContext, abort: AbortController, commands: KeyWatcherDef[]): void {
  if (key === 'q') {
    console.log('\n👋 Shutting down...');
    abort.abort();
    return;
  }

  const cmd = commands.find((c) => c.key === key);
  if (!cmd) return;

  if (cmd.exclusive) {
    if (ctx.isSyncing()) return;
    ctx.clearDebounceTimer();
    ctx.setSyncing(true);
    Promise.resolve(cmd.action(ctx)).finally(() => {
      ctx.setSyncing(false);
      console.log(`\n👀 Watching for changes...`);
    });
  } else {
    cmd.action(ctx);
  }
}

function printHelp(commands: KeyWatcherDef[]): void {
  commands.forEach((c) => console.log(`  ${c.label} ${c.description}`));
  console.log('  Press Q: Quit');
}

function setupKeypress(onKey: (key: string) => void): () => void {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode?.(true);
  process.stdin.resume?.();

  const handler = (_ch: string, key: { name: string; ctrl: boolean }) => {
    if (key.ctrl && key.name === 'c') {
      process.emit('SIGINT');
      return;
    }
    if (key.name) onKey(key.name.toLowerCase());
  };

  process.stdin.on('keypress', handler);

  return () => {
    process.stdin.removeListener('keypress', handler);
    process.stdin.setRawMode?.(false);
    process.stdin.pause?.();
  };
}

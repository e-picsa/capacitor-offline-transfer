import readline from 'readline';

import { Platform } from '../types';
import android from './watchers.android';
import ios from './watchers.ios.ts';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types';
import { FSWatcher, watch } from 'fs';
import { debounce } from '../utils/debounce.ts';
import { BootstrapContext } from '../bootstrap/bootstrap.types';
import { BOARDER_BOTTOM, BOARDER_TOP, boxLine } from '../utils/console.utils.ts';

export const WATCHERS: Record<Platform, { filePaths: FileWatcherDef[]; keyCommands: KeyWatcherDef[] }> = {
  android,
  ios,
};

export async function runWatchers(boostrapCtx: BootstrapContext): Promise<void> {
  // Setup shared context

  const cmdCtx = createCommandCtx(boostrapCtx);

  // Setup key press and file watchers
  const { filePaths, keyCommands } = WATCHERS[cmdCtx.platform];

  const cleanup = setupKeypress((key) => {
    handleKeypress(key, cmdCtx, keyCommands);
  });
  const fsWatchers = startFileWatchers(filePaths, cmdCtx);

  // Handle Signals
  cmdCtx.abort.signal.addEventListener('abort', () => {
    cleanup();
    fsWatchers.forEach((w) => w.close());
  });

  const onSignal = (signal: NodeJS.Signals) => {
    console.log('\n👋 Shutting down...');
    cmdCtx.abort.abort();
    process.kill(process.pid, signal);
  };
  process.once('SIGINT', () => onSignal('SIGINT'));
  process.once('SIGTERM', () => onSignal('SIGTERM'));

  console.log(`\n👀 Watching for changes...`);
  printHelp(cmdCtx);

  await new Promise<void>((resolve) => {
    cmdCtx.abort.signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

/**
 * Create a comman context used to block file watch and keypress actions
 * while existing actions are pending
 */
export function createCommandCtx(ctx: BootstrapContext): WatchContext {
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
    abort: new AbortController(),
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

function handleKeypress(key: string, ctx: WatchContext, commands: KeyWatcherDef[]): void {
  const cmd = commands.find((c) => c.key === key);
  if (!cmd) return;

  if (cmd.exclusive) {
    if (ctx.isSyncing()) return;
    ctx.clearDebounceTimer();
    ctx.setSyncing(true);
    Promise.resolve(cmd.action(ctx)).finally(() => {
      ctx.setSyncing(false);
      printHelp(ctx);
    });
  } else {
    cmd.action(ctx);
  }
}

function printHelp(ctx: WatchContext) {
  const commands = WATCHERS[ctx.platform].keyCommands;
  const lines = [BOARDER_TOP].concat(
    commands.map((c) => boxLine(`${c.key}: ${c.description}`)),
    BOARDER_BOTTOM,
  );
  console.log(lines.join('\n'));
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

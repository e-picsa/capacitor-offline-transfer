import readline from 'readline';

import { DevContext, KeyAction } from '../types.ts';
import android from './watchers.android';
import ios from './watchers.ios.ts';
import { Command, CommandContext } from '../commands/commands.types.ts';
import { COMMANDS, createCommandCtx } from '../commands/index.ts';

const WATCHERS = { android, ios };

const onDone = (ctx: CommandContext) => {
  ctx.setSyncing(false);
  console.log(`\n👀 Watching for changes...`);
};

export async function runWatchers(ctx: DevContext): Promise<void> {
  const { platform } = ctx;
  const abort = new AbortController();
  const cmdCtx = createCommandCtx(ctx);
  const watchers = WATCHERS[platform](cmdCtx);
  const commands = COMMANDS[platform](cmdCtx);

  const cleanup = setupKeypress((action: KeyAction) => {
    onKeyAction(action, cmdCtx, abort, commands, () => onDone(cmdCtx));
  });

  abort.signal.addEventListener('abort', () => {
    cleanup();
    watchers.forEach((w) => w.close());
  });

  process.once('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    abort.abort();
    process.kill(process.pid, 'SIGINT');
  });
  process.once('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    abort.abort();
    process.kill(process.pid, 'SIGTERM');
  });

  await new Promise<void>((resolve) => {
    abort.signal.addEventListener('abort', () => resolve(), { once: true });
  });
}

function onKeyAction(
  action: KeyAction,
  ctx: CommandContext,
  abort: AbortController,
  commands: Command[],
  onDone: () => void,
): void {
  if (!action) return;

  if (action === 'quit') {
    console.log('\n👋 Shutting down...');
    abort.abort();
    return;
  }

  ctx.clearDebounceTimer();

  const cmd = commands.find((c) => c.key === action);
  if (cmd) {
    ctx.setSyncing(true);
    Promise.resolve(cmd.action(ctx)).finally(() => {
      ctx.setSyncing(false);
      onDone();
    });
  }
}

function setupKeypress(onAction: (action: KeyAction) => void): () => void {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode?.(true);
  process.stdin.resume?.();

  const map: Record<string, KeyAction> = {
    r: 'redeploy',
    i: 'reinstall',
    c: 'reboot',
    a: 'studio',
    q: 'quit',
  };

  const handler = (_ch: string, key: { name: string; ctrl: boolean }) => {
    if (key.ctrl && key.name === 'c') {
      process.emit('SIGINT');
      return;
    }
    const action = map[key.name?.toLowerCase()] ?? null;
    if (action) onAction(action);
  };

  process.stdin.on('keypress', handler);

  return () => {
    process.stdin.removeListener('keypress', handler);
    process.stdin.setRawMode?.(false);
    process.stdin.pause?.();
  };
}

import type { FSWatcher } from 'fs';
import type { Emulator } from '../utils/emulator.utils';
import type { Command, CommandContext } from '../commands';
import { setupKeypress } from '../input';
import type { KeyAction } from '../types';

export interface LoopContext {
  emulators: Emulator[];
  port: string;
  isSyncing: () => boolean;
  setSyncing: (v: boolean) => void;
  clearDebounceTimer: () => void;
}

export function createLoopContext(emulators: Emulator[], port: string): LoopContext {
  let syncing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    emulators,
    port,
    isSyncing: () => syncing,
    setSyncing: (v: boolean) => {
      syncing = v;
    },
    clearDebounceTimer: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

export async function runLoop(
  ctx: LoopContext,
  watchers: FSWatcher[],
  commands: Command[],
  onDone: () => void,
): Promise<void> {
  const abort = new AbortController();

  const cleanup = setupKeypress((action: KeyAction) => {
    onKeyAction(action, ctx, abort, commands, onDone);
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
  ctx: LoopContext,
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

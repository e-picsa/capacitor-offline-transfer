import type { DevContext, KeyAction } from '../types';
import { CommandContext } from '../commands';
import { deployToAll } from '../commands/deploy';
import { COMMANDS } from '../commands';
import { setupKeypress } from '../input';
import { watchNativeSources } from '../watcher';
import { debounce } from '../utils/debounce';

export async function startDevLoop(ctx: DevContext): Promise<void> {
  let syncing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const setSyncing = (v: boolean) => {
    syncing = v;
  };
  const isSyncing = () => syncing;
  const clearDebounceTimer = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
  };

  const sharedCtx: CommandContext = {
    emulators: ctx.emulators,
    port: ctx.serverPort,
    isSyncing,
    setSyncing,
    clearDebounceTimer,
  };

  const handler = (label: string) => {
    onNativeChange(label, sharedCtx);
  };
  const debouncedOnNativeChange = debounce(handler as (...args: unknown[]) => void, 500) as (label: string) => void;

  const watchers = watchNativeSources((label) => {
    debouncedOnNativeChange(label);
  });

  const abort = new AbortController();

  const cleanup = setupKeypress((action: KeyAction) => {
    onKeyAction(action, sharedCtx, abort);
  });

  abort.signal.addEventListener('abort', () => {
    cleanup();
    watchers.forEach((w) => w.close());
  });

  process.once('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    abort.abort();
  });
  process.once('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    abort.abort();
  });

  await deployToAll(ctx.emulators, ctx.serverPort);

  await new Promise<void>((resolve) => {
    abort.signal.addEventListener(
      'abort',
      () => {
        resolve();
      },
      { once: true },
    );
  });
}

async function onNativeChange(label: string, ctx: CommandContext): Promise<void> {
  ctx.clearDebounceTimer();
  if (ctx.isSyncing()) return;
  ctx.setSyncing(true);
  console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
  const { fullRedeploy } = await import('../commands/deploy');
  await fullRedeploy(ctx.emulators, ctx.port);
  ctx.setSyncing(false);
  console.log(`\n👀 Watching native changes...`);
}

type KnownKeyAction = Exclude<KeyAction, null>;

function onKeyAction(action: KeyAction, ctx: CommandContext, abort: AbortController): void {
  if (!action) return;

  if (action === 'quit') {
    console.log('\n👋 Shutting down...');
    abort.abort();
    return;
  }

  ctx.clearDebounceTimer();

  const keyMap: Record<KnownKeyAction, string> = {
    redeploy: 'r',
    reinstall: 'i',
    reboot: 'c',
    studio: 'a',
    quit: 'q',
  };

  const key = keyMap[action];
  const cmd = COMMANDS.find((c) => c.key === key);
  if (cmd) cmd.action(ctx);
}

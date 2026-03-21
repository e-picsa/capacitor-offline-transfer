import type { DevContext, CommandContext, KeyAction } from '../types';
import { deployToAll } from '../commands/deploy';
import { COMMANDS } from '../commands';
import { setupKeypress } from '../input';
import { watchNativeSources } from '../watcher';

export async function startDevLoop(ctx: DevContext): Promise<void> {
  const watchers = watchNativeSources((label) => {
    onNativeChange(label, ctx);
  });

  const abort = new AbortController();

  const cleanup = setupKeypress((action: KeyAction) => {
    onKeyAction(action, ctx, abort);
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

async function onNativeChange(label: string, ctx: DevContext): Promise<void> {
  console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
  const { fullRedeploy } = await import('../commands/deploy');
  await fullRedeploy(ctx.emulators, ctx.serverPort);
  console.log(`\n👀 Watching native changes...`);
}

type KnownKeyAction = Exclude<KeyAction, null>;

function onKeyAction(action: KeyAction, ctx: DevContext, abort: AbortController): void {
  if (!action) return;

  if (action === 'quit') {
    console.log('\n👋 Shutting down...');
    abort.abort();
    return;
  }

  const commandContext: CommandContext = {
    emulators: ctx.emulators,
    port: ctx.serverPort,
    isSyncing: () => false,
    setSyncing: () => {},
    clearDebounceTimer: () => {},
  };

  const keyMap: Record<KnownKeyAction, string> = {
    redeploy: 'r',
    reinstall: 'i',
    reboot: 'c',
    studio: 'a',
    quit: 'q',
  };

  const key = keyMap[action];
  const cmd = COMMANDS.find((c) => c.key === key);
  if (cmd) cmd.action(commandContext);
}

import type { DevContext, CommandContext, KeyAction } from '../types';
import { deployToAll } from '../commands/deploy';
import { COMMANDS } from '../commands';
import { setupKeypress } from '../input';
import { watchNativeSources } from '../watcher';

export async function startDevLoop(ctx: DevContext): Promise<void> {
  const watchers = watchNativeSources((label) => {
    onNativeChange(label, ctx);
  });

  const cleanup = setupKeypress((action: KeyAction) => {
    onKeyAction(action, ctx);
  });

  await deployToAll(ctx.emulators, ctx.serverPort);

  await new Promise<void>((resolve) => {
    const abort = new AbortController();
    abort.signal.addEventListener('abort', () => {
      cleanup();
      watchers.forEach((w) => w.close());
      resolve();
    });
    process.once('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      abort.abort();
    });
    process.once('SIGTERM', () => {
      console.log('\n👋 Shutting down...');
      abort.abort();
    });
  });
}

async function onNativeChange(label: string, ctx: DevContext): Promise<void> {
  console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
  const { fullRedeploy } = await import('../commands/deploy');
  await fullRedeploy(ctx.emulators, ctx.serverPort);
  console.log(`\n👀 Watching native changes...`);
}

type KnownKeyAction = Exclude<KeyAction, null>;

function onKeyAction(action: KeyAction, ctx: DevContext): void {
  if (!action) return;

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
  };

  const key = keyMap[action];
  const cmd = COMMANDS.find((c) => c.key === key);
  if (cmd) cmd.action(commandContext);
}

import type { FSWatcher } from 'fs';
import type { DevContext } from '../types';
import { getCommands } from '../commands';
import { syncAndroidNative, syncPluginTS, deployToEmulators } from '../commands/deploy';
import { watchPluginAndroid, watchPluginTS } from '../watcher';
import { debounce } from '../utils/debounce';
import { createLoopContext, runLoop } from './dev-loop.shared';

export async function startDevLoop(ctx: DevContext): Promise<void> {
  const loopCtx = createLoopContext(ctx.emulators, ctx.serverPort);
  const commands = getCommands('android');

  const onAndroidNative = debounce(async () => {
    if (loopCtx.isSyncing()) return;
    loopCtx.setSyncing(true);
    console.log('\n📦 Android native changed, rebuilding...');
    const ok = await syncAndroidNative();
    if (ok) await deployToEmulators(ctx.emulators);
    loopCtx.setSyncing(false);
    console.log(`\n👀 Watching Android + plugin changes...`);
  }, 500);

  const onPluginTS = debounce(async () => {
    if (loopCtx.isSyncing()) return;
    loopCtx.setSyncing(true);
    console.log('\n📦 Plugin TS changed, rebuilding...');
    const ok = await syncPluginTS();
    if (ok) await deployToEmulators(ctx.emulators);
    loopCtx.setSyncing(false);
    console.log(`\n👀 Watching Android + plugin changes...`);
  }, 500);

  const watchers: FSWatcher[] = [watchPluginAndroid(onAndroidNative), watchPluginTS(onPluginTS)];

  await runLoop(loopCtx, watchers, commands, () => {
    console.log(`\n👀 Watching Android + plugin changes...`);
  });
}

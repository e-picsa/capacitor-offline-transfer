import type { FSWatcher } from 'fs';
import type { DevContext } from '../types';
import { getCommands } from '../commands';
import { syncIOSNative, syncPluginTS } from '../commands/deploy';
import { watchPluginIOS, watchPluginTS } from '../watcher';
import { debounce } from '../utils/debounce';
import { createLoopContext, runLoop } from './dev-loop.shared';

export async function startDevLoop(ctx: DevContext): Promise<void> {
  const loopCtx = createLoopContext(ctx.emulators, ctx.serverPort);
  const commands = getCommands('ios');

  const onIOSNative = debounce(async () => {
    if (loopCtx.isSyncing()) return;
    loopCtx.setSyncing(true);
    console.log('\n📦 iOS native changed, syncing...');
    await syncIOSNative();
    loopCtx.setSyncing(false);
    console.log(`\n👀 Watching iOS + plugin changes...`);
  }, 500);

  const onPluginTS = debounce(async () => {
    if (loopCtx.isSyncing()) return;
    loopCtx.setSyncing(true);
    console.log('\n📦 Plugin TS changed, syncing...');
    await syncPluginTS();
    loopCtx.setSyncing(false);
    console.log(`\n👀 Watching iOS + plugin changes...`);
  }, 500);

  const watchers: FSWatcher[] = [watchPluginIOS(onIOSNative), watchPluginTS(onPluginTS)];

  await runLoop(loopCtx, watchers, commands, () => {
    console.log(`\n👀 Watching iOS + plugin changes...`);
  });
}

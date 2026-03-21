import { watch } from 'fs';
import { resolve } from 'path';
import { PATHS } from '../paths';
import { CommandContext } from '../commands/commands.types';
import { debounce } from '../utils/debounce';
import { syncIOSNative } from '../utils/ios.utils';

export default (ctx: CommandContext) => {
  const onChange = debounce(async () => {
    if (ctx.isSyncing()) return;
    ctx.setSyncing(true);
    console.log('\n📦 iOS native changed, syncing...');
    await syncIOSNative();
    ctx.setSyncing(false);
    console.log(`\n👀 Watching iOS + plugin changes...`);
  }, 500);

  const iosSrcWatch = watch(resolve(PATHS.ROOT, 'ios', 'Sources'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.(swift|m|h)$/.test(filename)) return;
    onChange();
  });

  const tsSrcWatch = watch(resolve(PATHS.ROOT, 'src'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.ts$/.test(filename)) return;
    onChange();
  });

  return [iosSrcWatch, tsSrcWatch];
};

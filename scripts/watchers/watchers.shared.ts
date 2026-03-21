import { watch } from 'fs';
import { resolve } from 'path';
import { PATHS } from '../paths';
import { debounce } from '../utils/debounce';
import { CommandContext } from '../commands/commands.types';
import { syncAndroidNative } from '../utils/android.utils';
import { deployToEmulators } from '../deploy';

export default (ctx: CommandContext) => {
  const onChange = debounce(async () => {
    if (ctx.isSyncing()) return;
    ctx.setSyncing(true);
    console.log('\n📦 Android native changed, rebuilding...');
    const ok = await syncAndroidNative();
    if (ok) await deployToEmulators(ctx.emulators);
    ctx.setSyncing(false);
    console.log(`\n👀 Watching Android + plugin changes...`);
  }, 500);

  return watch(resolve(PATHS.ROOT, 'src'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.ts$/.test(filename)) return;
    onChange();
  });
};

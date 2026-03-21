import { resolve } from 'path';
import { fullRedeployAndroid, openAndroidStudio, syncAndroidNative } from '../utils/android.utils';
import { coldRebootEmulators, deployToEmulators, reinstallAll } from '../utils/emulator.utils';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types';
import { PATHS } from '../paths';

const syncAndDeployAndroid = async (ctx: WatchContext) => {
  console.log('\n📦 Android native changed, rebuilding...');
  const ok = await syncAndroidNative();
  if (ok) await deployToEmulators(ctx.emulators);
};

const filePaths = [
  {
    path: resolve(PATHS.ROOT, 'android', 'src'),
    pattern: /\.(kt|java)$/,
    label: 'Android sources',
    action: syncAndDeployAndroid,
  },
  {
    path: resolve(PATHS.ROOT, 'src'),
    pattern: /\.ts$/,
    label: 'TypeScript sources',
    action: syncAndDeployAndroid,
  },
] satisfies FileWatcherDef[];

const keyCommands = [
  {
    key: 'r',
    label: 'Press R:',
    description: 'Force rebuild & redeploy',
    exclusive: true,
    action: (ctx) => fullRedeployAndroid(ctx.emulators),
  },
  {
    key: 'i',
    label: 'Press I:',
    description: 'Reinstall app (no rebuild)',
    exclusive: true,
    action: (ctx) => reinstallAll(ctx.emulators),
  },
  {
    key: 'c',
    label: 'Press C:',
    description: 'Cold-reboot all emulators',
    exclusive: true,
    action: (ctx) => coldRebootEmulators(ctx.emulators),
  },
  {
    key: 'a',
    label: 'Press A:',
    description: 'Open Android Studio',
    action: () => openAndroidStudio(),
  },
] satisfies KeyWatcherDef[];

export default { filePaths, keyCommands };

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
    description: 'Force rebuild & redeploy',
    exclusive: true,
    action: (ctx) => fullRedeployAndroid(ctx.emulators),
  },
  {
    key: 'i',
    description: 'Reinstall app (no rebuild)',
    exclusive: true,
    action: (ctx) => reinstallAll(ctx.emulators),
  },
  {
    key: 'c',
    description: 'Cold-reboot all emulators',
    exclusive: true,
    action: (ctx) => coldRebootEmulators(ctx.emulators),
  },
  {
    key: 'a',
    description: 'Open Android Studio',
    action: () => openAndroidStudio(),
  },
  {
    key: 'q',
    description: 'Quit',
    action: () => {
      process.emit('SIGINT');
    },
  },
] satisfies KeyWatcherDef[];

export default { filePaths, keyCommands };

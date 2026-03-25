import { resolve } from 'path';
import { fullRedeployAndroid, openAndroidStudio, syncAndroidNative, reinstallAndroid } from '../utils/android.utils';
import { coldRebootEmulators } from '../utils/emulator.utils';
import { promptWirelessPairing } from '../utils/device.utils';
import { deploy } from '../utils/deploy.utils';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types';
import { PATHS } from '../paths';

const syncAndDeployAndroid = async (ctx: WatchContext) => {
  console.log('\n📦 Android native changed, rebuilding...');
  const ok = await syncAndroidNative();
  if (ok) await deploy(ctx.devices, ctx.serverPort);
};

const pairNewDevice = async (ctx: WatchContext) => {
  console.log('\n📡 Pairing new wireless device...');
  const newDevice = await promptWirelessPairing();
  if (newDevice) {
    ctx.devices.push(newDevice);
    console.log(`\n✅ Added new device: ${newDevice.id}`);
    await deploy(ctx.devices, ctx.serverPort);
  }
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
    action: (ctx) => fullRedeployAndroid(ctx.devices, ctx.serverPort),
  },
  {
    key: 'i',
    description: 'Reinstall app (no rebuild)',
    exclusive: true,
    action: (ctx) => reinstallAndroid(ctx.devices, ctx.serverPort),
  },
  {
    key: 'c',
    description: 'Cold-reboot emulators',
    exclusive: true,
    action: (ctx) => coldRebootEmulators(ctx.devices),
  },
  {
    key: 'p',
    description: 'Pair new wireless device',
    exclusive: true,
    action: pairNewDevice,
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

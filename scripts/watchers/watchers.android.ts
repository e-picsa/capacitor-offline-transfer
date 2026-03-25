import { resolve } from 'path';
import { openAndroidStudio, syncAndroidNative } from '../utils/android.utils';
import { DeviceOrchestrator, AppInfo } from '../utils/device';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types';
import { PATHS } from '../paths';
import { EXAMPLE_APP_ID } from '../consts';

const getAppInfo = (): AppInfo => ({
  appId: EXAMPLE_APP_ID,
  apkPath: 'example/android/app/build/outputs/apk/debug/app-debug.apk',
  activity: '.MainActivity',
});

const syncAndDeployAndroid = async (ctx: WatchContext) => {
  console.log('\n📦 Android native changed, rebuilding...');
  const ok = await syncAndroidNative();
  if (ok) {
    const orchestrator = new DeviceOrchestrator();
    await orchestrator.deploy(ctx.devices as any, getAppInfo());
  }
};

const pairNewDevice = async (ctx: WatchContext) => {
  console.log('\n📡 Pairing new wireless device...');
  const orchestrator = new DeviceOrchestrator();
  const newDevice = await orchestrator.androidDevice.pairWireless();
  if (newDevice) {
    (ctx.devices as any).push(newDevice);
    console.log(`\n✅ Added new device: ${newDevice.id}`);
    await orchestrator.deploy([newDevice], getAppInfo());
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
    action: async (ctx) => {
      const ok = await syncAndroidNative();
      if (ok) {
        const orchestrator = new DeviceOrchestrator();
        await orchestrator.deploy(ctx.devices as any, getAppInfo());
      }
    },
  },
  {
    key: 'i',
    description: 'Reinstall app (no rebuild)',
    exclusive: true,
    action: async (ctx) => {
      const orchestrator = new DeviceOrchestrator();
      await orchestrator.reinstall(ctx.devices as any, getAppInfo());
    },
  },
  {
    key: 'c',
    description: 'Cold-reboot emulators',
    exclusive: true,
    action: async (ctx) => {
      const orchestrator = new DeviceOrchestrator();
      for (const device of ctx.devices as any) {
        if (device.type === 'emulator') {
          await orchestrator.coldReboot(device);
        }
      }
    },
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

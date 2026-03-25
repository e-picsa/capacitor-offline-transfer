import { resolve } from 'path';
import { openXcode, syncIOSNative } from '../utils/ios.utils';
import { DeviceOrchestrator, AppInfo } from '../utils/device';
import { FileWatcherDef, KeyWatcherDef, WatchContext } from './watchers.types';
import { PATHS } from '../paths';
import { EXAMPLE_APP_ID } from '../consts';

const getAppInfo = (): AppInfo => ({
  appId: EXAMPLE_APP_ID,
  ipaPath: PATHS.EXAMPLE_APP_IPA,
});

const syncAndDeployIOS = async (ctx: WatchContext) => {
  console.log('\n📦 iOS native changed, syncing...');
  const ok = await syncIOSNative();
  if (ok) {
    const orchestrator = new DeviceOrchestrator();
    await orchestrator.deploy(ctx.devices, getAppInfo());
  }
};

const filePaths = [
  {
    path: resolve(PATHS.ROOT, 'ios', 'Sources'),
    pattern: /\.(swift|m|h)$/,
    label: 'iOS sources',
    action: syncAndDeployIOS,
  },
  {
    path: resolve(PATHS.ROOT, 'src'),
    pattern: /\.ts$/,
    label: 'TypeScript sources',
    action: syncAndDeployIOS,
  },
] satisfies FileWatcherDef[];

const keyCommands = [
  {
    key: 'r',
    description: 'Force rebuild & redeploy',
    exclusive: true,
    action: async (ctx) => {
      const ok = await syncIOSNative();
      if (ok) {
        const orchestrator = new DeviceOrchestrator();
        await orchestrator.deploy(ctx.devices, getAppInfo());
      }
    },
  },
  {
    key: 'x',
    description: 'Open Xcode',
    action: () => openXcode(),
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

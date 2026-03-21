import { resolve } from 'path';
import { fullRedeployIOS, openXcode, syncIOSNative } from '../utils/ios.utils';
import { FileWatcherDef, KeyWatcherDef } from './watchers.types';
import { PATHS } from '../paths';

const syncIOS = async () => {
  console.log('\n📦 iOS native changed, syncing...');
  await syncIOSNative();
};

const filePaths = [
  {
    path: resolve(PATHS.ROOT, 'ios', 'Sources'),
    pattern: /\.(swift|m|h)$/,
    label: 'iOS sources',
    action: syncIOS,
  },
  {
    path: resolve(PATHS.ROOT, 'src'),
    pattern: /\.ts$/,
    label: 'TypeScript sources',
    action: syncIOS,
  },
] satisfies FileWatcherDef[];

const keyCommands = [
  {
    key: 'r',
    label: 'Press R:',
    description: 'Force rebuild & redeploy',
    exclusive: true,
    action: (ctx) => fullRedeployIOS(ctx.serverPort),
  },
  {
    key: 'x',
    label: 'Press X:',
    description: 'Open Xcode',
    action: () => openXcode(),
  },
] satisfies KeyWatcherDef[];

export default { filePaths, keyCommands };

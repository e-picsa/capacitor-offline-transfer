import { BootstrapContext } from './bootstrap.types';
import { syncIOSNative } from '../utils/ios.utils';
import { DeviceOrchestrator, AppInfo } from '../utils/device';
import { EXAMPLE_APP_ID } from '../consts';
import { PATHS } from '../paths';

export default async (ctx: BootstrapContext): Promise<BootstrapContext> => {
  const orchestrator = new DeviceOrchestrator();

  console.log('\n🔍 Detecting iOS simulators...');
  const devices = await orchestrator.detectAll('ios');

  const selectedDevices = await orchestrator.promptSelection(devices);

  if (selectedDevices.length === 0) {
    console.error('\n❌ No iOS simulators selected. Exiting.');
    process.exit(1);
  }

  console.log('\n🔗 Live-reload uses localhost (iOS simulator)');

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncIOSNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  const appInfo: AppInfo = {
    appId: EXAMPLE_APP_ID,
    ipaPath: PATHS.EXAMPLE_APP_IPA,
  };

  console.log('\n📦 Deploying to simulators...');
  await orchestrator.deploy(selectedDevices, appInfo);

  ctx.devices = selectedDevices;
  return ctx;
};

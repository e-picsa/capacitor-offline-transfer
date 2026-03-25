import { BootstrapContext } from './bootstrap.types';
import { syncIOSNative } from '../utils/ios.utils';
import { DeviceOrchestrator, AppInfo } from '../utils/device';

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
    appId: 'com.picsa.capacitorofflinetransfer',
    ipaPath: 'example/ios/App/build/Debug-iphonesimulator/App.ipa',
  };

  console.log('\n📦 Deploying to simulators...');
  await orchestrator.deploy(selectedDevices, appInfo);

  ctx.devices = selectedDevices as any;
  return ctx;
};

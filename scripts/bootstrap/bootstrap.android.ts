import { adbSetupLiveReload } from '../utils/adb.utils';
import { BootstrapContext } from './bootstrap.types';
import { ensureEmulatorsRunning, getRunningEmulators } from '../utils/emulator.utils';
import { getPhysicalDevices, promptDeviceSelection } from '../utils/device.utils';
import { syncAndroidNative } from '../utils/android.utils';
import { getEnv } from '../utils/env.utils';
import { deploy } from '../utils/deploy.utils';
import { DeviceTarget, isWirelessDevice } from '../utils/device.types';

export default async (ctx: BootstrapContext) => {
  const env = getEnv();

  console.log('\n🔍 Detecting devices...');
  const runningEmulators = await getRunningEmulators();
  const connectedDevices = await getPhysicalDevices();

  let selectedDevices: DeviceTarget[] = [];

  if (runningEmulators.length === 0 && connectedDevices.length === 0) {
    console.log('  No emulators or physical devices detected.');
    const emulators = await ensureEmulatorsRunning(env.EMULATOR_AVDS);
    const devices = await getPhysicalDevices();
    selectedDevices = await promptDeviceSelection(emulators, devices);
  } else {
    selectedDevices = await promptDeviceSelection(runningEmulators, connectedDevices);
  }

  if (selectedDevices.length === 0) {
    console.error('\n❌ No devices selected. Exiting.');
    process.exit(1);
  }

  console.log('\n🔗 Setting up live-reload...');
  for (const device of selectedDevices) {
    if (device.kind === 'emulator') {
      await adbSetupLiveReload(device.id, ctx.serverPort);
    } else if (device.kind === 'physical' && !isWirelessDevice(device)) {
      await adbSetupLiveReload(device.id, ctx.serverPort);
    } else if (device.kind === 'physical' && isWirelessDevice(device)) {
      console.log(`  ${device.id} (wireless) - live-reload via LAN IP`);
    }
  }
  console.log('✅ Live-reload configured');

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  console.log('\n📦 Deploying to devices...');
  await deploy(selectedDevices, ctx.serverPort);

  ctx.devices = selectedDevices;
  return ctx;
};

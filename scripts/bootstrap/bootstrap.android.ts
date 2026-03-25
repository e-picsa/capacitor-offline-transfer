import { BootstrapContext } from './bootstrap.types';
import { syncAndroidNative } from '../utils/android.utils';
import { getEnv } from '../utils/env.utils';
import { DeviceOrchestrator, DeviceInfo, AppInfo } from '../utils/device';

async function promptNewDeviceMenu(): Promise<'pair' | 'emulator' | 'skip'> {
  const { prompt } = await import('../utils/cli.utils');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📱 Pair New Device');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  [p] Pair new physical device (wireless debugging)');
  console.log('  [e] Create new emulator (open Android Studio)');
  console.log('  [Enter] Skip / Continue with existing devices');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const input = (await prompt('  > ')).trim().toLowerCase();
  if (input === 'p') return 'pair';
  if (input === 'e') return 'emulator';
  return 'skip';
}

async function handleCreateEmulator(orchestrator: DeviceOrchestrator): Promise<void> {
  await orchestrator.androidEmulator.createNew();
}

async function handlePairDevice(orchestrator: DeviceOrchestrator): Promise<DeviceInfo | null> {
  return await orchestrator.androidDevice.pairWireless();
}

export default async (ctx: BootstrapContext): Promise<BootstrapContext> => {
  const env = getEnv();
  const orchestrator = new DeviceOrchestrator();

  console.log('\n🔍 Detecting devices...');
  let devices = await orchestrator.detectAll('android');

  if (devices.length === 0) {
    console.log('  No devices detected.');
    const emulatorMgr = orchestrator.androidEmulator;
    const avds = await emulatorMgr.getAvailableAvds();
    if (avds.length > 0) {
      console.log('\n🖥️  Available AVDs:');
      avds.forEach((avd, i) => console.log(`  [${i + 1}] ${avd}`));
      console.log('\n⚡ Select AVDs to start (e.g. "1" or "1,2"):');
      const { prompt, parseMultiSelect } = await import('../utils/cli.utils');
      const input = (await prompt('  > ')).trim();
      const selection = parseMultiSelect(input);
      if (selection[0] === '*' || selection[0] === 'all') {
        for (const avd of avds) {
          await emulatorMgr.start(avd);
        }
      } else {
        const indices = selection.map((s) => parseInt(s, 10) - 1).filter((i) => i >= 0 && i < avds.length);
        for (const i of indices) {
          await emulatorMgr.start(avds[i]);
        }
      }
      devices = await orchestrator.detectAll('android');
    }
  }

  const newDeviceAction = await promptNewDeviceMenu();
  if (newDeviceAction === 'emulator') {
    await handleCreateEmulator(orchestrator);
    devices = await orchestrator.detectAll('android');
  } else if (newDeviceAction === 'pair') {
    const newDevice = await handlePairDevice(orchestrator);
    if (newDevice) {
      devices = await orchestrator.detectAll('android');
    }
  }

  const selectedDevices = await orchestrator.promptSelection(devices, {
    showPairOption: true,
    onPairDevice: async () => {
      return await orchestrator.androidDevice.pairWireless();
    },
  });

  if (selectedDevices.length === 0) {
    console.error('\n❌ No devices selected. Exiting.');
    process.exit(1);
  }

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  const appInfo: AppInfo = {
    appId: 'com.picsa.capacitorofflinetransfer',
    apkPath: 'example/android/app/build/outputs/apk/debug/app-debug.apk',
    activity: '.MainActivity',
  };

  console.log('\n📦 Deploying to devices...');
  await orchestrator.deploy(selectedDevices, appInfo);

  ctx.devices = selectedDevices as any;
  return ctx;
};

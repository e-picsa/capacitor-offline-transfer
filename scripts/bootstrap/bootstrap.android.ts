import { BootstrapContext } from './bootstrap.types';
import { syncAndroidNative } from '../utils/android.utils';
import { getEnv } from '../utils/env.utils';
import { DeviceOrchestrator, AppInfo, DeviceInfo } from '../utils/device';

interface NewDeviceAction {
  letter: string;
  label: string;
  action: () => Promise<DeviceInfo | null>;
}

function getNewDeviceActions(orchestrator: DeviceOrchestrator) {
  let redetectTriggered = false;

  const actions: NewDeviceAction[] = [
    {
      letter: 'd',
      label: 'Pair new physical device (wireless debugging)',
      action: async (): Promise<DeviceInfo | null> => {
        const result = await orchestrator.androidDevice.pairWireless();
        redetectTriggered = true;
        return result;
      },
    },
    {
      letter: 'e',
      label: 'Create new emulator (open Android Studio)',
      action: async (): Promise<DeviceInfo | null> => {
        await orchestrator.androidEmulator.createNew();
        redetectTriggered = true;
        return null;
      },
    },
  ];

  return {
    actions,
    wasRedetectTriggered: () => redetectTriggered,
    reset: () => {
      redetectTriggered = false;
    },
  };
}

async function promptEmulatorBootOrAction(
  orchestrator: DeviceOrchestrator,
  newDeviceActions: NewDeviceAction[],
): Promise<boolean> {
  const emulatorMgr = orchestrator.androidEmulator;
  const avds = await emulatorMgr.getAvailableAvds();

  if (avds.length === 0 && newDeviceActions.length === 0) return false;

  console.log('\n📱 Available devices:');

  if (avds.length > 0) {
    console.log('  ─── Existing Emulators ───');
    avds.forEach((avd, i) => console.log(`  [${i + 1}] ${avd}`));
  }

  if (newDeviceActions.length > 0) {
    console.log('\n', '  ─── New Device ───');
    for (const action of newDeviceActions) {
      console.log(`  [${action.letter}] ${action.label}`);
    }
  }

  console.log('\n⚡ Select emulators to start or action (e.g. "1,2" or "e"):');
  const { prompt, parseMultiSelect } = await import('../utils/cli.utils');
  const input = (await prompt('  > ')).trim();
  const selection = parseMultiSelect(input);

  let actionTriggered = false;
  const selectedAvds: string[] = [];

  for (const s of selection) {
    const action = newDeviceActions.find((a) => a.letter.toLowerCase() === s.toLowerCase());
    if (action) {
      await action.action();
      actionTriggered = true;
    } else {
      const idx = parseInt(s, 10) - 1;
      if (idx >= 0 && idx < avds.length) {
        selectedAvds.push(avds[idx]);
      }
    }
  }

  for (const avd of selectedAvds) {
    await emulatorMgr.start(avd);
  }

  return actionTriggered;
}

async function selectDevices(orchestrator: DeviceOrchestrator) {
  while (true) {
    const { actions, wasRedetectTriggered, reset } = getNewDeviceActions(orchestrator);
    reset();

    console.log('\n🔍 Detecting devices...');
    let devices = await orchestrator.detectAll('android');

    if (devices.length === 0) {
      console.log('  No devices detected.');
      const shouldRedetect = await promptEmulatorBootOrAction(orchestrator, actions);
      if (shouldRedetect || wasRedetectTriggered()) continue;
      devices = await orchestrator.detectAll('android');
    }

    const selectedDevices = await orchestrator.promptSelection(devices, {
      newDeviceActions: actions,
    });

    if (wasRedetectTriggered()) continue;

    return selectedDevices;
  }
}

export default async (ctx: BootstrapContext): Promise<BootstrapContext> => {
  const orchestrator = new DeviceOrchestrator();
  const selectedDevices = await selectDevices(orchestrator);

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

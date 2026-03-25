import { BootstrapContext } from './bootstrap.types';
import {
  getRunningIOSSimulators,
  promptIOSSimulatorSelection,
  syncIOSNative,
  ensureSimulatorBooted,
} from '../utils/ios.utils';

export default async (ctx: BootstrapContext) => {
  console.log('\n🔍 Detecting iOS simulators...');
  const simulators = await getRunningIOSSimulators();

  let selectedDevices = await promptIOSSimulatorSelection(simulators);

  if (selectedDevices.length === 0) {
    console.error('\n❌ No iOS simulators selected. Exiting.');
    process.exit(1);
  }

  for (const sim of selectedDevices) {
    await ensureSimulatorBooted(sim);
  }

  console.log('\n🔗 Live-reload uses localhost (iOS simulator)');

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncIOSNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  ctx.devices = selectedDevices;
  return ctx;
};

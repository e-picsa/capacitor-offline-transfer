import { adbReverse } from '../utils/adb.utils';
import { BootstrapContext } from './bootstrap.types';
import { ensureEmulatorsRunning } from '../utils/emulator.utils';
import { syncAndroidNative } from '../utils/android.utils';

export default async (ctx: BootstrapContext) => {
  const env = require('../utils/env.utils').getEnv();
  const emulators = await ensureEmulatorsRunning(env.EMULATOR_AVDS);

  if (emulators.length === 0) {
    console.error('\n❌ No emulators available. Exiting.');
    process.exit(1);
  }

  if (emulators.length > 0) {
    console.log('\n🔗 Setting up adb reverse...');
    for (const em of emulators) {
      await adbReverse(em.id, ctx.serverPort);
    }
    console.log('✅ All emulators connected');
  }

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  ctx.emulators = emulators;
  return ctx;
};

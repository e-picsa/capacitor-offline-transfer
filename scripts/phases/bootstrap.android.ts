import { bootstrapShared } from './bootstrap.shared';
import { ensureEmulatorsRunning } from '../commands/emulator';
import { adbReverse } from '../utils/adb.utils';
import { syncAndroidNative } from '../commands/deploy';
import type { DevContext } from '../types';

export async function bootstrap(): Promise<DevContext> {
  const { platform, serverIp, serverPort } = await bootstrapShared();

  if (platform === 'ios') {
    console.log('\n⚠️  iOS emulator/device support not yet implemented. Only web watching active.');
    return { platform, emulators: [], serverIp, serverPort };
  }

  const env = require('../utils/env.utils').getEnv();
  const emulators = await ensureEmulatorsRunning(env.EMULATOR_AVDS);

  if (emulators.length === 0) {
    console.error('\n❌ No emulators available. Exiting.');
    process.exit(1);
  }

  if (emulators.length > 0) {
    console.log('\n🔗 Setting up adb reverse...');
    for (const em of emulators) {
      await adbReverse(em.id, serverPort);
    }
    console.log('✅ All emulators connected');
  }

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  return { platform, emulators, serverIp, serverPort };
}

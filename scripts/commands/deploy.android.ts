import type { Emulator } from '../utils/emulator.utils';
import { syncAndroidNative, deployToEmulators } from './deploy';

export async function fullRedeployAndroid(emulators: Emulator[]): Promise<void> {
  console.log('\n📦 Rebuilding and redeploying (Android)...');
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('❌ Sync failed, skipping redeploy');
    return;
  }
  await deployToEmulators(emulators);
}

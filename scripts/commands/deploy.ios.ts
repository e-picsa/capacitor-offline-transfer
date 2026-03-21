import { syncIOSNative } from './deploy';

export async function fullRedeployIOS(_port: string): Promise<void> {
  console.log('\n📦 Syncing iOS native...');
  const ok = await syncIOSNative();
  if (!ok) {
    console.error('❌ iOS sync failed');
    return;
  }
  console.log('  ✅ iOS native synced (build from Xcode to apply changes)');
}

import { runInExample } from './app.utils';
import { runDetached } from './cli.utils';

export async function fullRedeployIOS(_port: string): Promise<void> {
  console.log('\n📦 Syncing iOS native...');
  const ok = await syncIOSNative();
  if (!ok) {
    console.error('❌ iOS sync failed');
    return;
  }
  console.log('  ✅ iOS native synced (build from Xcode to apply changes)');
}

export async function syncIOSNative(): Promise<boolean> {
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'ios'], 'cap sync ios');
  if (!syncOk) return false;
  console.log(`✅ iOS native synced`);
  return true;
}

export function openXcode(): void {
  console.log('\n📦 Opening Xcode...');
  runDetached('npx', ['cap', 'open', 'ios']);
}

import { runInExample } from './app.utils';
import { runDetached } from './cli.utils';

export async function syncIOSNative(): Promise<boolean> {
  // Ensure bun installs from child to update parent plugin file link

  // NOTE - cannot rely on bun workspace "@picsa/capacitor-offline-transfer": "*"
  // to sync due to global caching
  const installedOk = await runInExample(['bun', 'install'], 'Install module code');
  if (!installedOk) return false;
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'ios'], 'cap sync ios');
  if (!syncOk) return false;
  console.log(`✅ iOS native synced`);
  return true;
}

export function openXcode(): void {
  console.log('\n📦 Opening Xcode...');
  runDetached('npx', ['cap', 'open', 'ios']);
}

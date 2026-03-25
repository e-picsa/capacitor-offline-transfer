import { runDetached } from './cli.utils';

export async function syncIOSNative(): Promise<boolean> {
  const { runInExample } = await import('./app.utils');
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'ios'], 'cap sync ios');
  if (!syncOk) return false;
  console.log(`✅ iOS native synced`);
  return true;
}

export function openXcode(): void {
  console.log('\n📦 Opening Xcode...');
  runDetached('npx', ['cap', 'open', 'ios']);
}

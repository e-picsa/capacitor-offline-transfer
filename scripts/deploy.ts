import { Emulator } from './utils/emulator.utils';
import { adbInstall, adbLaunch } from './utils/adb.utils';
import { runInExample } from './utils/app.utils';
import { runGradleBuild } from './utils/android.utils';

export async function syncPluginTS(): Promise<boolean> {
  const webOk = await runInExample(['bun', 'run', 'build:web'], 'vite build');
  if (!webOk) return false;
  const syncOk = await runInExample(['bunx', 'cap', 'sync'], 'cap sync');
  if (!syncOk) return false;
  return await runGradleBuild();
}

async function deployTo(em: Emulator): Promise<void> {
  process.stdout.write(`  [${em.id}] install APK... `);
  const result = await adbInstall(em.id);
  if (!result.success) {
    console.log(`❌\n    ↳ ${result.error ?? 'Unknown error'}`);
    return;
  }
  console.log('✅');

  process.stdout.write(`  [${em.id}] launch app... `);
  const launchResult = await adbLaunch(em.id);
  if (!launchResult.success) {
    console.log(`❌\n    ↳ ${launchResult.error ?? 'Unknown error'}`);
    return;
  }
  console.log('✅');
}

export async function deployToEmulators(emulators: Emulator[]): Promise<void> {
  if (emulators.length === 0) {
    console.log('\n⚠️  No emulators.');
    return;
  }
  for (const em of emulators) {
    await deployTo(em);
  }
}

export async function reinstallAll(emulators: Emulator[]): Promise<void> {
  console.log('\n📦 Reinstalling app on emulators...');
  await deployToEmulators(emulators);
}

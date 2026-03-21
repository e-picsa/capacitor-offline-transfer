import { existsSync } from 'fs';
import { resolve } from 'path';

import { Emulator } from '../utils/emulator.utils';
import { adbInstall, adbLaunch } from '../utils/adb.utils';
import { PATHS } from '../paths';

async function runInExample(cmd: string[], label: string): Promise<boolean> {
  console.log(`\n⏳ ${label}...`);
  const proc = Bun.spawn(cmd, {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ ${label} failed with exit code ${code}`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

export async function syncAndroidNative(): Promise<boolean> {
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'android'], 'cap sync android');
  if (!syncOk) return false;
  return await runGradleBuild();
}

export async function syncPluginTS(): Promise<boolean> {
  const webOk = await runInExample(['bun', 'run', 'build:web'], 'vite build');
  if (!webOk) return false;
  const syncOk = await runInExample(['bunx', 'cap', 'sync'], 'cap sync');
  if (!syncOk) return false;
  return await runGradleBuild();
}

export async function syncIOSNative(): Promise<boolean> {
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'ios'], 'cap sync ios');
  if (!syncOk) return false;
  console.log(`✅ iOS native synced`);
  return true;
}

async function runGradleBuild(): Promise<boolean> {
  const androidDir = resolve(PATHS.EXAMPLE_APP, 'android');
  const gradlewBat = resolve(androidDir, 'gradlew.bat');
  const gradlewScript = existsSync(gradlewBat) ? gradlewBat : resolve(androidDir, 'gradlew');
  const proc = Bun.spawn([gradlewScript, 'assembleDebug'], {
    cwd: resolve(PATHS.EXAMPLE_APP, 'android'),
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ Gradle build failed with exit code ${code}`);
    return false;
  }
  console.log('✅ Android APK built');
  return true;
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

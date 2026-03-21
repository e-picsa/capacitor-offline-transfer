import { existsSync } from 'fs';
import { resolve } from 'path';

import { Emulator } from '../utils/emulator.utils';
import { adbInstall, adbLaunch } from '../utils/adb.utils';
import { PATHS } from '../paths';

export async function syncPluginAndNative(): Promise<boolean> {
  const ok = await runInExample(['bun', 'run', 'sync:plugin'], 'sync plugin');
  if (!ok) return false;
  const webOk = await runInExample(['bun', 'run', 'build:web'], 'build web');
  if (!webOk) return false;
  const syncOk = await runInExample(['bun', 'run', 'sync:native'], 'cap sync');
  if (!syncOk) return false;
  return await runGradleBuild();
}

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

async function deployToEmulators(emulators: Emulator[]): Promise<void> {
  if (emulators.length === 0) {
    console.log('\n⚠️  No emulators.');
    return;
  }
  for (const em of emulators) {
    await deployTo(em);
  }
}

export async function fullRedeploy(emulators: Emulator[]): Promise<void> {
  console.log('\n📦 Rebuilding and redeploying...');
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('❌ Sync failed, skipping redeploy');
    return;
  }
  await deployToEmulators(emulators);
}

export async function reinstallAll(emulators: Emulator[]): Promise<void> {
  console.log('\n📦 Reinstalling app on emulators...');
  await deployToEmulators(emulators);
}

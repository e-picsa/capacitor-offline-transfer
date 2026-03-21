import { resolve } from 'path';
import { existsSync } from 'fs';

import { deployToEmulators } from '../deploy';
import { PATHS } from '../paths';
import type { Emulator } from '../utils/emulator.utils';
import { runInExample } from './app.utils';
import { runDetached } from './cli.utils';

export async function fullRedeployAndroid(emulators: Emulator[]): Promise<void> {
  console.log('\n📦 Rebuilding and redeploying (Android)...');
  const ok = await syncAndroidNative();
  if (!ok) {
    console.error('❌ Sync failed, skipping redeploy');
    return;
  }
  await deployToEmulators(emulators);
}

export async function openAndroidStudio(): Promise<void> {
  console.log('\n📦 Opening Android Studio...');
  runDetached('npx', ['cap', 'open', 'android']);
}

export async function syncAndroidNative(): Promise<boolean> {
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'android'], 'cap sync android');
  if (!syncOk) return false;
  return await runGradleBuild();
}

export async function runGradleBuild(): Promise<boolean> {
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

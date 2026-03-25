import { resolve } from 'path';
import { existsSync } from 'fs';

import { PATHS } from '../paths';
import { runInExample } from './app.utils';

export async function openAndroidStudio(): Promise<void> {
  console.log('\n📦 Opening Android Studio...');
  await runInExample(['bunx', 'cap', 'open', 'android'], 'cap open android');
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

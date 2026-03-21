import { Emulator } from '../utils/emulator.utils';
import { adbInstall, adbLaunch, adbReverse } from '../utils/adb.utils';
import { PATHS } from '../paths';

export async function syncPluginAndNative(): Promise<boolean> {
  const ok = await runInExample(['bun', 'run', 'sync:plugin'], 'sync plugin');
  if (!ok) return false;
  return await runInExample(['bun', 'run', 'sync:native'], 'cap sync');
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

async function deployTo(em: Emulator, port: string): Promise<void> {
  process.stdout.write(`  [${em.id}] adb reverse... `);
  await adbReverse(em.id, port);
  console.log('✅');

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

export async function deployToAll(emulators: Emulator[], port: string): Promise<void> {
  if (emulators.length === 0) {
    console.log('\n⚠️  No emulators to deploy to.');
    return;
  }

  console.log('\n📦 Deploying to emulators...');
  for (const em of emulators) {
    await deployTo(em, port);
  }
}

export async function fullRedeploy(emulators: Emulator[], port: string): Promise<void> {
  console.log('\n📦 Rebuilding and redeploying...');
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('❌ Sync failed, skipping redeploy');
    return;
  }
  await deployToAll(emulators, port);
}

export async function reinstallAll(emulators: Emulator[], port: string): Promise<void> {
  if (emulators.length === 0) {
    console.log('\n⚠️  No emulators to reinstall on.');
    return;
  }

  console.log('\n📦 Reinstalling app on emulators...');
  for (const em of emulators) {
    await deployTo(em, port);
  }
}

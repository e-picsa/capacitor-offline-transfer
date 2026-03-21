import { resolve } from 'path';
import { existsSync } from 'fs';
import { getEnv, saveEnv } from '../utils/env.utils';
import { detectLocalIP, selectPlatform, execCmd } from '../utils/cli.utils';
import { ensureEmulatorsRunning } from '../commands/emulator';
import { syncPluginAndNative } from '../commands/deploy';
import { ensurePortFree, startViteServer } from '../commands/server';
import { adbReverse } from '../utils/adb.utils';
import { PATHS } from '../paths';
import type { DevContext, Platform } from '../types';

const DEFAULT_PORT = '5173';

export async function bootstrap(): Promise<DevContext> {
  const env = getEnv();
  let serverIp = env.CAPACITOR_SERVER_IP || null;
  let serverPort = env.CAPACITOR_SERVER_PORT || DEFAULT_PORT;

  console.log('🔍 Detecting local IP address...');
  if (!serverIp) {
    const detected = detectLocalIP();
    if (detected) {
      serverIp = detected;
      env.CAPACITOR_SERVER_IP = serverIp;
    } else {
      serverIp = '127.0.0.1';
      env.CAPACITOR_SERVER_IP = serverIp;
      console.log(`  ⚠️  Could not detect LAN IP, falling back to ${serverIp}`);
    }
  }
  env.CAPACITOR_SERVER_PORT = serverPort;
  saveEnv(env);

  console.log('\n📱 Selecting platform...');
  const platform: Platform = await selectPlatform();

  if (platform === 'ios') {
    console.log('\n⚠️  iOS emulator/device support not yet implemented. Only web watching active.');
  }

  const platformDir = resolve(PATHS.EXAMPLE_APP, platform);
  if (!existsSync(platformDir)) {
    console.log(`\n📦 Adding ${platform} platform...`);
    const { code, stdout, stderr } = await execCmd('bunx', ['cap', 'add', platform], PATHS.EXAMPLE_APP);
    if (code !== 0) {
      console.error(`❌ Failed to add ${platform} platform.`);
      if (stdout) console.error(stdout);
      if (stderr) console.error(stderr);
      gracefulExit(1);
    }
    console.log(`✅ ${platform} platform added`);
  }

  const emulators = platform === 'ios' ? [] : await ensureEmulatorsRunning(env.EMULATOR_AVDS);

  if (emulators.length > 0) {
    console.log('\n🔗 Setting up adb reverse...');
    for (const em of emulators) {
      await adbReverse(em.id, serverPort);
    }
    console.log('✅ All emulators connected');
  }

  if (emulators.length === 0 && platform === 'android') {
    console.error('\n❌ No emulators available. Exiting.');
    gracefulExit(1);
  }

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    gracefulExit(1);
  }

  await ensurePortFree(serverPort);
  startViteServer();

  return {
    platform,
    emulators,
    serverIp,
    serverPort,
  };
}

function gracefulExit(code: number): never {
  process.exit(code);
}

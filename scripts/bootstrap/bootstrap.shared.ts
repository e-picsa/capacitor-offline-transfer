import { resolve } from 'path';
import { existsSync } from 'fs';
import { getEnv, saveEnv } from '../utils/env.utils';
import { detectLocalIP, selectPlatform, execCmd, ensurePortFree } from '../utils/cli.utils';
import { PATHS } from '../paths';
import type { DevContext, Platform } from '../types';

const DEFAULT_PORT = '5173';

export default async (): Promise<DevContext> => {
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

  let platform: Platform = process.argv[2]?.trim().toLowerCase() as Platform;

  if (!platform) {
    console.log('\n📱 Selecting platform...');
    platform = await selectPlatform();
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

  await ensurePortFree(serverPort);

  return { platform, serverIp, serverPort, emulators: [] };
};

function gracefulExit(code: number): never {
  process.exit(code);
}

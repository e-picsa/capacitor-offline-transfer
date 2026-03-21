import { resolve } from 'path';
import { existsSync } from 'fs';
import { getEnv, saveEnv } from '../utils/env.utils';
import { detectLocalIP, selectPlatform, execCmd } from '../utils/cli.utils';
import { ensurePortFree, startViteServer } from '../commands/server';
import { PATHS } from '../paths';
import type { Platform } from '../types';

const DEFAULT_PORT = '5173';

export async function bootstrapShared(): Promise<{
  platform: Platform;
  serverIp: string;
  serverPort: string;
}> {
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
  startViteServer();

  return { platform, serverIp, serverPort };
}

function gracefulExit(code: number): never {
  process.exit(code);
}

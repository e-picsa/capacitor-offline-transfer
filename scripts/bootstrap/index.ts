import { resolve } from 'path';

import { PATHS } from '../paths';
import { Platform } from '../types';
import { getEnv, saveEnv } from '../utils/env.utils';
import android from './bootstrap.android';
import ios from './bootstrap.ios';
import { BootstrapContext } from './bootstrap.types';
import { detectLocalIP, ensurePortFree, execCmd, selectPlatform } from '../utils/cli.utils';
import { existsSync } from 'fs';

const DEFAULT_PORT = '5173';

const PLATFORM_BOOTSTRAP: Record<Platform, (ctx: BootstrapContext) => Promise<BootstrapContext>> = {
  android,
  ios,
};

export async function handleBootstrap(): Promise<BootstrapContext> {
  const baseCtx = await handleCommonBootstrap();
  const bootstrapCtx = await PLATFORM_BOOTSTRAP[baseCtx.platform](baseCtx);
  return bootstrapCtx;
}

async function handleCommonBootstrap(): Promise<BootstrapContext> {
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

  if (!platform || !['android', 'ios'].includes(platform)) {
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
      process.exit(1);
    }
    console.log(`✅ ${platform} platform added`);
  }

  await ensurePortFree(serverPort);

  return { platform, serverIp, serverPort, emulators: [] };
}

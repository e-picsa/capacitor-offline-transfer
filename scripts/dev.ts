export {};

import { watch } from 'fs';
import { resolve } from 'path';
import { getEnv, saveEnv } from './utils/env.utils';
import { detectLocalIP, prompt } from './utils/cli.utils';
import { ensureEmulatorsRunning, coldRebootAll, openAndroidStudio } from './commands/emulator';
import { fullRedeploy, reinstallAll, syncPluginAndNative, deployToAll } from './commands/deploy';
import { startViteServer, ensurePortFree, viteProc } from './commands/server';
import { PATHS } from './paths';
import type { Emulator } from './utils/emulator.utils';

const DEFAULT_PORT = '5173';

async function selectPlatform(current?: string): Promise<'android' | 'ios'> {
  if (current === 'android' || current === 'ios') return current;
  const ans = (await prompt('Select platform (android/ios) [android]: ')).trim().toLowerCase();
  return ans === 'ios' ? 'ios' : 'android';
}

async function main(): Promise<void> {
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
  const platform = await selectPlatform(env.CAPACITOR_PLATFORM);
  env.CAPACITOR_PLATFORM = platform;
  saveEnv(env);

  console.log('\n🔍 Detecting emulators...');
  const emulators = await ensureEmulatorsRunning(env.EMULATOR_AVDS);

  if (emulators.length === 0) {
    console.error('\n❌ No emulators available. Exiting.');
    process.exit(1);
  }

  console.log(`\n🔨 Initial build and sync...`);
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  await ensurePortFree(serverPort);
  startViteServer();

  await deployToAll(emulators, serverPort);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     LIVE-RELOAD READY                        ║
╠══════════════════════════════════════════════════════════════╣
║  Web server:  http://localhost:${serverPort.padEnd(18)}║
║  Emulators:   ${emulators
    .map((e) => e.id)
    .join(', ')
    .padEnd(52)}║
║  Platform:    ${platform.padEnd(52)}║
╠══════════════════════════════════════════════════════════════╣
║  Web/JS changes:  Auto-loaded via Vite HMR                   ║
║  Native changes:  Auto-rebuilds plugin + redeploys all      ║
║  Press R:         Force rebuild & redeploy                   ║
║  Press I:         Reinstall app (no rebuild)                  ║
║  Press C:         Cold-reboot all emulators                   ║
║  Press A:         Open Android Studio                         ║
╚══════════════════════════════════════════════════════════════╝
`);

  await watchLoop(emulators, serverPort);
}

async function watchLoop(emulators: Emulator[], port: string): Promise<void> {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let syncing = false;

  function onChange(label: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (syncing) return;
      syncing = true;
      try {
        console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
        await fullRedeploy(emulators, port);
        console.log(`\n👀 Watching native changes...`);
      } finally {
        syncing = false;
      }
    }, 1000);
  }

  process.stdin.setRawMode?.(true);
  process.stdin.resume?.();
  process.stdin.on('keypress', (_ch: string, key: { name: string; ctrl: boolean }) => {
    if (key.ctrl && key.name === 'c') return;
    if (key.name?.toLowerCase() === 'r') {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (syncing) return;
      syncing = true;
      fullRedeploy(emulators, port).finally(() => {
        syncing = false;
        console.log(`\n👀 Watching native changes...`);
      });
    }
    if (key.name?.toLowerCase() === 'i') {
      if (syncing) return;
      syncing = true;
      reinstallAll(emulators, port).finally(() => {
        syncing = false;
        console.log(`\n👀 Watching native changes...`);
      });
    }
    if (key.name?.toLowerCase() === 'c') {
      if (syncing) return;
      syncing = true;
      coldRebootAll(emulators).finally(() => {
        syncing = false;
        console.log(`\n👀 Watching native changes...`);
      });
    }
    if (key.name?.toLowerCase() === 'a') {
      openAndroidStudio();
    }
  });

  watch(resolve(PATHS.ROOT, 'android', 'src'), { recursive: true }, (_evt, filename) => {
    console.log(`\n📦 Plugin Android changed: ${filename}`);
    onChange('Android');
  });

  watch(resolve(PATHS.ROOT, 'ios', 'Sources'), { recursive: true }, (_evt, filename) => {
    console.log(`\n📦 Plugin iOS changed: ${filename}`);
    onChange('iOS');
  });

  await new Promise<void>((resolve) =>
    process.on('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      process.stdin.setRawMode?.(false);
      process.stdin.pause?.();
      if (viteProc) viteProc.kill();
      resolve();
    }),
  );
  process.exit(0);
}

console.log('\n👀 Watching for native changes...\n');
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};

import { watch, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { networkInterfaces } from 'os';
import { getEnv, saveEnv } from './env.utils';
import { PATHS } from './paths';

const DEFAULT_PORT = '5173';

function detectLocalIP(): string | null {
  const interfaces = networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  Found IP ${addr.address} on interface '${name}'`);
        return addr.address;
      }
    }
  }
  return null;
}

async function selectPlatform(current?: string): Promise<'android' | 'ios'> {
  if (current === 'android' || current === 'ios') {
    return current;
  }
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question('Select platform (android/ios) [android]: ', (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      if (normalized === 'ios') {
        resolve('ios');
      } else {
        resolve('android');
      }
    });
  });
}

let viteProc: ReturnType<typeof Bun.spawn> | null = null;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let serverPort = DEFAULT_PORT;
let serverIp: string | null = null;

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

async function syncPluginAndNative(): Promise<boolean> {
  const ok = await runInExample(['bun', 'run', 'sync:plugin'], 'sync plugin');
  if (!ok) return false;
  return await runInExample(['bun', 'run', 'sync:native'], 'cap sync');
}

function updateCapacitorConfig(ip: string, port: string): void {
  const configPath = resolve(PATHS.EXAMPLE_APP, 'capacitor.config.ts');
  if (existsSync(configPath)) {
    let content = readFileSync(configPath, 'utf-8');
    const urlMatch = content.match(/url:\s*`http:\/\/[^`]+`/);
    if (urlMatch) {
      content = content.replace(urlMatch[0], `url: \`http://${ip}:${port}\``);
    } else {
      const insertPoint = content.lastIndexOf('server:');
      if (insertPoint !== -1) {
        const endBrace = content.indexOf('}', insertPoint);
        if (endBrace !== -1) {
          content = content.slice(0, endBrace) + `\n    url: \`http://${ip}:${port}\`,` + content.slice(endBrace);
        }
      }
    }
    writeFileSync(configPath, content, 'utf-8');
  }
}

function startViteServer(): void {
  if (viteProc) {
    viteProc.kill();
    viteProc = null;
  }

  console.log(`\n🚀 Starting Vite dev server on http://${serverIp}:${serverPort}`);
  viteProc = Bun.spawn(['bun', 'run', 'start'], {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
    env: {
      ...process.env,
      CAPACITOR_SERVER_IP: serverIp!,
      CAPACITOR_SERVER_PORT: serverPort,
    },
  });
}

function debouncedSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (syncing) return;
    syncing = true;
    try {
      console.log(`\n📦 Native changes detected, rebuilding...`);
      await syncPluginAndNative();
      console.log(`\n✅ Native rebuilt. Re-run the app on emulator to load changes.`);
      console.log(`   (Web changes are auto-loaded via live-reload)`);
    } finally {
      syncing = false;
    }
  }, 500);
}

async function main(): Promise<void> {
  const env = getEnv();
  serverIp = env.CAPACITOR_SERVER_IP || null;
  serverPort = env.CAPACITOR_SERVER_PORT || DEFAULT_PORT;

  console.log('🔍 Detecting local IP address...');
  if (!serverIp) {
    const detected = detectLocalIP();
    if (detected) {
      serverIp = detected;
      env.CAPACITOR_SERVER_IP = serverIp;
      console.log(`  Using detected IP: ${serverIp}`);
    } else {
      serverIp = '127.0.0.1';
      env.CAPACITOR_SERVER_IP = serverIp;
      console.log(`  ⚠️  Could not detect LAN IP, falling back to ${serverIp}`);
      console.log(`  Note: Live-reload may not work on physical devices without a valid LAN IP.`);
    }
  } else {
    console.log(`  Using saved IP from .env: ${serverIp}`);
  }
  env.CAPACITOR_SERVER_PORT = serverPort;
  saveEnv(env);

  console.log('\n📱 Selecting platform...');
  const platform = await selectPlatform(env.CAPACITOR_PLATFORM);
  env.CAPACITOR_PLATFORM = platform;
  saveEnv(env);
  console.log(`  Selected: ${platform}`);

  console.log('\n🔨 Initial build and sync...');
  updateCapacitorConfig(serverIp, serverPort);
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  startViteServer();

  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 2000);
  });

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     LIVE-RELOAD READY                        ║
╠══════════════════════════════════════════════════════════════╣
║  Web server:  http://${serverIp}:${serverPort.padEnd(23)}║
║  Platform:    ${platform.padEnd(52)}║
╠══════════════════════════════════════════════════════════════╣
║  Web/JS changes:  Auto-loaded via Vite HMR                   ║
║  Native changes:  Auto-rebuilds plugin + cap sync            ║
║  Manual restart: Kill this script and re-run 'bun start'     ║
╚══════════════════════════════════════════════════════════════╝

Launching app on ${platform} emulator with live-reload...
`);

  const capRunProc = Bun.spawn(['bunx', 'cap', 'run', platform, '--live-reload'], {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const exitCode = await capRunProc.exited;
  console.log(`\n👋 Capacitor run exited with code ${exitCode}. Shutting down...`);
  if (viteProc) viteProc.kill();
  process.exit(0);
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (viteProc) viteProc.kill();
  process.exit(0);
});

console.log('\n👀 Watching for native changes...\n');

watch(resolve(PATHS.ROOT, 'android', 'src'), { recursive: true }, (_evt, filename) => {
  console.log(`\n📦 Plugin Android changed: ${filename}`);
  debouncedSync();
});

watch(resolve(PATHS.ROOT, 'ios', 'Sources'), { recursive: true }, (_evt, filename) => {
  console.log(`\n📦 Plugin iOS changed: ${filename}`);
  debouncedSync();
});

main();

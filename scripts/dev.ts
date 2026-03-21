export {};

import { watch } from 'fs';
import { resolve } from 'path';
import { getEnv, saveEnv } from './utils/env.utils';
import { PATHS } from './paths';
import { detectLocalIP, execCmd, prompt } from './utils/cli.utils';
import { Emulator, getAvailableAVDs, getRunningEmulators, startEmulators } from './utils/emulator.utils';
import { adbInstall, adbLaunch, adbReverse } from './utils/adb.utils';

const DEFAULT_PORT = '5173';
const APP_ID = 'com.example.offlineTransfer';

function parseMultiSelect(input: string): string[] {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  if (parts.length === 1 && (parts[0].toLowerCase() === 'all' || parts[0] === '*')) {
    return ['*'];
  }
  return parts;
}

async function selectPlatform(current?: string): Promise<'android' | 'ios'> {
  if (current === 'android' || current === 'ios') return current;
  const ans = (await prompt('Select platform (android/ios) [android]: ')).trim().toLowerCase();
  return ans === 'ios' ? 'ios' : 'android';
}

async function promptEmulatorSelection(avds: string[]): Promise<string[]> {
  console.log('\n🖥️  Available AVDs:');
  avds.forEach((avd, i) => console.log(`  [${i + 1}] ${avd}`));
  console.log('\n⚡ Select emulators to start (e.g. "1,3" or "1 3" or "all"):');

  const input = (await prompt('  > ')).trim();
  const selection = parseMultiSelect(input);

  if (selection.length === 0) {
    console.log('No selection — exiting.');
    process.exit(0);
  }

  if (selection[0] === '*') {
    return avds;
  }

  const indices = selection.map((s) => parseInt(s, 10) - 1).filter((i) => i >= 0 && i < avds.length);
  return indices.map((i) => avds[i]);
}

let viteProc: ReturnType<typeof Bun.spawn> | null = null;
let serverPort = DEFAULT_PORT;
let serverIp: string | null = null;
let runningEmulators: Emulator[] = [];

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

function startViteServer(): void {
  if (viteProc) {
    viteProc.kill();
    viteProc = null;
  }

  console.log(`\n🚀 Starting Vite dev server`);
  viteProc = Bun.spawn(['bun', 'run', 'start'], {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
}

async function ensurePortFree(port: string): Promise<void> {
  const { stdout } = await execCmd('cmd', ['/c', `netstat -ano | findstr :${port}`]);
  for (const line of stdout.split('\n')) {
    const m = line.trim().match(/(\d+)\s*$/);
    if (m) {
      console.log(`  Killing process ${m[1]} on port ${port}...`);
      await execCmd('cmd', ['/c', `taskkill /F /PID ${m[1]}`]);
      await new Promise<void>((r) => setTimeout(r, 500));
      break;
    }
  }
}

async function deployToAllEmulators(port: string): Promise<void> {
  runningEmulators = await getRunningEmulators();
  if (runningEmulators.length === 0) {
    console.log('\n⚠️  No running emulators found. Skipping deploy.');
    return;
  }

  console.log('\n📦 Deploying to emulators...');

  for (const em of runningEmulators) {
    process.stdout.write(`  [${em.id}] adb reverse... `);
    await adbReverse(em.id, port);
    console.log('✅');
  }

  for (const em of runningEmulators) {
    process.stdout.write(`  [${em.id}] install APK... `);
    const result = await adbInstall(em.id);
    if (!result.success) {
      console.log(`❌\n    ↳ ${result.error ?? 'Unknown error'}`);
      continue;
    }
    console.log('✅');
    process.stdout.write(`  [${em.id}] launch app... `);
    const launchResult = await adbLaunch(em.id);
    if (!launchResult.success) {
      console.log(`❌\n    ↳ ${launchResult.error ?? 'Unknown error'}`);
      continue;
    }
    console.log('✅');
  }
}

async function redeployAll(port: string): Promise<void> {
  console.log('\n📦 Rebuilding and redeploying...');
  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('❌ Sync failed, skipping redeploy');
    return;
  }
  await deployToAllEmulators(port);
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
  runningEmulators = await getRunningEmulators();

  if (runningEmulators.length > 0) {
    console.log(`  Found ${runningEmulators.length} running emulator(s):`);
    runningEmulators.forEach((em) => console.log(`    ✓ ${em.id} (${em.state})`));
  } else {
    console.log('  No emulators running.');

    const avds = await getAvailableAVDs();
    if (avds.length === 0) {
      console.log('  No AVDs found. Please create one via Android Studio or `avdmanager`.');
      process.exit(1);
    }

    console.log(`  Found ${avds.length} available AVD(s).`);

    const fromEnv = env.EMULATOR_AVDS;
    let toStart: string[];

    if (fromEnv) {
      const envAvds = fromEnv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      toStart = envAvds
        .map((name) => {
          const found = avds.find((a) => a === name);
          if (!found) console.log(`  ⚠️  AVD "${name}" not found in available list`);
          return found;
        })
        .filter(Boolean) as string[];
      if (toStart.length === 0) {
        console.log('  No valid AVDs from EMULATOR_AVDS env var. Showing prompt...');
        toStart = await promptEmulatorSelection(avds);
      }
    } else {
      toStart = await promptEmulatorSelection(avds);
    }

    await startEmulators(toStart);
    runningEmulators = await getRunningEmulators();
  }

  if (runningEmulators.length === 0) {
    console.error('\n❌ No emulators available. Exiting.');
    process.exit(1);
  }

  const ip = serverIp!;
  const port = serverPort;

  console.log(`\n🔨 Initial build and sync...`);

  const ok = await syncPluginAndNative();
  if (!ok) {
    console.error('\n❌ Initial sync failed. Please fix errors and try again.');
    process.exit(1);
  }

  await ensurePortFree(port);
  startViteServer();

  await deployToAllEmulators(port);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     LIVE-RELOAD READY                        ║
╠══════════════════════════════════════════════════════════════╣
║  Web server:  http://localhost:${port.padEnd(18)}║
║  Emulators:   ${runningEmulators
    .map((e) => e.id)
    .join(', ')
    .padEnd(52)}║
║  Platform:    ${platform.padEnd(52)}║
╠══════════════════════════════════════════════════════════════╣
║  Web/JS changes:  Auto-loaded via Vite HMR                   ║
║  Native changes:  Auto-rebuilds plugin + redeploys all      ║
║  Press R:         Force rebuild & redeploy                   ║
╚══════════════════════════════════════════════════════════════╝
`);

  await watchNativeChanges(port);
}

async function watchNativeChanges(port: string): Promise<void> {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let syncing = false;

  function onChange(label: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (syncing) return;
      syncing = true;
      try {
        console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
        await redeployAll(port);
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
      redeployAll(port).finally(() => {
        syncing = false;
        console.log(`\n👀 Watching native changes...`);
      });
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
      if (viteProc) viteProc.kill();
      resolve();
    }),
  );
}

console.log('\n👀 Watching for native changes...\n');
main().catch((err) => {
  console.error(err);
  if (viteProc) viteProc.kill();
  process.exit(1);
});

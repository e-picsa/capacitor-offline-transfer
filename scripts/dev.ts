import { watch, existsSync, FSWatcher } from 'fs';
import { resolve } from 'path';
import readline from 'readline';
import { getEnv, saveEnv } from './utils/env.utils';
import { detectLocalIP, selectPlatform, execCmd } from './utils/cli.utils';
import { pad, boxLine } from './utils/string.utils';
import { ensureEmulatorsRunning } from './commands/emulator';
import { syncPluginAndNative, deployToAll } from './commands/deploy';
import { startViteServer, ensurePortFree, viteProc } from './commands/server';
import { COMMANDS } from './commands';
import { PATHS } from './paths';
import type { Emulator } from './utils/emulator.utils';

const DEFAULT_PORT = '5173';

function printBanner(serverPort: string, platform: string, emulators: Emulator[]): void {
  const WIDTH = 62;
  const borderTop = `╔${'═'.repeat(WIDTH)}╗`;
  const borderMid = `╠${'═'.repeat(WIDTH)}╣`;
  const borderBot = `╚${'═'.repeat(WIDTH)}╝`;

  const emulatorList = emulators.length > 0 ? emulators.map((e) => e.id).join(', ') : 'None (iOS not yet supported)';

  console.log(`
${borderTop}
${boxLine('LIVE-RELOAD READY', WIDTH, 20)}
${borderMid}
${boxLine(`Web server:  http://localhost:${pad(serverPort, 18)}`, WIDTH, 2)}
${boxLine(`Emulators:   ${pad(emulatorList, 52)}`, WIDTH, 2)}
${boxLine(`Platform:    ${pad(platform, 52)}`, WIDTH, 2)}
${borderMid}
${boxLine('Web/JS changes:  Auto-loaded via Vite HMR', WIDTH, 2)}
${boxLine('Native changes:  Auto-rebuilds plugin + redeploys all', WIDTH, 2)}
${COMMANDS.map((c) => boxLine(`${pad(c.label, 8)}${c.description}`, WIDTH, 2)).join('\n')}
${borderBot}
`);
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
  const platform = await selectPlatform();

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

  await deployToAll(emulators, serverPort);

  printBanner(serverPort, platform, emulators);

  await watchLoop(emulators, serverPort);
}

function gracefulExit(code: number): void {
  if (viteProc) viteProc.kill();
  process.exit(code);
}

async function watchLoop(emulators: Emulator[], port: string): Promise<void> {
  let watchers: FSWatcher[] = [];
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let syncing = false;

  function isSyncing(): boolean {
    return syncing;
  }

  function setSyncing(v: boolean): void {
    syncing = v;
  }

  function clearDebounceTimer(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function onChange(label: string): void {
    clearDebounceTimer();
    debounceTimer = setTimeout(async () => {
      if (isSyncing()) return;
      setSyncing(true);
      try {
        const { fullRedeploy } = await import('./commands/deploy');
        console.log(`\n📦 ${label} changed, rebuilding and redeploying...`);
        await fullRedeploy(emulators, port);
        console.log(`\n👀 Watching native changes...`);
      } finally {
        setSyncing(false);
      }
    }, 1000);
  }

  function cleanup(): void {
    clearDebounceTimer();
    watchers.forEach((w) => w.close());
    process.stdin.removeAllListeners('keypress');
    process.stdin.setRawMode?.(false);
    process.stdin.pause?.();
    if (viteProc) viteProc.kill();
  }

  const commandContext = { emulators, port, isSyncing, setSyncing, clearDebounceTimer };

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode?.(true);
  process.stdin.resume?.();
  process.stdin.on('keypress', (_ch: string, key: { name: string; ctrl: boolean }) => {
    if (key.ctrl && key.name === 'c') return;
    const pressed = key.name?.toLowerCase();
    for (const cmd of COMMANDS) {
      if (cmd.key === pressed) {
        cmd.action(commandContext);
        break;
      }
    }
  });

  watchers.push(
    watch(resolve(PATHS.ROOT, 'android', 'src'), { recursive: true }, () => {
      onChange('Android');
    }),
  );

  watchers.push(
    watch(resolve(PATHS.ROOT, 'ios', 'Sources'), { recursive: true }, () => {
      onChange('iOS');
    }),
  );

  await new Promise<void>((resolve) => {
    process.once('SIGINT', () => {
      console.log('\n👋 Shutting down...');
      cleanup();
      resolve();
    });
    process.once('SIGTERM', () => {
      console.log('\n👋 Shutting down...');
      cleanup();
      resolve();
    });
  });
}

console.log('\n👀 Watching for native changes...\n');
main().catch((err) => {
  console.error(err);
  gracefulExit(1);
});

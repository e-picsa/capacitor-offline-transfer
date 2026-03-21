import { spawn } from 'node:child_process';
import { execCmd, parseMultiSelect, prompt } from './cli.utils';

export interface Emulator {
  id: string;
  state: string;
  avdName: string;
}

const EMULATOR_FLAGS = ['-no-snapshot-load', '-no-audio', '-gpu', 'swiftshader_indirect'];
const BOOT_TIMEOUT_SECS = 120;

export async function promptEmulatorSelection(avds: string[]): Promise<string[]> {
  console.log('\n🖥️  Available AVDs:');
  avds.forEach((avd, i) => console.log(`  [${i + 1}] ${avd}`));
  console.log('\n⚡ Select emulators to start (e.g. "1,3" or "1 3" or "all"):');

  const input = (await prompt('  > ')).trim();
  const selection = parseMultiSelect(input);

  if (selection.length === 0) {
    console.log('No selection — exiting.');
    process.exit(0);
  }

  if (selection[0] === '*') return avds;

  const indices = selection.map((s) => parseInt(s, 10) - 1).filter((i) => i >= 0 && i < avds.length);
  return indices.map((i) => avds[i]);
}

export async function ensureEmulatorsRunning(envAvds?: string): Promise<Emulator[]> {
  let running = await getRunningEmulators();

  if (running.length > 0) {
    console.log(`  Found ${running.length} running emulator(s):`);
    running.forEach((em) => console.log(`    ✓ ${em.id} (${em.state})`));
    return running;
  }

  console.log('  No emulators running.');

  const avds = await getAvailableAVDs();
  if (avds.length === 0) {
    console.log('  No AVDs found. Please create one via Android Studio or `avdmanager`.');
    process.exit(1);
  }

  console.log(`  Found ${avds.length} available AVD(s).`);

  let toStart: string[];

  if (envAvds) {
    const envList = envAvds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    toStart = envList.filter((name) => {
      if (!avds.includes(name)) console.log(`  ⚠️  AVD "${name}" not found in available list`);
      return avds.includes(name);
    });
    if (toStart.length === 0) {
      console.log('  No valid AVDs from EMULATOR_AVDS env var. Showing prompt...');
      toStart = await promptEmulatorSelection(avds);
    }
  } else {
    toStart = await promptEmulatorSelection(avds);
  }

  const started = await startEmulators(toStart);
  return started;
}

export async function getRunningEmulators(): Promise<Emulator[]> {
  const { stdout } = await execCmd('adb', ['devices']);
  const emulators: Emulator[] = [];
  for (const line of stdout.split('\n')) {
    const match = line.match(/^(emulator-\d+)\s+(\S+)/);
    if (match) {
      emulators.push({ id: match[1], state: match[2], avdName: '' });
    }
  }
  return emulators;
}

export async function getAvailableAVDs(): Promise<string[]> {
  const { stdout } = await execCmd('emulator', ['-list-avds']);
  return stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export async function coldRebootEmulators(emulators: Emulator[]): Promise<void> {
  if (emulators.length === 0) {
    console.log('No emulators to cold-reboot.');
    return;
  }

  for (const em of emulators) {
    if (!em.avdName) {
      console.log(`  ⚠️  Skipping ${em.id} — AVD name unknown (not started by this script)`);
      continue;
    }
    await coldBootEmulator(em.avdName, em.id);
  }
}

export async function startEmulators(avdNames: string[]): Promise<Emulator[]> {
  if (avdNames.length === 0) return [];

  console.log('\n🚀 Starting emulators...');
  const runningBefore = new Set((await getRunningEmulators()).map((e) => e.id));

  for (let i = 0; i < avdNames.length; i++) {
    const port = 5554 + i * 2;
    console.log(`  Starting ${avdNames[i]} on port ${port}...`);
    spawn('emulator', ['-avd', avdNames[i], '-port', String(port), ...EMULATOR_FLAGS], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
  }

  console.log(`\n⏳ Waiting for ${avdNames.length} new emulator(s) to boot...`);
  const start = Date.now();

  while (Date.now() - start < BOOT_TIMEOUT_SECS * 1000) {
    await new Promise((r) => setTimeout(r, 1000));
    const newlyBooted = (await getRunningEmulators()).filter((e) => !runningBefore.has(e.id) && e.state === 'device');

    if (newlyBooted.length >= avdNames.length) {
      const result: Emulator[] = [];
      for (let i = 0; i < avdNames.length; i++) {
        const port = 5554 + i * 2;
        const serial = `emulator-${port}`;
        const em = newlyBooted.find((e) => e.id === serial);
        if (!em) {
          throw new Error(`Emulator with serial ${serial} not found among booted emulators`);
        }
        result.push({ id: em.id, state: em.state, avdName: avdNames[i] });
      }
      console.log(`\n✅ All ${avdNames.length} new emulator(s) have booted.`);
      return result;
    }
  }

  console.log(
    `\n⚠️ Timed out after ${BOOT_TIMEOUT_SECS}s waiting for all emulators to boot. Please check their status manually.`,
  );
  return [];
}

export async function coldBootEmulator(avdName: string, emulatorId: string): Promise<void> {
  console.log(`\n❄️  Cold-rebooting ${emulatorId} (${avdName})...`);

  await execCmd('adb', ['-s', emulatorId, 'emu', 'kill']);

  let disappeared = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const stillRunning = (await getRunningEmulators()).some((e) => e.id === emulatorId);
    if (!stillRunning) {
      disappeared = true;
      break;
    }
  }

  if (!disappeared) {
    console.error(`    ⚠️  ${emulatorId} did not shut down — skipping restart`);
    return;
  }

  const portMatch = emulatorId.match(/^emulator-(\d+)$/);
  const port = portMatch ? portMatch[1] : null;
  const restartFlags = port
    ? ['-avd', avdName, '-port', port, ...EMULATOR_FLAGS]
    : ['-avd', avdName, ...EMULATOR_FLAGS];
  console.log(`    emulator shut down, restarting...`);
  spawn('emulator', restartFlags, {
    detached: true,
    stdio: 'ignore',
    shell: true,
  }).unref();

  const afterBootTimeout = BOOT_TIMEOUT_SECS * 1000;
  const start = Date.now();
  while (Date.now() - start < afterBootTimeout) {
    await new Promise((r) => setTimeout(r, 1000));
    const ems = await getRunningEmulators();
    if (ems.find((e) => e.id === emulatorId && e.state === 'device')) {
      console.log(`    ✅ ${emulatorId} rebooted successfully`);
      return;
    }
  }

  console.error(`    ⚠️  ${emulatorId} did not come back within ${BOOT_TIMEOUT_SECS}s`);
}

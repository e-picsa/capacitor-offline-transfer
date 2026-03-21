import { spawn } from 'node:child_process';
import { execCmd } from './cli.utils';

export interface Emulator {
  id: string;
  state: string;
  avdName: string;
}

const EMULATOR_FLAGS = ['-no-snapshot-load', '-no-audio', '-gpu', 'swiftshader_indirect'];
const BOOT_TIMEOUT_SECS = 120;

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

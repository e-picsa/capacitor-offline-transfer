import { spawn } from 'node:child_process';
import { execCmd } from './cli.utils';

export interface Emulator {
  id: string;
  state: string;
}

export async function getRunningEmulators(): Promise<Emulator[]> {
  const { stdout } = await execCmd('adb', ['devices']);
  const emulators: Emulator[] = [];
  for (const line of stdout.split('\n')) {
    const match = line.match(/^(emulator-\d+)\s+(\S+)/);
    if (match) {
      emulators.push({ id: match[1], state: match[2] });
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

export async function startEmulators(avdNames: string[]): Promise<void> {
  if (avdNames.length === 0) {
    return;
  }

  console.log('\n🚀 Starting emulators...');
  const runningBefore = new Set((await getRunningEmulators()).map((e) => e.id));

  for (const name of avdNames) {
    console.log(`  Starting ${name}...`);
    spawn('emulator', ['-avd', name, '-no-snapshot-load', '-no-audio', '-gpu', 'swiftshader_indirect'], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();
  }

  console.log(`\n⏳ Waiting for ${avdNames.length} new emulator(s) to boot...`);
  const bootTimeoutSeconds = 120;
  for (let i = 0; i < bootTimeoutSeconds; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const newlyBooted = (await getRunningEmulators()).filter((e) => !runningBefore.has(e.id) && e.state === 'device');

    if (newlyBooted.length >= avdNames.length) {
      console.log(`\n✅ All ${avdNames.length} new emulator(s) have booted.`);
      return;
    }
  }

  console.log(
    `\n⚠️ Timed out after ${bootTimeoutSeconds}s waiting for all emulators to boot. Please check their status manually.`,
  );
}

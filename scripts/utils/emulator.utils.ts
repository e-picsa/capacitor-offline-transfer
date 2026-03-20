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
  console.log('\n🚀 Starting emulators...');
  const promises: Promise<void>[] = [];

  for (const name of avdNames) {
    console.log(`  Starting ${name}...`);
    spawn('emulator', ['-avd', name, '-no-snapshot-load', '-no-audio', '-gpu', 'swiftshader_indirect'], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();

    const p = (async () => {
      let booted = false;
      for (let i = 0; i < 60; i++) {
        await new Promise<void>((r) => setTimeout(r, 1000));
        const ems = await getRunningEmulators();
        if (ems.some((e) => e.state === 'device')) {
          booted = true;
          break;
        }
      }
      if (!booted) {
        console.log(`  ⚠️  ${name} may not have booted cleanly`);
      }
    })();
    promises.push(p);
  }

  await Promise.all(promises);
  console.log(`\n✅ ${avdNames.length} emulator(s) started`);
}

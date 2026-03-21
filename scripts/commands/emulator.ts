import {
  Emulator,
  getRunningEmulators,
  getAvailableAVDs,
  startEmulators,
  coldBootEmulator,
} from '../utils/emulator.utils';
import { prompt, runDetached } from '../utils/cli.utils';

function parseMultiSelect(input: string): string[] {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  if (parts.length === 1 && (parts[0].toLowerCase() === 'all' || parts[0] === '*')) return ['*'];
  return parts;
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

export async function openAndroidStudio(): Promise<void> {
  console.log('\n📦 Opening Android Studio...');
  runDetached('npx', ['cap', 'open', 'android']);
}

export async function coldRebootAll(emulators: Emulator[]): Promise<void> {
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

import { runInExample } from './app.utils';
import { runDetached, execCmd, parseMultiSelect, prompt } from './cli.utils';
import { DeviceTarget } from './device.types';

export async function fullRedeployIOS(_port: string): Promise<void> {
  console.log('\n📦 Syncing iOS native...');
  const ok = await syncIOSNative();
  if (!ok) {
    console.error('❌ iOS sync failed');
    return;
  }
  console.log('  ✅ iOS native synced (build from Xcode to apply changes)');
}

export async function syncIOSNative(): Promise<boolean> {
  const syncOk = await runInExample(['bunx', 'cap', 'sync', 'ios'], 'cap sync ios');
  if (!syncOk) return false;
  console.log(`✅ iOS native synced`);
  return true;
}

export function openXcode(): void {
  console.log('\n📦 Opening Xcode...');
  runDetached('npx', ['cap', 'open', 'ios']);
}

export async function getRunningIOSSimulators(): Promise<DeviceTarget[]> {
  const { stdout } = await execCmd('xcrun', ['simctl', 'list', 'devices', 'available']);
  const simulators: DeviceTarget[] = [];

  const lines = stdout.split('\n');
  let currentDeviceType = '';

  for (const line of lines) {
    const typeMatch = line.match(/^-- (iPhone|iPad)/);
    if (typeMatch) {
      currentDeviceType = typeMatch[1];
      continue;
    }

    const devMatch = line.match(/^\s{2,}([A-Za-z0-9 ]+)\s+\(([A-F0-9-]+)\)\s+\[(\w+)\]/);
    if (devMatch) {
      const name = devMatch[1].trim();
      const id = devMatch[2].trim();
      const state = devMatch[3].trim();

      if (state === 'Booted' || state === 'Shutdown') {
        simulators.push({
          kind: 'ios-simulator',
          id,
          name: `${currentDeviceType} ${name}`,
        });
      }
    }
  }

  return simulators;
}

export async function promptIOSSimulatorSelection(simulators: DeviceTarget[]): Promise<DeviceTarget[]> {
  if (simulators.length === 0) {
    console.log('\n  No simulators found. Please open Simulator.app and create one.');
    return [];
  }

  console.log('\n🍎 Available iOS simulators:');
  simulators.forEach((sim, i) => {
    console.log(`  [${i + 1}] ${sim.name} (${sim.id})`);
  });

  console.log('\n⚡ Select simulators (e.g. "1,2" or "all"):');
  const input = (await prompt('  > ')).trim();
  const selection = parseMultiSelect(input);

  if (selection.length === 0) return [];

  if (selection[0] === '*') return simulators;

  const indices = selection.map((s) => parseInt(s, 10) - 1).filter((i) => i >= 0 && i < simulators.length);
  return indices.map((i) => simulators[i]);
}

export async function ensureSimulatorBooted(simulator: DeviceTarget): Promise<void> {
  const { code } = await execCmd('xcrun', ['simctl', 'boot', simulator.id]);
  if (code === 0) {
    console.log(`  Booted ${simulator.name}`);
  }
}

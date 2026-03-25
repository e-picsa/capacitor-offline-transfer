import { spawn } from 'node:child_process';
import { DeviceManager } from './manager';
import type { DeviceInfo, AppInfo, DeviceType } from './types';
import { execCmd, waitForKeypress } from '../cli.utils';
import { openAndroidStudio } from '../android.utils';

const EMULATOR_FLAGS = ['-no-snapshot-load', '-no-audio', '-gpu', 'swiftshader_indirect'];
const BOOT_TIMEOUT_SECS = 120;

export class AndroidEmulatorManager extends DeviceManager {
  readonly platform = 'android' as const;
  readonly type = 'emulator' as const;

  private onlineDevices: DeviceInfo[] = [];
  private offlineDevices: DeviceInfo[] = [];

  async list(): Promise<DeviceInfo[]> {
    await this.refreshDevices();
    return [...this.onlineDevices, ...this.offlineDevices];
  }

  private async refreshDevices() {
    this.onlineDevices = await this.listOnlineDevices();
    this.offlineDevices = await this.listOfflineDevices();
  }

  private async listOnlineDevices(): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = [];
    const { stdout } = await execCmd('adb', ['devices']);
    for (const line of stdout.split('\n')) {
      const match = line.match(/^(emulator-\d+)\s+(\S+)/);
      if (match) {
        const id = match[1];
        const state = match[2];
        const status = state === 'device' ? 'online' : 'offline';
        const avdName = await this.getAvdName(id);
        devices.push({ id, name: avdName || id, platform: 'android', type: 'emulator', status, avdName });
      }
    }
    return devices;
  }

  private async listOfflineDevices(): Promise<DeviceInfo[]> {
    const { stdout } = await execCmd('emulator', ['-list-avds']);
    const runningAvds = this.onlineDevices.filter((v) => v.type === 'emulator').map((v) => v.avdName as string);
    return stdout
      .split('\n')
      .map((l) => l.trim())
      .filter((avdName) => Boolean(avdName) && !runningAvds.includes(avdName))
      .map((avdName) => ({
        id: avdName,
        name: avdName,
        platform: 'android',
        status: 'offline',
        type: 'emulator',
        avdName,
      }));
  }

  private async getAvdName(emulatorId: string): Promise<string | undefined> {
    try {
      const { stdout } = await execCmd('adb', ['-s', emulatorId, 'emu', 'avd', 'name']);
      const name = stdout.split('\n')[0].trim();
      return name || undefined;
    } catch {
      return undefined;
    }
  }

  async createNew(): Promise<void> {
    console.log('\n🖥️  Creating new emulator:');
    console.log('  Opening Android Studio...');
    await openAndroidStudio();

    console.log('\n📖 Learn how to create AVDs:');
    console.log('  https://developer.android.com/studio/run/managing-avds');
    console.log("\n  Press any key once you've created the emulator...");

    await waitForKeypress();
  }

  async start(avdName: string): Promise<void> {
    const running = await this.listOnlineDevices();
    const existing = running.find((e) => e.avdName === avdName);
    if (existing) {
      console.log(`  Emulator ${avdName} is already running`);
      return;
    }

    const usedPorts = new Set(
      running
        .map((e) => {
          const match = e.id.match(/emulator-(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(Boolean),
    );

    let port = 5554;
    while (usedPorts.has(port)) {
      port += 2;
    }

    console.log(`  Starting ${avdName} on port ${port}...`);
    spawn('emulator', ['-avd', avdName, '-port', String(port), ...EMULATOR_FLAGS], {
      detached: true,
      stdio: 'ignore',
      shell: true,
    }).unref();

    console.log(`  Waiting for ${avdName} to boot...`);
    await this.waitForDevice(`emulator-${port}`, BOOT_TIMEOUT_SECS * 1000);
  }

  async stop(deviceId: string): Promise<void> {
    console.log(`  Stopping emulator ${deviceId}...`);
    await execCmd('adb', ['-s', deviceId, 'emu', 'kill']);
  }

  async coldReboot(deviceId: string): Promise<void> {
    console.log(`  Cold-rebooting ${deviceId}...`);
    await this.stop(deviceId);

    let disappeared = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      await this.refreshDevices();
      const stillRunning = this.onlineDevices.some((e) => e.id === deviceId);
      if (!stillRunning) {
        disappeared = true;
        break;
      }
    }

    if (!disappeared) {
      console.error(`    ${deviceId} did not shut down`);
      return;
    }

    const device = this.onlineDevices.find((e) => e.id === deviceId);
    if (device?.avdName) {
      await this.start(device.avdName);
    }
  }

  async install(deviceId: string, app: AppInfo): Promise<void> {
    if (!app.apkPath) throw new Error('APK path not specified');
    const { code, stdout, stderr } = await execCmd('adb', ['-s', deviceId, 'install', '-r', app.apkPath]);

    if (code !== 0) {
      const error = (stderr || stdout).trim();
      throw new Error(`Install failed: ${error}`);
    }
  }

  async uninstall(deviceId: string, appId: string): Promise<void> {
    await execCmd('adb', ['-s', deviceId, 'uninstall', appId]);
  }

  async isRunning(deviceId: string): Promise<boolean> {
    const { stdout } = await execCmd('adb', ['devices']);
    for (const line of stdout.split('\n')) {
      if (line.startsWith(deviceId) && line.includes('device')) {
        return true;
      }
    }
    return false;
  }

  async launch(deviceId: string, app: AppInfo): Promise<void> {
    const activity = app.activity || '.MainActivity';
    const { code, stdout, stderr } = await execCmd('adb', [
      '-s',
      deviceId,
      'shell',
      'am',
      'start',
      '-n',
      `${app.appId}/${activity}`,
    ]);

    if (code !== 0) {
      const error = (stderr || stdout).trim();
      throw new Error(`Launch failed: ${error}`);
    }
  }

  async setupLiveReload(deviceId: string, _app: AppInfo): Promise<void> {
    await execCmd('adb', ['-s', deviceId, 'reverse', 'tcp:5173', 'tcp:5173']);
  }
}

import { DeviceManager } from './manager';
import { AndroidEmulatorManager } from './android-emulator.manager';
import { AndroidDeviceManager } from './android-device.manager';
import { IOSSimulatorManager } from './ios-simulator.manager';
import { IOSDeviceManager } from './ios-device.manager';
import type { DeviceInfo, AppInfo, Platform } from './types';
import { prompt, parseMultiSelect } from '../cli.utils';

export class DeviceOrchestrator {
  androidEmulator = new AndroidEmulatorManager();
  androidDevice = new AndroidDeviceManager();
  iosSimulator = new IOSSimulatorManager();
  iosDevice = new IOSDeviceManager();

  getManagers(platform: Platform): DeviceManager[] {
    switch (platform) {
      case 'android':
        return [this.androidEmulator, this.androidDevice];
      case 'ios':
        return [this.iosSimulator, this.iosDevice];
    }
  }

  getManager(device: DeviceInfo): DeviceManager {
    if (device.platform === 'android' && device.type === 'emulator') {
      return this.androidEmulator;
    }
    if (device.platform === 'android' && device.type === 'physical') {
      return this.androidDevice;
    }
    if (device.platform === 'ios' && device.type === 'emulator') {
      return this.iosSimulator;
    }
    if (device.platform === 'ios' && device.type === 'physical') {
      return this.iosDevice;
    }
    throw new Error(`Unknown device: ${device.platform}/${device.type}`);
  }

  async detectAll(platform: Platform): Promise<DeviceInfo[]> {
    const managers = this.getManagers(platform);
    const results = await Promise.all(managers.map((m) => m.list()));
    return results.flat();
  }

  async promptSelection(
    devices: DeviceInfo[],
    options?: {
      showPairOption?: boolean;
      onPairDevice?: () => Promise<DeviceInfo | null>;
      newDeviceActions?: {
        letter: string;
        label: string;
        action: () => Promise<DeviceInfo | null>;
      }[];
    },
  ): Promise<DeviceInfo[]> {
    const newDeviceActions = options?.newDeviceActions || [];
    let numIndex = 1;

    console.log('\n📱 Available devices:');

    if (newDeviceActions.length > 0) {
      console.log('  ─── New Device ───');
      for (const action of newDeviceActions) {
        console.log(`  [${action.letter}] ${action.label}`);
      }
    }

    if (devices.length > 0) {
      console.log('  ─── Existing Devices ───');
      for (const device of devices) {
        const statusLabel = device.status === 'online' ? 'online' : device.status === 'booting' ? 'booting' : 'offline';
        const typeLabel = device.type === 'emulator' ? '[emulator]' : device.ip ? '[wireless]' : '[USB]';
        console.log(`  [${numIndex++}] ${device.id} (${device.name}) ${typeLabel} [${statusLabel}]`);
      }
    }

    console.log('\n⚡ Select devices or actions (e.g. "1,2" or "d,1"):');
    const input = (await prompt('  > ')).trim();
    const selection = parseMultiSelect(input);

    if (selection.length === 0) {
      return [];
    }

    const selectedDevices: DeviceInfo[] = [];
    let newDeviceAdded = false;

    for (const s of selection) {
      const action = newDeviceActions.find((a) => a.letter.toLowerCase() === s.toLowerCase());
      if (action) {
        const newDevice = await action.action();
        if (newDevice) {
          selectedDevices.push(newDevice);
          newDeviceAdded = true;
        }
      } else {
        const idx = parseInt(s, 10) - 1;
        if (idx >= 0 && idx < devices.length) {
          selectedDevices.push(devices[idx]);
        }
      }
    }

    if (newDeviceAdded) {
      const refreshed = await this.detectAll(devices[0]?.platform || 'android');

      const existingByNumber = selectedDevices.filter((d) => refreshed.some((r) => r.id === d.id && r.name === d.name));

      const newDevices = selectedDevices.filter((d) => !refreshed.some((r) => r.id === d.id && r.name === d.name));

      return [...existingByNumber, ...newDevices];
    }

    return selectedDevices;
  }

  async deploy(devices: DeviceInfo[], app: AppInfo): Promise<void> {
    for (const device of devices) {
      const manager = this.getManager(device);
      console.log(`\n📦 Deploying to ${device.name} (${device.id})...`);

      try {
        await manager.setupLiveReload(device.id, app);
        await manager.install(device.id, app);
        await manager.launch(device.id, app);
        console.log(`  ✅ Deployed successfully`);
      } catch (error) {
        console.log(`  ❌ Deployment failed: ${error}`);
      }
    }
  }

  async reinstall(devices: DeviceInfo[], app: AppInfo): Promise<void> {
    for (const device of devices) {
      const manager = this.getManager(device);
      console.log(`\n📦 Reinstalling on ${device.name} (${device.id})...`);

      try {
        await manager.reinstall(device.id, app);
        await manager.launch(device.id, app);
        console.log(`  ✅ Reinstalled successfully`);
      } catch (error) {
        console.log(`  ❌ Reinstall failed: ${error}`);
      }
    }
  }

  async coldReboot(device: DeviceInfo): Promise<void> {
    const manager = this.getManager(device);
    if (manager instanceof AndroidEmulatorManager) {
      await manager.coldReboot(device.id);
    } else {
      console.log(`  Cold-reboot not supported for ${device.platform}/${device.type}`);
    }
  }
}

export { DeviceManager } from './manager';
export type { DeviceInfo, AppInfo, Platform, DeviceType, DeviceStatus } from './types';

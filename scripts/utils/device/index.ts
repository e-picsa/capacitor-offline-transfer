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
    },
  ): Promise<DeviceInfo[]> {
    const allItems: { index: number; device?: DeviceInfo; isAction?: boolean; label: string }[] = [];
    let index = 0;

    if (options?.showPairOption) {
      allItems.push({ index: index++, isAction: true, label: 'Connect new device...' });
    }

    for (const device of devices) {
      const statusLabel = device.status === 'online' ? 'online' : device.status === 'booting' ? 'booting' : 'offline';
      const typeLabel = device.type === 'emulator' ? '[emulator]' : device.ip ? '[wireless]' : '[USB]';
      allItems.push({
        index: index++,
        device,
        label: `${device.id} (${device.name}) ${typeLabel} [${statusLabel}]`,
      });
    }

    console.log('\n📱 Available devices:');
    for (const item of allItems) {
      if (item.isAction) {
        console.log(`  [${item.index}] ${item.label}`);
      } else if (item.device) {
        console.log(`  [${item.index}] ${item.label}`);
      }
    }

    console.log('\n⚡ Select devices (e.g. "1,2"):');
    const input = (await prompt('  > ')).trim();
    const selection = parseMultiSelect(input);

    if (selection.length === 0) {
      return [];
    }

    if (selection[0] === '*') {
      return devices;
    }

    const indices = selection.map((s) => parseInt(s, 10));

    if (options?.showPairOption && indices.includes(0)) {
      const newDevice = await options.onPairDevice?.();
      if (newDevice) {
        const rest = indices.filter((i) => i !== 0);
        if (rest.length === 0) {
          return [newDevice];
        }
        const refreshed = await this.detectAll(devices[0]?.platform || 'android');
        const selected = rest
          .map((i) => {
            const item = allItems.find((item) => item.index === i);
            return item?.device;
          })
          .filter(Boolean) as DeviceInfo[];
        return [...selected, newDevice];
      }
    }

    return indices
      .map((i) => {
        const item = allItems.find((item) => item.index === i);
        return item?.device;
      })
      .filter(Boolean) as DeviceInfo[];
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

import type { DeviceInfo, AppInfo, Platform, DeviceType } from './types';

export abstract class DeviceManager {
  abstract readonly platform: Platform;
  abstract readonly type: DeviceType;

  abstract list(): Promise<DeviceInfo[]>;
  abstract start(deviceId: string): Promise<void>;
  abstract stop(deviceId: string): Promise<void>;
  abstract install(deviceId: string, app: AppInfo): Promise<void>;
  abstract uninstall(deviceId: string, appId: string): Promise<void>;
  abstract isRunning(deviceId: string): Promise<boolean>;
  abstract launch(deviceId: string, app: AppInfo): Promise<void>;
  abstract setupLiveReload(deviceId: string, app: AppInfo): Promise<void>;

  async reinstall(deviceId: string, app: AppInfo): Promise<void> {
    await this.uninstall(deviceId, app.appId).catch(() => {});
    await this.install(deviceId, app);
  }

  async waitForDevice(deviceId: string, timeoutMs = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isRunning(deviceId)) return;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`Device ${deviceId} not ready after ${timeoutMs}ms`);
  }

  async startAndInstall(deviceId: string, app: AppInfo): Promise<void> {
    await this.start(deviceId);
    await this.waitForDevice(deviceId);
    await this.install(deviceId, app);
  }
}

import { DeviceManager } from './manager';
import type { DeviceInfo, AppInfo } from './types';
import { execCmd } from '../cli.utils';

export class IOSSimulatorManager extends DeviceManager {
  readonly platform = 'ios' as const;
  readonly type = 'emulator' as const;

  async list(): Promise<DeviceInfo[]> {
    const { stdout } = await execCmd('xcrun', ['simctl', 'list', 'devices', 'available']);
    const simulators: DeviceInfo[] = [];

    let currentDeviceType = '';
    for (const line of stdout.split('\n')) {
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

        const status: DeviceInfo['status'] =
          state === 'Booted' ? 'online' : state === 'Shutdown' ? 'offline' : 'booting';

        simulators.push({
          id,
          name: `${currentDeviceType} ${name}`,
          platform: 'ios',
          type: 'emulator',
          status,
        });
      }
    }

    return simulators;
  }

  async start(deviceId: string): Promise<void> {
    const { code } = await execCmd('xcrun', ['simctl', 'boot', deviceId]);
    if (code === 0) {
      await execCmd('xcrun', ['simctl', 'bootstatus', deviceId, '-b']);
    }
  }

  async stop(deviceId: string): Promise<void> {
    await execCmd('xcrun', ['simctl', 'shutdown', deviceId]);
  }

  async install(deviceId: string, app: AppInfo): Promise<void> {
    const path = app.ipaPath || app.apkPath;
    if (!path) throw new Error('IPA or APK path not specified');
    const { code, stderr } = await execCmd('xcrun', ['simctl', 'install', deviceId, path]);
    if (code !== 0) {
      throw new Error(`Install failed: ${stderr}`);
    }
  }

  async uninstall(deviceId: string, appId: string): Promise<void> {
    await execCmd('xcrun', ['simctl', 'uninstall', deviceId, appId]);
  }

  async isRunning(deviceId: string): Promise<boolean> {
    const { stdout } = await execCmd('xcrun', ['simctl', 'list', 'devices', deviceId]);
    return stdout.includes('Booted');
  }

  async launch(deviceId: string, app: AppInfo): Promise<void> {
    await execCmd('xcrun', ['simctl', 'launch', deviceId, app.appId]);
  }

  async setupLiveReload(_deviceId: string, _app: AppInfo): Promise<void> {
    console.log('  iOS simulator - live-reload via localhost');
  }

  async openUrl(deviceId: string, url: string): Promise<void> {
    await execCmd('xcrun', ['simctl', 'openurl', deviceId, url]);
  }
}

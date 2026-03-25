import { DeviceManager } from './manager';
import type { DeviceInfo, AppInfo } from './types';
import { execCmd } from '../cli.utils';

export class IOSDeviceManager extends DeviceManager {
  readonly platform = 'ios' as const;
  readonly type = 'physical' as const;

  async list(): Promise<DeviceInfo[]> {
    const { stdout } = await execCmd('idevice_id', ['-l']);
    const devices: DeviceInfo[] = [];

    for (const line of stdout.split('\n')) {
      const id = line.trim();
      if (!id) continue;

      const { stdout: nameStdout } = await execCmd('ideviceinfo', ['-u', id, '-k', 'DeviceName']);
      const name = nameStdout.trim() || id;

      devices.push({
        id,
        name,
        platform: 'ios',
        type: 'physical',
        status: 'online',
      });
    }

    return devices;
  }

  async start(_deviceId: string): Promise<void> {
    console.log('  Physical iOS devices cannot be started via command');
  }

  async stop(_deviceId: string): Promise<void> {
    console.log('  Physical iOS devices cannot be stopped via command');
  }

  async install(deviceId: string, app: AppInfo): Promise<void> {
    const ipaPath = app.ipaPath || app.apkPath;
    if (!ipaPath) {
      throw new Error('IPA path not specified');
    }

    const { code, stderr } = await execCmd('ideviceinstaller', ['-u', deviceId, '-i', ipaPath]);
    if (code !== 0) {
      throw new Error(`Install failed: ${stderr}`);
    }
  }

  async uninstall(deviceId: string, appId: string): Promise<void> {
    await execCmd('ideviceinstaller', ['-u', deviceId, '-u', appId]);
  }

  async isRunning(deviceId: string): Promise<boolean> {
    const { stdout, code } = await execCmd('idevice_id', ['-l']);
    return code === 0 && stdout.includes(deviceId);
  }

  async launch(deviceId: string, app: AppInfo): Promise<void> {
    await execCmd('idevicesyslog', ['-u', deviceId, 'open', `${app.appId}`]);
  }

  async setupLiveReload(_deviceId: string, _app: AppInfo): Promise<void> {
    console.log('  iOS device - live-reload via LAN IP');
  }
}

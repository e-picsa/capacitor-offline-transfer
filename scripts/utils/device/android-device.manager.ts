import { DeviceManager } from './manager';
import type { DeviceInfo, AppInfo } from './types';
import { execCmd, prompt } from '../cli.utils';

export class AndroidDeviceManager extends DeviceManager {
  readonly platform = 'android' as const;
  readonly type = 'physical' as const;

  async ensureAdbServer(): Promise<void> {
    await execCmd('adb', ['start-server']);
  }

  async list(): Promise<DeviceInfo[]> {
    await this.ensureAdbServer();
    const { stdout } = await execCmd('adb', ['devices', '-l']);
    const devices: DeviceInfo[] = [];

    for (const line of stdout.split('\n')) {
      const match = line.match(/^([A-Za-z0-9:.-]+)\s+(device|unauthorized|offline)\s*(.*)$/);
      if (!match) continue;
      if (match[1].startsWith('emulator-')) continue;
      if (match[2] !== 'device') continue;

      const serial = match[1];
      const isWireless = serial.includes('.');

      const kv: Record<string, string> = {};
      for (const pair of match[3].trim().split(/\s+/)) {
        const eq = pair.indexOf(':');
        if (eq > 0) kv[pair.slice(0, eq)] = pair.slice(eq + 1);
      }

      const [host, port] = isWireless ? serial.split(':') : [undefined, undefined];

      devices.push({
        id: serial,
        name: kv['model']?.replace(/_/g, ' ') || serial,
        platform: 'android',
        type: 'physical',
        status: 'online',
        ip: isWireless ? host : undefined,
      });
    }

    return devices;
  }

  async start(_deviceId: string): Promise<void> {
    console.log('  Physical devices cannot be started via command');
  }

  async stop(_deviceId: string): Promise<void> {
    console.log('  Physical devices cannot be stopped via command');
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
    const isWireless = deviceId.includes('.');
    if (isWireless) {
      console.log(`  ${deviceId} (wireless) - live-reload via LAN IP`);
    } else {
      await execCmd('adb', ['-s', deviceId, 'reverse', 'tcp:5173', 'tcp:5173']);
    }
  }

  async pairWireless(): Promise<DeviceInfo | null> {
    console.log('\n📡 Connect new physical device via wireless debugging:');
    console.log('');
    console.log('  On your Android device:');
    console.log('    1. Open Settings > Developer Options');
    console.log("    2. Enable 'Wireless debugging'");
    console.log("    3. Note the IP address and port (under 'IP address: port')");
    console.log("    4. Tap 'Pair device with pairing code' and note the code");
    console.log('');
    console.log('  Make sure your device is on the same Wi-Fi network as this computer.');

    const ip = (await prompt('\n  Device IP address: ')).trim();
    const port = (await prompt('  Port [5555]: ')).trim() || '5555';
    const code = (await prompt('  Pairing code: ')).trim();

    if (!ip) {
      console.log('No IP address provided.');
      return null;
    }

    console.log(`\n  Pairing with ${ip}:${port}...`);
    const { code: pairCode } = await execCmd('adb', ['pair', `${ip}:${port}`, code]);

    if (pairCode !== 0) {
      console.log('  ❌ Pairing failed. Check the pairing code and try again.');
      return null;
    }
    console.log('  ✅ Pairing successful');

    console.log(`  Connecting to ${ip}:${port}...`);
    const { code: connectCode } = await execCmd('adb', ['connect', `${ip}:${port}`]);

    if (connectCode !== 0) {
      console.log('  ❌ Connection failed.');
      return null;
    }
    console.log('  ✅ Connected');

    return {
      id: `${ip}:${port}`,
      name: 'Newly paired device',
      platform: 'android',
      type: 'physical',
      status: 'online',
      ip,
    };
  }

  async disconnect(deviceId: string): Promise<void> {
    await execCmd('adb', ['disconnect', deviceId]);
  }
}

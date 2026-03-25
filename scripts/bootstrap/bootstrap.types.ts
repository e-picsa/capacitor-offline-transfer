import { Platform } from '../types';
import { DeviceTarget } from '../utils/device.types';

export interface BootstrapContext {
  platform: Platform;
  devices: DeviceTarget[];
  serverIp: string;
  serverPort: string;
}

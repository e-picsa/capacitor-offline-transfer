import { Platform } from '../types';
import { DeviceInfo } from '../utils/device';

export interface BootstrapContext {
  platform: Platform;
  devices: DeviceInfo[];
  serverIp: string;
  serverPort: string;
}

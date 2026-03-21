import { Platform } from '../types';
import { Emulator } from '../utils/emulator.utils';

export interface BootstrapContext {
  platform: Platform;
  emulators: Emulator[];
  serverIp: string;
  serverPort: string;
}

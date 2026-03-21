import type { Emulator } from './utils/emulator.utils';

export type Platform = 'android' | 'ios';

export interface DevContext {
  platform: Platform;
  emulators: Emulator[];
  serverIp: string;
  serverPort: string;
}

export interface Emulator {
  id: string;
  state: string;
  avdName: string;
}

export type Platform = 'android' | 'ios';

export interface DevContext {
  platform: Platform;
  emulators: Emulator[];
  serverIp: string;
  serverPort: string;
}

export interface CommandContext {
  emulators: Emulator[];
  port: string;
  isSyncing: () => boolean;
  setSyncing: (v: boolean) => void;
  clearDebounceTimer: () => void;
}

export interface Command {
  key: string;
  label: string;
  description: string;
  action: (ctx: CommandContext) => void | Promise<void>;
}

export type KeyAction = 'redeploy' | 'reinstall' | 'reboot' | 'studio' | null;

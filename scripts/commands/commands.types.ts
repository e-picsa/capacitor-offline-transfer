import { DevContext } from '../types';

export interface CommandContext extends DevContext {
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

import { DevContext } from '../types';

export interface WatchContext extends DevContext {
  isSyncing: () => boolean;
  setSyncing: (v: boolean) => void;
  clearDebounceTimer: () => void;
}

export interface FileWatcherDef {
  path: string;
  pattern: RegExp;
  label: string;
  action: (ctx: WatchContext) => Promise<void>;
}

export interface KeyWatcherDef {
  key: string;
  label: string;
  description: string;
  /** When true, guards against concurrent runs and shows status on completion */
  exclusive?: boolean;
  action: (ctx: WatchContext) => void | Promise<void>;
}

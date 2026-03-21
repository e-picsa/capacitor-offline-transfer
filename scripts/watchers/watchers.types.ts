import { BootstrapContext } from '../bootstrap/bootstrap.types';

export interface WatchContext extends BootstrapContext {
  isSyncing: () => boolean;
  setSyncing: (v: boolean) => void;
  clearDebounceTimer: () => void;
  abort: AbortController;
}

export interface FileWatcherDef {
  path: string;
  pattern: RegExp;
  label: string;
  action: (ctx: WatchContext) => Promise<void>;
}

export interface KeyWatcherDef {
  key: string;
  description: string;
  /** When true, guards against concurrent runs and shows status on completion */
  exclusive?: boolean;
  action: (ctx: WatchContext) => void | Promise<void>;
}

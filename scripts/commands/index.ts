import { DevContext } from '../types';
import android from './commands.android';
import ios from './commands.ios';
import { CommandContext } from './commands.types';

export const COMMANDS = {
  ios,
  android,
};

export function createCommandCtx(ctx: DevContext): CommandContext {
  let syncing = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    ...ctx,
    isSyncing: () => syncing,
    setSyncing: (v: boolean) => {
      syncing = v;
    },
    clearDebounceTimer: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

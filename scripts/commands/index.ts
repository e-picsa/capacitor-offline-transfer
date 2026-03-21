import type { Emulator } from '../utils/emulator.utils';
import { runDetached } from '../utils/cli.utils';
import type { Platform } from '../types';
import { reinstallAll } from './deploy';
import { coldRebootAll, openAndroidStudio } from './emulator';
import { fullRedeployAndroid } from './deploy.android';
import { fullRedeployIOS } from './deploy.ios';

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

const onDone = (ctx: CommandContext) => {
  ctx.setSyncing(false);
  console.log(`\n👀 Watching for changes...`);
};

export function getCommands(platform: Platform): Command[] {
  if (platform === 'ios') {
    return [
      {
        key: 'r',
        label: 'Press R:',
        description: 'Force rebuild & redeploy',
        action: (ctx) => {
          ctx.clearDebounceTimer();
          if (ctx.isSyncing()) return;
          ctx.setSyncing(true);
          fullRedeployIOS(ctx.port).finally(() => onDone(ctx));
        },
      },
      {
        key: 'i',
        label: 'Press I:',
        description: 'Reinstall app (no rebuild)',
        action: (ctx) => {
          if (ctx.isSyncing()) return;
          ctx.setSyncing(true);
          reinstallAll(ctx.emulators).finally(() => onDone(ctx));
        },
      },
      {
        key: 'x',
        label: 'Press X:',
        description: 'Open Xcode',
        action: () => {
          openXcode();
        },
      },
    ];
  }

  return [
    {
      key: 'r',
      label: 'Press R:',
      description: 'Force rebuild & redeploy',
      action: (ctx) => {
        ctx.clearDebounceTimer();
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        fullRedeployAndroid(ctx.emulators).finally(() => onDone(ctx));
      },
    },
    {
      key: 'i',
      label: 'Press I:',
      description: 'Reinstall app (no rebuild)',
      action: (ctx) => {
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        reinstallAll(ctx.emulators).finally(() => onDone(ctx));
      },
    },
    {
      key: 'c',
      label: 'Press C:',
      description: 'Cold-reboot all emulators',
      action: (ctx) => {
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        coldRebootAll(ctx.emulators).finally(() => onDone(ctx));
      },
    },
    {
      key: 'a',
      label: 'Press A:',
      description: 'Open Android Studio',
      action: () => {
        openAndroidStudio();
      },
    },
  ];
}

function openXcode(): void {
  console.log('\n📦 Opening Xcode...');
  runDetached('npx', ['cap', 'open', 'ios']);
}

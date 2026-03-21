import { Command, CommandContext } from './commands.types';
import { reinstallAll } from '../deploy';
import { fullRedeployAndroid, openAndroidStudio } from '../utils/android.utils';
import { coldRebootEmulators } from '../utils/emulator.utils';

const onDone = (ctx: CommandContext) => {
  ctx.setSyncing(false);
  console.log(`\n👀 Watching for changes...`);
};

const commands: Command[] = [
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
      coldRebootEmulators(ctx.emulators).finally(() => onDone(ctx));
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

export default commands;

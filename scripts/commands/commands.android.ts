import { Command, CommandContext } from './commands.types';
import { fullRedeployAndroid, openAndroidStudio } from '../utils/android.utils';
import { coldRebootEmulators, Emulator, reinstallAll } from '../utils/emulator.utils';

// TODO - pass common onDone method....
// TODO - generate base context before platform-specific

export default (ctx: CommandContext): Command[] => {
  const onDone = () => {
    ctx.setSyncing(false);
    console.log(`\n👀 Watching for changes...`);
  };

  return [
    {
      key: 'r',
      label: 'Press R:',
      description: 'Force rebuild & redeploy',
      action: () => {
        ctx.clearDebounceTimer();
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        fullRedeployAndroid(ctx.emulators).finally(() => onDone());
      },
    },
    {
      key: 'i',
      label: 'Press I:',
      description: 'Reinstall app (no rebuild)',
      action: () => {
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        reinstallAll(ctx.emulators).finally(() => onDone());
      },
    },
    {
      key: 'c',
      label: 'Press C:',
      description: 'Cold-reboot all emulators',
      action: () => {
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        coldRebootEmulators(ctx.emulators).finally(() => onDone());
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
};

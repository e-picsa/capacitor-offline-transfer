import { fullRedeployIOS, openXcode } from '../utils/ios.utils';
import { Command, CommandContext } from './commands.types';

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
      action: (ctx) => {
        ctx.clearDebounceTimer();
        if (ctx.isSyncing()) return;
        ctx.setSyncing(true);
        fullRedeployIOS(ctx.serverPort).finally(() => onDone());
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
};

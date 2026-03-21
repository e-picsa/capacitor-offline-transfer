import { fullRedeployIOS, openXcode } from '../utils/ios.utils';
import { Command, CommandContext } from './commands.types';

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
      fullRedeployIOS(ctx.serverPort).finally(() => onDone(ctx));
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
export default commands;

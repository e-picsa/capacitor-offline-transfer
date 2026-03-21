import { bootstrap as bootstrapAndroid } from './phases/bootstrap.android';
import { startDevLoop as startDevLoopAndroid } from './phases/dev-loop.android';
import { bootstrap as bootstrapIOS } from './phases/bootstrap.ios';
import { startDevLoop as startDevLoopIOS } from './phases/dev-loop.ios';
import { pad, boxLine } from './utils/string.utils';
import type { DevContext } from './types';
import { bootstrapShared } from './phases/bootstrap.shared';

async function main(): Promise<void> {
  let ctx = await bootstrapShared();

  if (ctx.platform === 'android') {
    ctx = await bootstrapAndroid(ctx);
    printBanner(ctx);
    await startDevLoopAndroid(ctx);
  }
  if (ctx.platform === 'ios') {
    ctx = await bootstrapIOS(ctx);
    printBanner(ctx);
    await startDevLoopIOS(ctx);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function printBanner(ctx: DevContext): void {
  const WIDTH = 62;
  const borderTop = `╔${'═'.repeat(WIDTH)}╗`;
  const borderMid = `╠${'═'.repeat(WIDTH)}╣`;
  const borderBot = `╚${'═'.repeat(WIDTH)}╝`;

  const emulatorList =
    ctx.emulators.length > 0 ? ctx.emulators.map((e) => e.id).join(', ') : 'None (emulator deploy not available)';
  const innerWidth = WIDTH - 3;
  const valueWidth = innerWidth - 'Emulators:   '.length;

  console.log(`
 ${borderTop}
 ${boxLine('LIVE-RELOAD READY', WIDTH, 20)}
 ${borderMid}
 ${boxLine(`Web server:  http://localhost:${pad(ctx.serverPort, 18)}`, WIDTH, 2)}
 ${boxLine(`Emulators:   ${pad(emulatorList, valueWidth)}`, WIDTH, 2)}
 ${boxLine(`Platform:    ${pad(ctx.platform, valueWidth)}`, WIDTH, 2)}
 ${borderMid}
 ${boxLine('Web/JS changes:  Auto-loaded via Vite HMR', WIDTH, 2)}
 ${boxLine('Native changes:  Auto-rebuilds plugin + redeploys all', WIDTH, 2)}
 ${borderBot}
`);
}

import { startViteServer } from './utils/app.utils';
import { handleBootstrap } from './bootstrap';
import { runWatchers } from './watchers';
import { BootstrapContext } from './bootstrap/bootstrap.types';
import { BOARDER_BOTTOM, BOARDER_MID, BOARDER_TOP, boxLine, CONSOLE_WIDTH, pad } from './utils/console.utils';

async function main(): Promise<void> {
  const ctx = await handleBootstrap();

  printBanner(ctx);
  startViteServer();

  await runWatchers(ctx);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function printBanner(ctx: BootstrapContext): void {
  const emulatorList =
    ctx.emulators.length > 0 ? ctx.emulators.map((e) => e.id).join(', ') : 'None (emulator deploy not available)';

  const lines = [
    BOARDER_TOP,
    boxLine('LIVE-RELOAD READY'),
    BOARDER_MID,
    boxLine(`Web server:  http://localhost:${ctx.serverPort}`),
    boxLine(`Emulators:   ${emulatorList}`),
    boxLine(`Platform:    ${ctx.platform}`),
    BOARDER_MID,
    boxLine('Web/JS changes:  Auto-loaded via Vite HMR'),
    boxLine('Native changes:  Auto-rebuilds plugin + redeploys all'),
    BOARDER_BOTTOM,
  ];
  console.log(lines.join('\n'));
}

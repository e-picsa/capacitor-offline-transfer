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
  const emulators = ctx.devices.filter((d) => d.kind === 'emulator').map((d) => d.id);
  const physicalDevices = ctx.devices.filter((d) => d.kind === 'physical');
  const iosSimulators = ctx.devices.filter((d) => d.kind === 'ios-simulator');

  const formatDevices = (devices: typeof ctx.devices) => {
    if (devices.length === 0) return 'None';
    return devices.map((d) => d.name || d.id).join(', ');
  };

  const emulatorLine = emulators.length > 0 ? emulators.join(', ') : 'None';
  const deviceLine = formatDevices(physicalDevices);
  const iosLine = formatDevices(iosSimulators);

  const lines = [
    BOARDER_TOP,
    boxLine('LIVE-RELOAD READY'),
    BOARDER_MID,
    boxLine(`Web server:    http://localhost:${ctx.serverPort}`),
    boxLine(`Platform:      ${ctx.platform}`),
  ];

  if (ctx.platform === 'android') {
    lines.push(boxLine(`Emulators:     ${emulatorLine}`));
    lines.push(boxLine(`Devices:       ${deviceLine}`));
  } else if (ctx.platform === 'ios') {
    lines.push(boxLine(`Simulators:    ${iosLine}`));
  }

  lines.push(
    BOARDER_MID,
    boxLine('Web/JS changes:  Auto-loaded via Vite HMR'),
    boxLine('Native changes:  Auto-rebuilds plugin + redeploys all'),
    BOARDER_BOTTOM,
  );
  console.log(lines.join('\n'));
}

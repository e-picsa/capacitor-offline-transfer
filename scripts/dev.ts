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
  const devices = ctx.devices;
  const emulators = devices.filter((d) => d.type === 'emulator' && d.platform === 'android');
  const physicalDevices = devices.filter((d) => d.type === 'physical' && d.platform === 'android');
  const iosSimulators = devices.filter((d) => d.type === 'emulator' && d.platform === 'ios');
  const iosDevices = devices.filter((d) => d.type === 'physical' && d.platform === 'ios');

  const formatDevices = (devs: typeof devices) => {
    if (devs.length === 0) return 'None';
    return devs.map((d) => d.name || d.id).join(', ');
  };

  const emulatorLine = formatDevices(emulators);
  const androidDeviceLine = formatDevices(physicalDevices);
  const iosSimLine = formatDevices(iosSimulators);
  const iosDevLine = formatDevices(iosDevices);

  const lines = [
    BOARDER_TOP,
    boxLine('LIVE-RELOAD READY'),
    BOARDER_MID,
    boxLine(`Web server:    http://localhost:${ctx.serverPort}`),
    boxLine(`Platform:      ${ctx.platform}`),
  ];

  if (ctx.platform === 'android') {
    lines.push(boxLine(`Emulators:     ${emulatorLine}`));
    lines.push(boxLine(`Devices:       ${androidDeviceLine}`));
  } else if (ctx.platform === 'ios') {
    lines.push(boxLine(`Simulators:    ${iosSimLine}`));
    if (iosDevLine !== 'None') {
      lines.push(boxLine(`Devices:       ${iosDevLine}`));
    }
  }

  lines.push(
    BOARDER_MID,
    boxLine('Web/JS changes:  Auto-loaded via Vite HMR'),
    boxLine('Native changes:  Auto-rebuilds plugin + redeploys all'),
    BOARDER_BOTTOM,
  );
  console.log(lines.join('\n'));
}

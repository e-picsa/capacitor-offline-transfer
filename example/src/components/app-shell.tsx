import { SplashScreen } from '@capacitor/splash-screen';
import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import { useSignal } from '@preact/signals';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';
import { useEffect } from 'preact/hooks';

import { initialized, lanServerRunning, lanServerUrl } from '../state';
import { logService, errMsg } from '../state/log.service';

import { ConnectionPanel } from './connection-panel';
import { LogConsole } from './log-console';
import { SetupPanel } from './setup-panel';
import { TransferPanel } from './transfer-panel';
import { ToastContainer } from './ui/toast';

SplashScreen.hide();

export const AppShell: FunctionComponent = () => {
  const isAndroid = /android/i.test(navigator.userAgent);
  const showDevTools = useSignal(false);

  useEffect(() => {
    const unsubEndpointFound = OfflineTransfer.addListener('endpointFound', (ev) => {
      logService.info(`Found: ${ev.endpointName}`, 'discovery');
    });
    const unsubEndpointLost = OfflineTransfer.addListener('endpointLost', (ev) => {
      logService.warn(`Lost device: ${ev.endpointId}`, 'discovery');
    });
    const unsubConnRequested = OfflineTransfer.addListener('connectionRequested', (ev) => {
      logService.info(`Connection request from ${ev.endpointName}`, 'connection');
      OfflineTransfer.acceptConnection({ endpointId: ev.endpointId });
    });
    const unsubConnResult = OfflineTransfer.addListener('connectionResult', (ev) => {
      if (ev.status === 'SUCCESS') {
        logService.success(`Connected to ${ev.endpointId}`, 'connection');
      } else {
        logService.error(`Connection ${ev.status.toLowerCase()}: ${ev.endpointId}`, 'connection');
      }
    });
    const unsubMsg = OfflineTransfer.addListener('messageReceived', (ev) => {
      logService.info(`MSG: ${ev.data}`, 'transfer');
    });
    const unsubFile = OfflineTransfer.addListener('fileReceived', (ev) => {
      logService.success(`FILE RECEIVED: ${ev.fileName}`, 'transfer');
    });
    const unsubProgress = OfflineTransfer.addListener('transferProgress', (ev) => {
      const pct = Math.round((ev.bytesTransferred / ev.totalBytes) * 100);
      if (ev.status !== 'IN_PROGRESS') {
        logService.info(`Transfer ${ev.status.toLowerCase()} (${pct}%)`, 'transfer');
      }
    });
    const unsubLan = OfflineTransfer.addListener('emulatorClientConnected', (ev) => {
      logService.info(`LAN client connected: ${ev.endpointName}`, 'devtools');
    });

    return () => {
      unsubEndpointFound.then((u) => u.remove());
      unsubEndpointLost.then((u) => u.remove());
      unsubConnRequested.then((u) => u.remove());
      unsubConnResult.then((u) => u.remove());
      unsubMsg.then((u) => u.remove());
      unsubFile.then((u) => u.remove());
      unsubProgress.then((u) => u.remove());
      unsubLan.then((u) => u.remove());
    };
  }, []);

  const handleStartLan = async () => {
    try {
      const info = await OfflineTransfer.startLanServer({ port: 8080 });
      lanServerUrl.value = info.url;
      lanServerRunning.value = true;
      logService.success(`LAN Server: ${info.url}`, 'devtools');
    } catch (e: unknown) {
      logService.error(`LAN Server Error: ${errMsg(e)}`, 'devtools');
    }
  };

  const handleStopLan = async () => {
    await OfflineTransfer.stopLanServer();
    lanServerRunning.value = false;
    logService.info('LAN Server stopped', 'devtools');
  };

  return html`
    <div class="min-h-screen bg-white font-sans">
      <${ToastContainer} />

      <header class="bg-blue-600 text-white px-4 py-3">
        <h1 class="text-xl font-semibold">Offline Transfer</h1>
      </header>

      <main class="max-w-lg mx-auto p-4 space-y-6">
        <${SetupPanel} />

        ${initialized.value
          ? html`
              <${ConnectionPanel} />
              <${TransferPanel} />
              <${LogConsole} />

              ${isAndroid
                ? html`
                    <section>
                      <button
                        class="text-blue-600 hover:underline text-sm"
                        onClick=${() => {
                          showDevTools.value = !showDevTools.value;
                        }}
                      >
                        ${showDevTools.value ? 'Hide' : 'Show'} Dev Tools
                      </button>

                      ${showDevTools.value
                        ? html`
                            <div class="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                              <div class="flex flex-wrap gap-2 mb-3">
                                <button
                                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded text-sm border border-gray-300"
                                  onClick=${handleStartLan}
                                  disabled=${lanServerRunning.value}
                                >
                                  Start LAN Server
                                </button>
                                ${lanServerRunning.value
                                  ? html`
                                      <button
                                        class="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded text-sm border border-red-300"
                                        onClick=${handleStopLan}
                                      >
                                        Stop LAN Server
                                      </button>
                                      <div class="w-full text-xs text-gray-600 mt-1">
                                        <code class="break-all">${lanServerUrl.value}</code>
                                      </div>
                                    `
                                  : ''}
                              </div>
                            </div>
                          `
                        : ''}
                    </section>
                  `
                : ''}
            `
          : ''}
      </main>
    </div>
  `;
};

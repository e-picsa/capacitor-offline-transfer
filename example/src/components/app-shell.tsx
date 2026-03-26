import { SplashScreen } from '@capacitor/splash-screen';
import { OfflineTransfer, transferState } from '@picsa/capacitor-offline-transfer';
import { useSignal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';

import { capabilities, connectedEndpoints, initPluginState } from '../state';
import { logService } from '../state/log.service';

import { AppHeader } from './app-header';
import { ConnectionControls } from './connection-controls';
import { ConnectionPanel } from './connection-panel';
import { ConnectionStatus } from './connection-status';
import { LogPanel } from './log-panel';
import { TransferPanel } from './transfer-panel';
import { ToastContainer } from './ui/toast';

SplashScreen.hide();

export const AppShell = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showLogs = useSignal(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await OfflineTransfer.initialize({ serviceId: 'picsa-offline' });
        await OfflineTransfer.setLogLevel({ logLevel: 3 });

        const caps = await OfflineTransfer.checkCapabilities();
        const state = await OfflineTransfer.syncFromPlugin();
        logService.info('Initialized');
        logService.info(JSON.stringify(state, null, 2));
        transferState.onCapabilitiesDetected(caps);

        setIsLoading(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      }
    };

    const unsubCleanup = initPluginState();
    setup();

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
    const unsubFile = OfflineTransfer.addListener('fileReceived', (ev) => {
      logService.success(`FILE RECEIVED: ${ev.fileName}`, 'transfer');
    });
    const unsubProgress = OfflineTransfer.addListener('transferProgress', (ev) => {
      const pct = Math.round((ev.bytesTransferred / ev.totalBytes) * 100);
      if (ev.status !== 'IN_PROGRESS') {
        logService.info(`Transfer ${ev.status.toLowerCase()} (${pct}%)`, 'transfer');
      }
    });

    return () => {
      unsubCleanup();
      unsubConnRequested.then((u) => u.remove());
      unsubConnResult.then((u) => u.remove());
      unsubFile.then((u) => u.remove());
      unsubProgress.then((u) => u.remove());
    };
  }, []);

  const caps = capabilities.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;
  const isConnected = !!connectedId;

  return (
    <div class="min-h-screen bg-white font-sans flex flex-col">
      <ToastContainer />

      <AppHeader
        onToggleLogs={() => {
          showLogs.value = !showLogs.value;
        }}
      />

      <main class="flex-1 max-w-lg mx-auto p-4 w-full">
        {isLoading ? (
          <div class="flex items-center justify-center py-12">
            <div class="text-gray-500">Checking capabilities...</div>
          </div>
        ) : error ? (
          <div class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <p class="font-medium">Initialization failed</p>
            <p class="text-sm mt-1">{error}</p>
          </div>
        ) : caps?.transferMethod === 'none' ? (
          <div class="bg-gray-50 border border-gray-200 rounded p-6 text-center">
            <div class="text-gray-400 text-4xl mb-3">📡</div>
            <p class="font-medium text-gray-700">Transfer not available</p>
            <p class="text-sm text-gray-500 mt-1">{caps.reason || 'This device does not support offline transfer.'}</p>
          </div>
        ) : (
          <>
            <section class="mb-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h2 class="text-lg font-semibold">Connection</h2>
                  <p class="text-xs text-gray-500">
                    {caps?.transferMethod === 'lan' ? 'LAN Mode' : 'Nearby Mode'}
                    {caps?.isEmulator ? ' (Emulator)' : ''}
                  </p>
                </div>
                <ConnectionControls />
              </div>

              <ConnectionStatus />

              <ConnectionPanel />
            </section>

            {isConnected ? <TransferPanel /> : null}
          </>
        )}
      </main>

      <LogPanel
        isOpen={showLogs.value}
        onClose={() => {
          showLogs.value = false;
        }}
      />
    </div>
  );
};

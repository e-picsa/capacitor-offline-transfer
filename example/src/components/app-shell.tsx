import { SplashScreen } from '@capacitor/splash-screen';
import { OfflineTransfer, transferState } from '@picsa/capacitor-offline-transfer';
import { useSignal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';

import { capabilities, connectedEndpoints, connectionMode, connectionError, initPluginState } from '../state';
import { logService } from '../state/log.service';

import { ConnectionPanel } from './connection-panel';
import { LogConsole } from './log-console';
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
  const mode = connectionMode.value;
  const isPending = mode === 'advertising' || mode === 'discovering' || mode === 'connecting';

  const getStatusBadge = () => {
    const badges: Record<string, { text: string; class: string }> = {
      advertising: { text: '📡 Advertising', class: 'bg-blue-100 text-blue-800' },
      discovering: { text: '🔍 Discovering', class: 'bg-yellow-100 text-yellow-800' },
      connecting: { text: '⏳ Connecting...', class: 'bg-yellow-100 text-yellow-800' },
      connected: { text: '✅ Connected', class: 'bg-green-100 text-green-800' },
      error: { text: '❌ ' + (connectionError.value || 'Error'), class: 'bg-red-100 text-red-800' },
    };
    const badge = badges[mode];
    if (!badge) return null;
    return <span class={`text-xs px-2 py-1 rounded ${badge.class}`}>{badge.text}</span>;
  };

  const handleConnect = async () => {
    // Stop both advertising AND any endpoint connections
    if (mode !== 'idle') {
      connectionMode.value = 'idle';
      connectionError.value = null;
      await OfflineTransfer.stopAdvertising().catch(() => {});
      await OfflineTransfer.stopDiscovery().catch(() => {});
      for (const epId of Object.keys(connectedEndpoints.value)) {
        await OfflineTransfer.disconnectFromEndpoint({ endpointId: epId }).catch(() => {});
      }
      return;
    }

    // Start advertising and discovering
    try {
      connectionMode.value = 'advertising';
      logService.info('Start Advertising...');
      await OfflineTransfer.startAdvertising({
        displayName: 'Device_' + Math.floor(Math.random() * 10000),
      });
      connectionMode.value = 'discovering';
      logService.info('Start Discovery...');
      await OfflineTransfer.startDiscovery();
    } catch (e: unknown) {
      connectionMode.value = 'error';
      connectionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  return (
    <div class="min-h-screen bg-white font-sans flex flex-col">
      <ToastContainer />

      <header class="bg-blue-600 text-white px-4 pt-3 pb-3 flex items-center justify-between pt-[env(safe-area-inset-top)]">
        <h1 class="text-xl font-semibold">Offline Transfer</h1>
        <button
          class="bg-blue-500 hover:bg-blue-400 text-white font-medium py-1 px-3 rounded text-sm"
          onClick={() => {
            showLogs.value = !showLogs.value;
          }}
        >
          Logs
        </button>
      </header>

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
                <div class="flex gap-2 items-center">
                  {getStatusBadge()}
                  <button
                    class={
                      isPending
                        ? 'bg-gray-400 text-white font-medium py-2 px-4 rounded text-sm cursor-not-allowed'
                        : isConnected || mode !== 'idle'
                          ? 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm'
                          : 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm'
                    }
                    onClick={handleConnect}
                    disabled={isPending}
                  >
                    {isPending
                      ? mode === 'advertising'
                        ? 'Starting...'
                        : 'Stopping...'
                      : mode !== 'idle'
                        ? 'Disconnect'
                        : 'Connect'}
                  </button>
                </div>
              </div>

              {isConnected ? (
                <div class="bg-green-50 border border-green-200 rounded p-3 mb-4">
                  <p class="text-sm text-green-700">
                    Connected to <span class="font-medium">{connected[connectedId]?.endpointName || connectedId}</span>
                  </p>
                </div>
              ) : mode !== 'idle' ? (
                <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p class="text-sm text-blue-700">
                    {mode === 'advertising' && 'Waiting for nearby devices to discover you...'}
                    {mode === 'discovering' && 'Looking for nearby devices...'}
                    {mode === 'connecting' && 'Attempting to connect...'}
                    {mode === 'error' && connectionError.value}
                  </p>
                </div>
              ) : (
                <div class="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                  <p class="text-sm text-gray-500">Tap Connect to start advertising and discovering nearby devices.</p>
                </div>
              )}

              <ConnectionPanel />
            </section>

            {isConnected ? <TransferPanel /> : null}
          </>
        )}
      </main>

      {showLogs.value ? (
        <>
          <div
            class="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              showLogs.value = false;
            }}
          ></div>
          <div class="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg z-50 max-h-[60vh] overflow-hidden">
            <div class="flex items-center justify-between p-3 border-b border-gray-200">
              <h3 class="font-medium">Logs</h3>
              <button
                class="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  showLogs.value = false;
                }}
              >
                ✕
              </button>
            </div>
            <div class="overflow-y-auto max-h-[calc(60vh-50px)]">
              <LogConsole />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

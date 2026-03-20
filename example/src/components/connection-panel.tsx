import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import { useSignal } from '@preact/signals';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { endpoints, connectedEndpoints } from '../state';
import { logService, errMsg } from '../state/log.service';

import { Badge } from './ui/badge';

export const ConnectionPanel: FunctionComponent = () => {
  const isAdvertising = useSignal(false);
  const isDiscovering = useSignal(false);
  const manualConnectUrl = useSignal('http://localhost:8080');
  const manualConnectStatus = useSignal<'' | 'loading' | 'active' | 'stopped'>('');
  const manualConnectArea = useSignal(false);

  const endpointList = endpoints.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;

  const handleAdvertise = async () => {
    try {
      isAdvertising.value = true;
      await OfflineTransfer.startAdvertising({
        displayName: 'Device_' + Math.floor(Math.random() * 1000),
      });
      logService.info('Advertising started');
    } catch (e: unknown) {
      isAdvertising.value = false;
      logService.error(`Advertising Error: ${errMsg(e)}`);
    }
  };

  const handleDiscover = async () => {
    try {
      isDiscovering.value = true;
      await OfflineTransfer.startDiscovery();
      logService.info('Discovery started');
    } catch (e: unknown) {
      isDiscovering.value = false;
      logService.error(`Discovery Error: ${errMsg(e)}`);
    }
  };

  const handleStop = async () => {
    await OfflineTransfer.stopAdvertising();
    await OfflineTransfer.stopDiscovery();
    await OfflineTransfer.disconnect();
    isAdvertising.value = false;
    isDiscovering.value = false;
    logService.info('Stopped advertising and discovery');
  };

  const handleConnect = async (endpointId: string, endpointName: string) => {
    try {
      logService.info(`Connecting to ${endpointName}...`);
      await OfflineTransfer.connect({ endpointId, displayName: 'DemoUser' });
    } catch (e: unknown) {
      logService.error(`Connect Error: ${errMsg(e)}`);
    }
  };

  const handleDisconnect = async (endpointId: string) => {
    await OfflineTransfer.disconnectFromEndpoint({ endpointId });
  };

  const handleManualConnect = async () => {
    try {
      manualConnectStatus.value = 'loading';
      await OfflineTransfer.connectByAddress({ url: manualConnectUrl.value });
    } catch (e: unknown) {
      manualConnectStatus.value = 'stopped';
      logService.error(`Manual Connect Error: ${errMsg(e)}`);
    }
  };

  return html`
    <section>
      <h2 class="text-lg font-semibold mb-3">2. Connections</h2>

      <div class="flex flex-wrap gap-2 mb-3">
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50"
          onClick=${handleAdvertise}
          disabled=${isAdvertising.value}
        >
          ${isAdvertising.value ? 'Advertising...' : 'Advertise'}
        </button>
        <${Badge} text=${isAdvertising.value ? 'Advertising' : ''} variant=${isAdvertising.value ? 'active' : ''} />

        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50"
          onClick=${handleDiscover}
          disabled=${isDiscovering.value}
        >
          ${isDiscovering.value ? 'Discovering...' : 'Discover'}
        </button>
        <${Badge} text=${isDiscovering.value ? 'Discovering' : ''} variant=${isDiscovering.value ? 'active' : ''} />
      </div>

      <button
        class="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50 mb-3"
        onClick=${handleStop}
        disabled=${!isAdvertising.value && !isDiscovering.value && !connectedId}
      >
        Stop All
      </button>

      <div class="bg-gray-50 rounded border border-gray-200 p-3 min-h-[60px]">
        ${Object.keys(endpointList).length === 0
          ? html`<p class="text-gray-400 text-sm">No devices found yet...</p>`
          : Object.values(endpointList).map(
              (ep) => html`
                <div
                  key=${ep.endpointId}
                  class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                >
                  <span class="text-sm font-medium">${ep.endpointName}</span>
                  <button
                    class=${`py-1 px-3 rounded text-xs font-medium ${
                      connectedId === ep.endpointId
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                    onClick=${connectedId === ep.endpointId
                      ? () => handleDisconnect(ep.endpointId)
                      : () => handleConnect(ep.endpointId, ep.endpointName)}
                  >
                    ${connectedId === ep.endpointId ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              `,
            )}
      </div>

      ${manualConnectArea.value
        ? html`
            <div class="mt-3">
              <label class="block text-xs text-gray-500 mb-1">Manual Connect (client emulator)</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                  value=${manualConnectUrl.value}
                  onInput=${(e: Event) => {
                    manualConnectUrl.value = (e.target as HTMLInputElement).value;
                  }}
                />
                <button
                  class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1 px-3 rounded text-sm border border-gray-300"
                  onClick=${handleManualConnect}
                  disabled=${manualConnectStatus.value === 'loading'}
                >
                  ${manualConnectStatus.value === 'loading' ? '...' : 'Connect'}
                </button>
                <${Badge} variant=${manualConnectStatus.value} />
              </div>
            </div>
          `
        : ''}
    </section>
  `;
};

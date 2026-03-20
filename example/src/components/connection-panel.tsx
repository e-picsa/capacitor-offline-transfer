import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { endpoints, connectedEndpoints } from '../state';
import { logService, errMsg } from '../state/log.service';

export const ConnectionPanel: FunctionComponent = () => {
  const endpointList = endpoints.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;

  const handleConnect = async (endpointId: string, endpointName: string) => {
    try {
      logService.info(`Connecting to ${endpointName}...`);
      await OfflineTransfer.connect({ endpointId, displayName: 'DemoUser' });
    } catch (e: unknown) {
      logService.error(`Connect Error: ${errMsg(e)}`);
    }
  };

  const handleDisconnect = async (endpointId: string) => {
    try {
      await OfflineTransfer.disconnectFromEndpoint({ endpointId });
    } catch (e: unknown) {
      logService.error(`Disconnect Error: ${errMsg(e)}`);
    }
  };

  return html`
    <div class="bg-gray-50 rounded border border-gray-200 p-3 min-h-[60px]">
      ${Object.keys(endpointList).length === 0
        ? html`<p class="text-gray-400 text-sm">Searching for nearby devices...</p>`
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
  `;
};

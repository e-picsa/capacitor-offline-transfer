import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import { signal } from '@preact/signals';

import { endpoints, connectedEndpoints, connectionMode } from '../state';
import { logService, errMsg } from '../state/log.service';

const connectingEndpointId = signal<string | null>(null);

export const ConnectionPanel = () => {
  const endpointList = endpoints.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;
  const connecting = connectingEndpointId.value;

  const handleConnect = async (endpointId: string, endpointName: string) => {
    connectingEndpointId.value = endpointId;
    // Set global mode so the main connect button shows "Connecting..."
    const prevMode = connectionMode.peek();
    connectionMode.value = 'connecting';
    
    try {
      logService.info(`Connecting to ${endpointName}...`);
      await OfflineTransfer.connect({ endpointId, displayName: 'DemoUser' });
      // On success, the 'connectedEndpoints' subscription in state/index.ts will set mode to 'connected'
    } catch (e: unknown) {
      logService.error(`Connect Error: ${errMsg(e)}`);
      // On error, revert to previous mode or discovery
      connectionMode.value = prevMode;
    } finally {
      connectingEndpointId.value = null;
    }
  };

  const handleDisconnect = async (endpointId: string) => {
    try {
      await OfflineTransfer.disconnectFromEndpoint({ endpointId });
    } catch (e: unknown) {
      logService.error(`Disconnect Error: ${errMsg(e)}`);
    }
  };

  return (
    <div class="bg-gray-50 rounded border border-gray-200 p-3 min-h-[60px]">
      {Object.keys(endpointList).length === 0 ? (
        <p class="text-gray-400 text-sm">Searching for nearby devices...</p>
      ) : (
        Object.values(endpointList).map((ep) => (
          <div
            key={ep.endpointId}
            class="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
          >
            <span class="text-sm font-medium">{ep.endpointName}</span>
            <button
              class={`py-1 px-3 rounded text-xs font-medium ${
                connectedId === ep.endpointId
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : connecting === ep.endpointId
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
              onClick={
                connectedId === ep.endpointId
                  ? () => handleDisconnect(ep.endpointId)
                  : () => handleConnect(ep.endpointId, ep.endpointName)
              }
              disabled={connecting === ep.endpointId}
            >
              {connectedId === ep.endpointId ? 'Disconnect' : connecting === ep.endpointId ? '...' : 'Connect'}
            </button>
          </div>
        ))
      )}
    </div>
  );
};

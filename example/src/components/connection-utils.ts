import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';

import { connectionMode, connectionError, connectedEndpoints } from '../state';
import { logService } from '../state/log.service';

export async function handleConnect(): Promise<void> {
  if (connectionMode.value !== 'idle') {
    connectionMode.value = 'idle';
    connectionError.value = null;
    await OfflineTransfer.stopAdvertising().catch(() => {});
    await OfflineTransfer.stopDiscovery().catch(() => {});
    for (const epId of Object.keys(connectedEndpoints.value)) {
      await OfflineTransfer.disconnectFromEndpoint({ endpointId: epId }).catch(() => {});
    }
    return;
  }

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
}

export function getStatusBadge(): { badge: { text: string; class: string }; mode: string } | null {
  const badges: Record<string, { text: string; class: string }> = {
    advertising: { text: '📡 Advertising', class: 'bg-blue-100 text-blue-800' },
    discovering: { text: '🔍 Discovering', class: 'bg-yellow-100 text-yellow-800' },
    connecting: { text: '⏳ Connecting...', class: 'bg-yellow-100 text-yellow-800' },
    connected: { text: '✅ Connected', class: 'bg-green-100 text-green-800' },
    error: { text: '❌ ' + (connectionError.value || 'Error'), class: 'bg-red-100 text-red-800' },
  };
  const mode = connectionMode.value;
  const badge = badges[mode];
  if (!badge) return null;
  return { badge, mode };
}

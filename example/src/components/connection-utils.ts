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

    const advResult = await OfflineTransfer.startAdvertising({
      displayName: 'Device_' + Math.floor(Math.random() * 10000),
    });

    if (!advResult.success) {
      throw new Error('Failed to start advertising');
    }

    logService.info('Start Discovery...');
    const discResult = await OfflineTransfer.startDiscovery();

    if (!discResult.success) {
      throw new Error('Failed to start discovery');
    }
  } catch (e: unknown) {
    connectionMode.value = 'error';
    connectionError.value = e instanceof Error ? e.message : String(e);
  }
}

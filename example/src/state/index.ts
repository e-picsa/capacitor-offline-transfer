import type { PlatformCapabilities } from '@picsa/capacitor-offline-transfer';
import { OfflineTransfer, transferState } from '@picsa/capacitor-offline-transfer';
import { signal } from '@preact/signals';

import { logService } from './log.service';

export interface EndpointInfo {
  endpointId: string;
  endpointName: string;
  serviceId?: string;
}

export interface ConnectedEndpoint {
  endpointId: string;
  endpointName: string;
  connectedAt: number;
}

export interface TransferProgress {
  endpointId: string;
  payloadId: string;
  bytesTransferred: number;
  totalBytes: number;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE' | 'CANCELLED';
}

export interface TransferRecord {
  id: string;
  endpointId: string;
  fileName: string;
  totalBytes: number;
  bytesTransferred: number;
  direction: 'sent' | 'received';
  status: string;
  startedAt: number;
  completedAt?: number;
}

export interface Stats {
  totalBytesTransferred: number;
  filesTransferred: number;
  sessionStart: number;
  currentSpeedBps: number;
}

export type ConnectionMode = 'idle' | 'advertising' | 'discovering' | 'connecting' | 'connected' | 'error';

export const endpoints = signal<Record<string, EndpointInfo>>({});
export const connectedEndpoints = signal<Record<string, ConnectedEndpoint>>({});
export const activeTransfers = signal<Record<string, TransferProgress>>({});
export const transferHistory = signal<TransferRecord[]>([]);
export const stats = signal<Stats>({
  totalBytesTransferred: 0,
  filesTransferred: 0,
  sessionStart: Date.now(),
  currentSpeedBps: 0,
});
export const capabilities = signal<PlatformCapabilities | null>(null);
export const connectedEndpointId = signal<string | null>(null);
export const connectionMode = signal<ConnectionMode>('idle');
export const connectionError = signal<string | null>(null);

let _setConnectedEndpointId: (id: string | null) => void = () => {};

export function initPluginState(): () => void {
  transferState.subscribe<Record<string, EndpointInfo>>('endpoints', (v) => {
    endpoints.value = v;
  });
  transferState.subscribe<Record<string, ConnectedEndpoint>>('connectedEndpoints', (v) => {
    connectedEndpoints.value = v;
    const ids = Object.keys(v);
    _setConnectedEndpointId(ids[0] ?? null);
  });
  transferState.subscribe<Record<string, TransferProgress>>('activeTransfers', (v) => {
    activeTransfers.value = v;
  });
  transferState.subscribe<TransferRecord[]>('transferHistory', (v) => {
    transferHistory.value = v;
  });
  transferState.subscribe<Stats>('stats', (v) => {
    stats.value = v;
  });
  transferState.subscribe<PlatformCapabilities | null>('capabilities', (v) => {
    capabilities.value = v;
  });

  _setConnectedEndpointId = (id: string | null) => {
    connectedEndpointId.value = id;
  };

  const unsubEndpointFound = OfflineTransfer.addListener('endpointFound', (ev) => {
    transferState.onEndpointFound(ev);
  });
  const unsubEndpointLost = OfflineTransfer.addListener('endpointLost', (ev) => {
    transferState.onEndpointLost(ev);
    transferState.onDisconnected(ev.endpointId);
  });
  const unsubConnResult = OfflineTransfer.addListener('connectionResult', (ev) => {
    transferState.onConnectionResult(ev);
  });
  const unsubFile = OfflineTransfer.addListener('fileReceived', (ev) => {
    transferState.onFileReceived(ev);
  });
  const unsubProgress = OfflineTransfer.addListener('transferProgress', (ev) => {
    transferState.onTransferProgress(ev);
  });

  const unsubAdvertisingStarted = OfflineTransfer.addListener('advertisingStarted', (ev) => {
    logService.info('Advertising started: ' + ev.status);
  });

  const unsubDiscoveryStarted = OfflineTransfer.addListener('discoveryStarted', (ev) => {
    logService.info('Discovery started: ' + ev.status);
    connectionMode.value = 'discovering';
  });

  const unsubDiscoveryFailed = OfflineTransfer.addListener('discoveryFailed', (ev) => {
    logService.error('Discovery failed: ' + ev.message);
    connectionMode.value = 'error';
    connectionError.value = ev.message;
  });

  return async () => {
    (await unsubEndpointFound).remove();
    (await unsubEndpointLost).remove();
    (await unsubConnResult).remove();
    (await unsubFile).remove();
    (await unsubProgress).remove();
    (await unsubAdvertisingStarted).remove();
    (await unsubDiscoveryStarted).remove();
    (await unsubDiscoveryFailed).remove();
  };
}

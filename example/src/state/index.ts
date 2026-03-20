import type { OfflineTransferPlugin } from '@picsa/capacitor-offline-transfer';
import { signal } from '@preact/signals';

export interface EndpointInfo {
  endpointId: string;
  endpointName: string;
  serviceId?: string;
  url?: string;
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
export const initialized = signal(false);
export const connectedEndpointId = signal<string | null>(null);
export const lanServerRunning = signal(false);
export const lanServerUrl = signal<string>('');

let _setConnectedEndpointId: (id: string | null) => void = () => {};

export function initPluginState(plugin: OfflineTransferPlugin): void {
  const state = plugin.getState();

  state.subscribe<Record<string, EndpointInfo>>('endpoints', (v) => {
    endpoints.value = v;
  });
  state.subscribe<Record<string, ConnectedEndpoint>>('connectedEndpoints', (v) => {
    connectedEndpoints.value = v;
    const ids = Object.keys(v);
    _setConnectedEndpointId(ids[0] ?? null);
  });
  state.subscribe<Record<string, TransferProgress>>('activeTransfers', (v) => {
    activeTransfers.value = v;
  });
  state.subscribe<TransferRecord[]>('transferHistory', (v) => {
    transferHistory.value = v;
  });
  state.subscribe<Stats>('stats', (v) => {
    stats.value = v;
  });

  _setConnectedEndpointId = (id: string | null) => {
    connectedEndpointId.value = id;
  };
}

import type {
  ConnectionResultEvent,
  EndpointFoundEvent,
  EndpointLostEvent,
  FileReceivedEvent,
  TransferProgressEvent,
} from './definitions';

const HISTORY_MAX = 100;

export interface TransferRecord {
  id: string;
  endpointId: string;
  fileName: string;
  totalBytes: number;
  bytesTransferred: number;
  direction: 'sent' | 'received';
  status: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'IN_PROGRESS';
  startedAt: number;
  completedAt?: number;
  speedBps?: number;
}

export interface ConnectedEndpoint {
  endpointId: string;
  endpointName: string;
  connectedAt: number;
}

export interface StatsSnapshot {
  totalBytesTransferred: number;
  filesTransferred: number;
  sessionStart: number;
  currentSpeedBps: number;
}

export type StateKey = 'endpoints' | 'connectedEndpoints' | 'activeTransfers' | 'transferHistory' | 'stats';

type Listener<T> = (value: T) => void;

interface Subscriber {
  key: StateKey;
  listener: Listener<unknown>;
}

export class TransferState {
  private _endpoints: Record<string, EndpointFoundEvent> = {};
  private _connectedEndpoints: Record<string, ConnectedEndpoint> = {};
  private _activeTransfers: Record<string, TransferProgressEvent> = {};
  private _transferHistory: TransferRecord[] = [];
  private _stats: StatsSnapshot = {
    totalBytesTransferred: 0,
    filesTransferred: 0,
    sessionStart: Date.now(),
    currentSpeedBps: 0,
  };

  private _subscribers: Subscriber[] = [];

  private _notify<T>(key: StateKey, value: T): void {
    for (const sub of this._subscribers) {
      if (sub.key === key) {
        sub.listener(value);
      }
    }
  }

  subscribe<T>(key: StateKey, listener: Listener<T>): () => void {
    this._subscribers.push({ key, listener: listener as Listener<unknown> });
    listener(this.getSnapshot(key) as T);
    return () => {
      this._subscribers = this._subscribers.filter((s) => s.listener !== listener);
    };
  }

  getSnapshot(key: StateKey): unknown {
    switch (key) {
      case 'endpoints':
        return { ...this._endpoints };
      case 'connectedEndpoints':
        return { ...this._connectedEndpoints };
      case 'activeTransfers':
        return { ...this._activeTransfers };
      case 'transferHistory':
        return [...this._transferHistory];
      case 'stats':
        return { ...this._stats };
    }
  }

  reset(): void {
    this._endpoints = {};
    this._connectedEndpoints = {};
    this._activeTransfers = {};
    this._transferHistory = [];
    this._stats = { totalBytesTransferred: 0, filesTransferred: 0, sessionStart: Date.now(), currentSpeedBps: 0 };
    this._notifyAll();
  }

  private _notifyAll(): void {
    this._notify('endpoints', this.getSnapshot('endpoints'));
    this._notify('connectedEndpoints', this.getSnapshot('connectedEndpoints'));
    this._notify('activeTransfers', this.getSnapshot('activeTransfers'));
    this._notify('transferHistory', this.getSnapshot('transferHistory'));
    this._notify('stats', this.getSnapshot('stats'));
  }

  onEndpointFound(event: EndpointFoundEvent): void {
    this._endpoints[event.endpointId] = event;
    this._notify('endpoints', this.getSnapshot('endpoints'));
  }

  onEndpointLost(event: EndpointLostEvent): void {
    delete this._endpoints[event.endpointId];
    this._notify('endpoints', this.getSnapshot('endpoints'));
  }

  onConnectionResult(event: ConnectionResultEvent): void {
    if (event.status === 'SUCCESS') {
      const endpoint = this._endpoints[event.endpointId];
      this._connectedEndpoints[event.endpointId] = {
        endpointId: event.endpointId,
        endpointName: endpoint?.endpointName ?? event.endpointId,
        connectedAt: Date.now(),
      };
    } else {
      delete this._connectedEndpoints[event.endpointId];
    }
    this._notify('connectedEndpoints', this.getSnapshot('connectedEndpoints'));
  }

  onDisconnected(endpointId: string): void {
    delete this._connectedEndpoints[endpointId];
    this._notify('connectedEndpoints', this.getSnapshot('connectedEndpoints'));
  }

  onTransferProgress(event: TransferProgressEvent): void {
    if (event.status === 'IN_PROGRESS') {
      this._activeTransfers[event.payloadId] = event;
    } else {
      delete this._activeTransfers[event.payloadId];
      this._handleTransferEnd(event);
    }
    this._notify('activeTransfers', this.getSnapshot('activeTransfers'));
  }

  onFileReceived(event: FileReceivedEvent): void {
    const existing = this._transferHistory.find((r) => r.id === event.payloadId);
    if (!existing) {
      const record: TransferRecord = {
        id: event.payloadId,
        endpointId: event.endpointId,
        fileName: event.fileName,
        totalBytes: 0,
        bytesTransferred: 0,
        direction: 'received',
        status: 'SUCCESS',
        startedAt: Date.now(),
        completedAt: Date.now(),
      };
      this._pushHistory(record);
    }
  }

  private _handleTransferEnd(event: TransferProgressEvent): void {
    const existing = this._transferHistory.find((r) => r.id === event.payloadId);
    if (existing) {
      existing.status = event.status;
      existing.completedAt = Date.now();
      existing.bytesTransferred = event.bytesTransferred;
      existing.totalBytes = event.totalBytes;
    } else {
      const record: TransferRecord = {
        id: event.payloadId,
        endpointId: event.endpointId,
        fileName: 'unknown',
        totalBytes: event.totalBytes,
        bytesTransferred: event.bytesTransferred,
        direction: 'sent',
        status: event.status,
        startedAt: Date.now(),
        completedAt: Date.now(),
      };
      this._pushHistory(record);
    }

    if (event.status === 'SUCCESS') {
      this._stats.totalBytesTransferred += event.bytesTransferred;
      this._stats.filesTransferred += 1;
    }

    this._notify('transferHistory', this.getSnapshot('transferHistory'));
    this._notify('stats', this.getSnapshot('stats'));
  }

  private _pushHistory(record: TransferRecord): void {
    this._transferHistory.unshift(record);
    if (this._transferHistory.length > HISTORY_MAX) {
      this._transferHistory = this._transferHistory.slice(0, HISTORY_MAX);
    }
  }
}

export const transferState = new TransferState();

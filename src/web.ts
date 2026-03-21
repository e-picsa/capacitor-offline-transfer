import { WebPlugin } from '@capacitor/core';

import type { OfflineTransferPlugin, PermissionStatus, PlatformCapabilities } from './definitions';
import type { TransferState } from './reactive-state';
import { transferState } from './reactive-state';

const WEB_CAPABILITIES: PlatformCapabilities = {
  platform: 'web',
  transferMethod: 'none',
  supportsNearby: false,
  isEmulator: false,
  reason: 'Web not supported',
};

export class OfflineTransferWeb extends WebPlugin implements OfflineTransferPlugin {
  private initialized = false;

  async initialize(_options: { serviceId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
    this.initialized = true;
    transferState.onCapabilitiesDetected(WEB_CAPABILITIES);
  }

  async checkCapabilities(): Promise<PlatformCapabilities> {
    return WEB_CAPABILITIES;
  }

  async startAdvertising(_options: { displayName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async stopAdvertising(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async startDiscovery(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async stopDiscovery(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async connect(_options: { endpointId: string; displayName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async acceptConnection(_options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async rejectConnection(_options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async disconnectFromEndpoint(_options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async disconnect(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async sendMessage(_options: { endpointId: string; data: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async sendFile(_options: { endpointId: string; filePath: string; fileName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async setLogLevel(_options: { logLevel: number }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  addListener(eventName: string, listenerFunc: (...args: any[]) => any): any {
    if (!this.initialized) {
      this.setupEventBridge();
      this.initialized = true;
    }
    return super.addListener(eventName, listenerFunc);
  }

  private setupEventBridge(): void {
    const bridge = (window as any).__capacitorOfflineTransferBridge;
    if (!bridge) return;

    bridge.onEndpointFound = (event: any) => transferState.onEndpointFound(event);
    bridge.onEndpointLost = (event: any) => transferState.onEndpointLost(event);
    bridge.onConnectionResult = (event: any) => transferState.onConnectionResult(event);
    bridge.onDisconnected = (endpointId: string) => transferState.onDisconnected(endpointId);
    bridge.onTransferProgress = (event: any) => transferState.onTransferProgress(event);
    bridge.onFileReceived = (event: any) => transferState.onFileReceived(event);
    if (bridge.onCapabilitiesDetected) {
      bridge.onCapabilitiesDetected(WEB_CAPABILITIES);
    }
  }

  async checkPermissions(): Promise<PermissionStatus> {
    return { nearby: 'granted' };
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return { nearby: 'granted' };
  }

  async removeAllListeners(): Promise<void> {
    return super.removeAllListeners();
  }

  getState(): TransferState {
    return transferState;
  }

  async syncFromPlugin(): Promise<void> {
    const listener = new Promise<any>((resolve) => {
      this.addListener('stateSynced', (data) => resolve(data));
    });
    (this as any).bridge.call('syncFromPlugin');
    const snapshot = await listener;
    transferState.syncFromSnapshot(snapshot);
  }
}

import { WebPlugin } from '@capacitor/core';

import type { OfflineTransferPlugin, PermissionStatus } from './definitions';
import type { TransferState } from './reactive-state';
import { transferState } from './reactive-state';

export class OfflineTransferWeb extends WebPlugin implements OfflineTransferPlugin {
  private initialized = false;

  async initialize(_options: { serviceId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
    this.initialized = true;
  }

  async setStrategy(_options: { strategy: 'P2P_STAR' | 'P2P_CLUSTER' | 'P2P_POINT_TO_POINT' }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
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

  async connectByAddress(_options: { url: string; displayName?: string }): Promise<void> {
    console.warn('OfflineTransfer: connectByAddress is not available on web');
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

  async startLanServer(_options: { port?: number }): Promise<{ port: number; url: string }> {
    console.warn('OfflineTransfer: LAN server is not available on web');
    return Promise.reject('LAN server is not available on web');
  }

  async stopLanServer(): Promise<void> {
    console.warn('OfflineTransfer: LAN server is not available on web');
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
}

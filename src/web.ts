import { WebPlugin } from '@capacitor/core';

import type {
  OfflineTransferPlugin,
  HotspotInfo,
  PermissionStatus
} from './definitions';

export class OfflineTransferWeb
  extends WebPlugin
  implements OfflineTransferPlugin
{
  async initialize(options: { serviceId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async setStrategy(options: { strategy: 'P2P_STAR' | 'P2P_CLUSTER' | 'P2P_POINT_TO_POINT' }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async startAdvertising(options: { displayName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
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

  async connect(options: { endpointId: string, displayName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async acceptConnection(options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async rejectConnection(options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async disconnectFromEndpoint(options: { endpointId: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async disconnect(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async sendMessage(options: { endpointId: string, data: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async sendFile(options: { endpointId: string, filePath: string, fileName: string }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  async startLocalHotspot(): Promise<HotspotInfo> {
    console.warn('OfflineTransfer: Web implementation not available');
    return Promise.reject('Local Hotspot not available on web');
  }

  async stopLocalHotspot(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async startServer(options: { port?: number }): Promise<{ port: number, url: string }> {
    console.warn('OfflineTransfer: Web implementation not available', options);
    return Promise.reject('Embedded server not available on web');
  }

  async stopServer(): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available');
  }

  async setLogLevel(options: { logLevel: number }): Promise<void> {
    console.warn('OfflineTransfer: Web implementation not available', options);
  }

  addListener(eventName: string, listenerFunc: (event: any) => any): any {
    console.warn(`OfflineTransfer: addListener(${eventName}) not supported on web`);
    return super.addListener(eventName, listenerFunc);
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
}



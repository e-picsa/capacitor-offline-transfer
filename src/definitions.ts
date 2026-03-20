/// <reference lib="esnext" />
import type { PermissionState, PluginListenerHandle } from '@capacitor/core';

import type { TransferState } from './reactive-state';

export interface PermissionStatus {
  nearby: PermissionState;
}

export type TransferMethod = 'nearby' | 'lan' | 'none';
export type PlatformType = 'android' | 'ios' | 'web' | 'unknown';

export interface PlatformCapabilities {
  platform: PlatformType;
  transferMethod: TransferMethod;
  supportsNearby: boolean;
  isEmulator: boolean;
  nearbyApiVersion?: string;
  reason?: string;
}

export interface OfflineTransferPlugin {
  /**
   * Initializes the plugin with a unique service identifier.
   *
   * The `serviceId` is used to isolate your app's communication from other apps using this plugin.
   * Only devices using the same `serviceId` will be able to discover and connect to each other.
   *
   * @param options Initialization options
   * @param options.serviceId A unique string (e.g., "my-app-xfer").
   *                          - **iOS Requirement**: Must be 1-15 characters, lowercase ASCII and hyphens only.
   *                          - **iOS Requirement**: Must match the `NSBonjourServices` entry in `Info.plist`.
   *                          - **Android**: Used as the Google Nearby Connections Service ID.
   */
  initialize(options: { serviceId: string }): Promise<void>;

  /**
   * Checks platform capabilities and determines the best available transfer method.
   * Call this after initialization to know what features are available.
   */
  checkCapabilities(): Promise<PlatformCapabilities>;

  /**
   * Starts advertising the device to nearby peers.
   */
  startAdvertising(options: { displayName: string }): Promise<void>;

  /**
   * Stops advertising.
   */
  stopAdvertising(): Promise<void>;

  /**
   * Starts discovery of nearby peers.
   */
  startDiscovery(): Promise<void>;

  /**
   * Stops discovery.
   */
  stopDiscovery(): Promise<void>;

  /**
   * Requests a connection to a discovered endpoint.
   */
  connect(options: { endpointId: string; displayName: string }): Promise<void>;

  /**
   * Accepts an incoming connection request.
   */
  acceptConnection(options: { endpointId: string }): Promise<void>;

  /**
   * Rejects an incoming connection request.
   */
  rejectConnection(options: { endpointId: string }): Promise<void>;

  /**
   * Disconnects from a specific endpoint.
   */
  disconnectFromEndpoint(options: { endpointId: string }): Promise<void>;

  /**
   * Disconnects from all connected endpoints.
   */
  disconnect(): Promise<void>;

  /**
   * Sends a small text message to a connected endpoint.
   */
  sendMessage(options: { endpointId: string; data: string }): Promise<void>;

  /**
   * Sends a large file to a connected endpoint.
   * Uses Payload.Type.FILE (Android) or Resource URLs (iOS) to avoid OOM.
   * @param options.filePath The local path or URL to the file.
   */
  sendFile(options: { endpointId: string; filePath: string; fileName: string }): Promise<void>;

  /**
   * Sets the logging level.
   * @param options.logLevel (0=None, 1=Error, 2=Warn, 3=Info, 4=Debug, 5=Verbose)
   */
  setLogLevel(options: { logLevel: number }): Promise<void>;

  /**
   * Event Listeners
   */
  addListener(
    eventName: 'connectionRequested',
    listenerFunc: (event: ConnectionRequestEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'connectionResult',
    listenerFunc: (event: ConnectionResultEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'endpointFound',
    listenerFunc: (event: EndpointFoundEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'endpointLost',
    listenerFunc: (event: EndpointLostEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'messageReceived',
    listenerFunc: (event: MessageReceivedEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'transferProgress',
    listenerFunc: (event: TransferProgressEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  addListener(
    eventName: 'fileReceived',
    listenerFunc: (event: FileReceivedEvent) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  /**
   * Check permission status
   */
  checkPermissions(): Promise<PermissionStatus>;

  /**
   * Request permissions
   */
  requestPermissions(): Promise<PermissionStatus>;

  /**
   * Removes all listeners added by the plugin
   */
  removeAllListeners(): Promise<void>;

  /**
   * Returns the shared reactive state instance for the plugin.
   * Subscribe to state keys to receive updates on connection, transfer, and discovery events.
   */
  getState(): TransferState;
}

export interface ConnectionRequestEvent {
  endpointId: string;
  endpointName: string;
  authenticationToken: string;
  isIncomingConnection: boolean;
}

export interface ConnectionResultEvent {
  endpointId: string;
  status: 'SUCCESS' | 'FAILURE' | 'REJECTED';
}

export interface EndpointFoundEvent {
  endpointId: string;
  endpointName: string;
  serviceId: string;
}

export interface EndpointLostEvent {
  endpointId: string;
}

export interface MessageReceivedEvent {
  endpointId: string;
  data: string;
}

export interface TransferProgressEvent {
  endpointId: string;
  payloadId: string;
  bytesTransferred: number;
  totalBytes: number;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE' | 'CANCELLED';
}

export interface FileReceivedEvent {
  endpointId: string;
  payloadId: string;
  fileName: string;
  path: string;
}

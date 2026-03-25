# @picsa/capacitor-offline-transfer

A bespoke Capacitor plugin designed for **completely offline, cross-device large file sharing** (50MB+ videos and Universal APKs). Engineered specifically for rural environments with zero internet connectivity, this plugin operates as a multi-tier transfer engine to ensure maximum compatibility across device types.

## Architecture

The plugin provides two P2P transfer tiers for devices with the app installed, plus native OS sharing for uninstalled devices:

```mermaid
graph TD
    A[Start Transfer] --> B{Has the app installed?}
    B -- Yes (Android) --> C[Tier 1: Google Nearby Connections]
    B -- Yes (iOS) --> D[Tier 2: Apple Multipeer Connectivity]
    B -- No --> E[Use @capacitor/share<br/>Native Share Sheet<br/>Bluetooth / Nearby Share]

    C --> F[P2P Mesh - High Speed]
    D --> G[P2P Infrastructure - High Speed]
```

### Documentation

- [User Guide](docs/user-guide.md) - Learn how to use several peer-to-peer (P2P) file transfer strategies.
- [Testing Guide](docs/testing.md) - Manual E2E testing instructions and best practices.

### Tier 1: Android-to-Android

Utilizes the **Google Nearby Connections API** (Strategy: `P2P_CLUSTER`). This provides a high-speed, offline mesh network capable of multi-device transfers.

### Tier 2: iOS-to-iOS

Utilizes **Apple's Multipeer Connectivity** framework. Handles discovery and session management natively for seamless Apple-to-Apple transfers.

### Sharing to Uninstalled Devices

For devices that don't have the app installed, use the native share sheet via **[@capacitor/share](https://capacitorjs.com/docs/apis/share)**. This opens the system share dialog, allowing the user to send the APK via Bluetooth, Nearby Share, or any other registered app — without any code in this plugin.

```typescript
import { Share } from '@capacitor/share';

const canShare = await Share.canShare();
if (!canShare.value) return;

await Share.share({
  title: 'Install Picsa App',
  files: ['file:///path/to/app.apk'],
});
```

Android will present Bluetooth, Nearby Share, Wi-Fi Direct, and any other sharing apps registered on the device. The transfer is handled entirely by the OS.

---

## 🛠 Technical Constraints & Performance

This plugin is optimized for low-end devices in rural environments:

- **No In-Memory Buffering**: We never use byte arrays for large files. All transfers use `Payload.Type.FILE` with `ParcelFileDescriptor` (Android) and `sendResource` (iOS) to prevent **Out of Memory (OOM)** crashes.
- **Scoped Storage (Android 11+)**: Respects modern Android security. Downloaded files are saved directly to the app's private `Context.getFilesDir()`, accessible via `Capacitor.convertFileSrc()`.
- **Universal APK Sharing**: Use `@capacitor/share` to send the APK via the native share sheet (Bluetooth, Nearby Share, etc.).

---

## Install

```bash
npm install @picsa/capacitor-offline-transfer
npx cap sync
```

## Basic Usage

### 1. Initialization

```typescript
// serviceId ensures your app only connects to other instances of your app.
// For iOS compatibility: 1-15 chars, lowercase, and hyphens only.
await OfflineTransfer.initialize({ serviceId: 'picsa-transfer' });
```

> [!TIP]
> Choose a unique, short name for your service (e.g., `company-app`). This string will also be used in your iOS `Info.plist` configuration.

### 2. Large File Transfer (OOM-Safe)

```typescript
// Sending a 100MB video
await OfflineTransfer.sendFile({
  endpointId: 'peer-123',
  filePath: 'path/to/video.mp4', // Local file URL
  fileName: 'training_video.mp4',
});
```

## Event Handling

```typescript
// Monitor transfer progress
OfflineTransfer.addListener('transferProgress', (event) => {
  const percentage = (event.bytesTransferred / event.totalBytes) * 100;
  console.log(`Transfer ${event.payloadId}: ${percentage.toFixed(2)}%`);
});

// Handle successful file reception
OfflineTransfer.addListener('fileReceived', (event) => {
  console.log(`File saved to: ${event.path}`);
  // Use Capacitor.convertFileSrc(event.path) to display in WebView
});
```

## Platform Configuration

### Android Configuration

#### Permissions

This plugin automatically includes the required permissions via **Manifest Merging**. You do not need to add them manually to your app's `AndroidManifest.xml`.

The following permissions are requested by the plugin:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
<uses-permission android:maxSdkVersion="30" android:name="android.permission.BLUETOOTH" />
<uses-permission android:maxSdkVersion="30" android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:minSdkVersion="29" android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:minSdkVersion="31" android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:minSdkVersion="31" android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:minSdkVersion="31" android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:minSdkVersion="32" android:name="android.permission.NEARBY_WIFI_DEVICES" />
```

##### Why are these required?

To ensure the transfer engine survives the constraints of rural deployments, many of these permissions are strictly required for backwards compatibility:

- **Location Permissions (`ACCESS_FINE_LOCATION`)**: On Android 11 and below, Bluetooth and Wi-Fi scanning (used by Nearby Connections) are tied to Location services. Without this permission, the API will fail to discover or advertise on older devices.
- **Bluetooth & Wi-Fi Permissions**: Required for Tier 1 (Nearby Connections) and Tier 3 (Local Hotspot) to establish socket connections and manage high-speed data transfers.
- **Nearby WiFi Devices**: Introduced in Android 13 to allow Wi-Fi operations without needing Location access on newer devices.

#### Requesting Permissions

The plugin **automatically requests permissions** when you call `startAdvertising()` or `startDiscovery()`. If the user denies permissions, the call will reject with an error.

If you prefer to check or request permissions explicitly (e.g., at app startup), you can use the built-in methods:

```typescript
import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';

// Optional: Check permission status at startup
const check = await OfflineTransfer.checkPermissions();
if (check.nearby !== 'granted') {
  // Requesting is optional - the plugin will prompt automatically on first use
  await OfflineTransfer.requestPermissions();
}
```

### iOS Configuration

> [!IMPORTANT] **Manual configuration is required** for iOS. Unlike Android, Capacitor cannot automatically modify your `Info.plist`.

Add these to your `Info.plist`:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Required for P2P device discovery</string>
<key>NSLocalNetworkUsageDescription</key>
<string>Required for Multipeer Connectivity data transfer</string>
<key>NSBonjourServices</key>
<array>
  <string>_picsa-transfer._tcp</string>
  <string>_picsa-transfer._udp</string>
</array>
```

---

## Platform Compatibility

| API Method               | Android | iOS | Web |
| ------------------------ | ------- | --- | --- |
| `initialize`             | ✅      | ✅  | -   |
| `checkCapabilities`      | ✅      | ✅  | -   |
| `checkPermissions`       | ✅      | ✅  | -   |
| `requestPermissions`     | ✅      | ✅  | -   |
| `startAdvertising`       | ✅      | ✅  | -   |
| `stopAdvertising`        | ✅      | ✅  | -   |
| `startDiscovery`         | ✅      | ✅  | -   |
| `stopDiscovery`          | ✅      | ✅  | -   |
| `connect`                | ✅      | ✅  | -   |
| `connectByAddress`       | ✅      | ❌  | -   |
| `acceptConnection`       | ✅      | ✅  | -   |
| `rejectConnection`       | ✅      | ✅  | -   |
| `disconnectFromEndpoint` | ✅      | ✅  | -   |
| `disconnect`             | ✅      | ✅  | -   |
| `sendMessage`            | ✅      | ✅  | -   |
| `sendFile`               | ✅      | ✅  | -   |
| `startLanServer`         | ✅      | ❌  | -   |
| `stopLanServer`          | ✅      | ❌  | -   |
| `setLogLevel`            | ✅      | ✅  | -   |
| `getState`               | ✅      | ✅  | -   |
| `syncFromPlugin`         | ✅      | ✅  | -   |

- **✅** = Supported
- **❌** = Not available (rejects with error)
- **-** = Not applicable (Web is not a target platform for this offline plugin)

**LAN Server methods** (`startLanServer`, `stopLanServer`, `connectByAddress`) are Android-only dev tooling and will reject on iOS. For uninstalled devices, use [@capacitor/share](https://capacitorjs.com/docs/apis/share).

---

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`checkCapabilities()`](#checkcapabilities)
* [`startAdvertising(...)`](#startadvertising)
* [`stopAdvertising()`](#stopadvertising)
* [`startDiscovery()`](#startdiscovery)
* [`stopDiscovery()`](#stopdiscovery)
* [`connect(...)`](#connect)
* [`acceptConnection(...)`](#acceptconnection)
* [`rejectConnection(...)`](#rejectconnection)
* [`disconnectFromEndpoint(...)`](#disconnectfromendpoint)
* [`disconnect()`](#disconnect)
* [`sendMessage(...)`](#sendmessage)
* [`sendFile(...)`](#sendfile)
* [`setLogLevel(...)`](#setloglevel)
* [`addListener('connectionRequested', ...)`](#addlistenerconnectionrequested-)
* [`addListener('connectionResult', ...)`](#addlistenerconnectionresult-)
* [`addListener('endpointFound', ...)`](#addlistenerendpointfound-)
* [`addListener('endpointLost', ...)`](#addlistenerendpointlost-)
* [`addListener('messageReceived', ...)`](#addlistenermessagereceived-)
* [`addListener('transferProgress', ...)`](#addlistenertransferprogress-)
* [`addListener('fileReceived', ...)`](#addlistenerfilereceived-)
* [`checkPermissions()`](#checkpermissions)
* [`requestPermissions()`](#requestpermissions)
* [`removeAllListeners()`](#removealllisteners)
* [`getState()`](#getstate)
* [`syncFromPlugin()`](#syncfromplugin)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### initialize(...)

```typescript
initialize(options: { serviceId: string; }) => Promise<void>
```

Initializes the plugin with a unique service identifier.

The `serviceId` is used to isolate your app's communication from other apps using this plugin.
Only devices using the same `serviceId` will be able to discover and connect to each other.

| Param         | Type                                | Description            |
| ------------- | ----------------------------------- | ---------------------- |
| **`options`** | <code>{ serviceId: string; }</code> | Initialization options |

--------------------


### checkCapabilities()

```typescript
checkCapabilities() => Promise<PlatformCapabilities>
```

Checks platform capabilities and determines the best available transfer method.
Call this after initialization to know what features are available.

**Returns:** <code>Promise&lt;<a href="#platformcapabilities">PlatformCapabilities</a>&gt;</code>

--------------------


### startAdvertising(...)

```typescript
startAdvertising(options: { displayName: string; }) => Promise<void>
```

Starts advertising the device to nearby peers.

| Param         | Type                                  |
| ------------- | ------------------------------------- |
| **`options`** | <code>{ displayName: string; }</code> |

--------------------


### stopAdvertising()

```typescript
stopAdvertising() => Promise<void>
```

Stops advertising.

--------------------


### startDiscovery()

```typescript
startDiscovery() => Promise<void>
```

Starts discovery of nearby peers.

--------------------


### stopDiscovery()

```typescript
stopDiscovery() => Promise<void>
```

Stops discovery.

--------------------


### connect(...)

```typescript
connect(options: { endpointId: string; displayName: string; }) => Promise<void>
```

Requests a connection to a discovered endpoint.

| Param         | Type                                                      |
| ------------- | --------------------------------------------------------- |
| **`options`** | <code>{ endpointId: string; displayName: string; }</code> |

--------------------


### acceptConnection(...)

```typescript
acceptConnection(options: { endpointId: string; }) => Promise<void>
```

Accepts an incoming connection request.

| Param         | Type                                 |
| ------------- | ------------------------------------ |
| **`options`** | <code>{ endpointId: string; }</code> |

--------------------


### rejectConnection(...)

```typescript
rejectConnection(options: { endpointId: string; }) => Promise<void>
```

Rejects an incoming connection request.

| Param         | Type                                 |
| ------------- | ------------------------------------ |
| **`options`** | <code>{ endpointId: string; }</code> |

--------------------


### disconnectFromEndpoint(...)

```typescript
disconnectFromEndpoint(options: { endpointId: string; }) => Promise<void>
```

Disconnects from a specific endpoint.

| Param         | Type                                 |
| ------------- | ------------------------------------ |
| **`options`** | <code>{ endpointId: string; }</code> |

--------------------


### disconnect()

```typescript
disconnect() => Promise<void>
```

Disconnects from all connected endpoints.

--------------------


### sendMessage(...)

```typescript
sendMessage(options: { endpointId: string; data: string; }) => Promise<void>
```

Sends a small text message to a connected endpoint.

| Param         | Type                                               |
| ------------- | -------------------------------------------------- |
| **`options`** | <code>{ endpointId: string; data: string; }</code> |

--------------------


### sendFile(...)

```typescript
sendFile(options: { endpointId: string; filePath: string; fileName: string; }) => Promise<void>
```

Sends a large file to a connected endpoint.
Uses Payload.Type.FILE (Android) or Resource URLs (iOS) to avoid OOM.

| Param         | Type                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| **`options`** | <code>{ endpointId: string; filePath: string; fileName: string; }</code> |

--------------------


### setLogLevel(...)

```typescript
setLogLevel(options: { logLevel: number; }) => Promise<void>
```

Sets the logging level.

| Param         | Type                               |
| ------------- | ---------------------------------- |
| **`options`** | <code>{ logLevel: number; }</code> |

--------------------


### addListener('connectionRequested', ...)

```typescript
addListener(eventName: 'connectionRequested', listenerFunc: (event: ConnectionRequestEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

Event Listeners

| Param              | Type                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'connectionRequested'</code>                                                            |
| **`listenerFunc`** | <code>(event: <a href="#connectionrequestevent">ConnectionRequestEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('connectionResult', ...)

```typescript
addListener(eventName: 'connectionResult', listenerFunc: (event: ConnectionResultEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'connectionResult'</code>                                                             |
| **`listenerFunc`** | <code>(event: <a href="#connectionresultevent">ConnectionResultEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('endpointFound', ...)

```typescript
addListener(eventName: 'endpointFound', listenerFunc: (event: EndpointFoundEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'endpointFound'</code>                                                          |
| **`listenerFunc`** | <code>(event: <a href="#endpointfoundevent">EndpointFoundEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('endpointLost', ...)

```typescript
addListener(eventName: 'endpointLost', listenerFunc: (event: EndpointLostEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'endpointLost'</code>                                                         |
| **`listenerFunc`** | <code>(event: <a href="#endpointlostevent">EndpointLostEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('messageReceived', ...)

```typescript
addListener(eventName: 'messageReceived', listenerFunc: (event: MessageReceivedEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'messageReceived'</code>                                                            |
| **`listenerFunc`** | <code>(event: <a href="#messagereceivedevent">MessageReceivedEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('transferProgress', ...)

```typescript
addListener(eventName: 'transferProgress', listenerFunc: (event: TransferProgressEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'transferProgress'</code>                                                             |
| **`listenerFunc`** | <code>(event: <a href="#transferprogressevent">TransferProgressEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### addListener('fileReceived', ...)

```typescript
addListener(eventName: 'fileReceived', listenerFunc: (event: FileReceivedEvent) => void) => Promise<PluginListenerHandle> & PluginListenerHandle
```

| Param              | Type                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| **`eventName`**    | <code>'fileReceived'</code>                                                         |
| **`listenerFunc`** | <code>(event: <a href="#filereceivedevent">FileReceivedEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt; & <a href="#pluginlistenerhandle">PluginListenerHandle</a></code>

--------------------


### checkPermissions()

```typescript
checkPermissions() => Promise<PermissionStatus>
```

Check permission status

**Returns:** <code>Promise&lt;<a href="#permissionstatus">PermissionStatus</a>&gt;</code>

--------------------


### requestPermissions()

```typescript
requestPermissions() => Promise<PermissionStatus>
```

Request permissions

**Returns:** <code>Promise&lt;<a href="#permissionstatus">PermissionStatus</a>&gt;</code>

--------------------


### removeAllListeners()

```typescript
removeAllListeners() => Promise<void>
```

Removes all listeners added by the plugin

--------------------


### getState()

```typescript
getState() => TransferState
```

Returns the shared reactive state instance for the plugin.
Subscribe to state keys to receive updates on connection, transfer, and discovery events.

**Returns:** <code>TransferState</code>

--------------------


### syncFromPlugin()

```typescript
syncFromPlugin() => Promise<TransferStateSnapshot>
```

Syncs the reactive state from the native plugin's current snapshot.
Call this after initialization to populate the reactive store with native state.
Returns the state snapshot directly in the resolved promise.

**Returns:** <code>Promise&lt;<a href="#transferstatesnapshot">TransferStateSnapshot</a>&gt;</code>

--------------------


### Interfaces


#### PlatformCapabilities

| Prop                 | Type                                                      |
| -------------------- | --------------------------------------------------------- |
| **`platform`**       | <code><a href="#platformtype">PlatformType</a></code>     |
| **`transferMethod`** | <code><a href="#transfermethod">TransferMethod</a></code> |
| **`supportsNearby`** | <code>boolean</code>                                      |
| **`isEmulator`**     | <code>boolean</code>                                      |
| **`reason`**         | <code>string</code>                                       |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### ConnectionRequestEvent

| Prop                       | Type                 |
| -------------------------- | -------------------- |
| **`endpointId`**           | <code>string</code>  |
| **`endpointName`**         | <code>string</code>  |
| **`authenticationToken`**  | <code>string</code>  |
| **`isIncomingConnection`** | <code>boolean</code> |


#### ConnectionResultEvent

| Prop             | Type                                              |
| ---------------- | ------------------------------------------------- |
| **`endpointId`** | <code>string</code>                               |
| **`status`**     | <code>'SUCCESS' \| 'FAILURE' \| 'REJECTED'</code> |


#### EndpointFoundEvent

| Prop               | Type                |
| ------------------ | ------------------- |
| **`endpointId`**   | <code>string</code> |
| **`endpointName`** | <code>string</code> |
| **`serviceId`**    | <code>string</code> |


#### EndpointLostEvent

| Prop             | Type                |
| ---------------- | ------------------- |
| **`endpointId`** | <code>string</code> |


#### MessageReceivedEvent

| Prop             | Type                |
| ---------------- | ------------------- |
| **`endpointId`** | <code>string</code> |
| **`data`**       | <code>string</code> |


#### TransferProgressEvent

| Prop                   | Type                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| **`endpointId`**       | <code>string</code>                                                 |
| **`payloadId`**        | <code>string</code>                                                 |
| **`bytesTransferred`** | <code>number</code>                                                 |
| **`totalBytes`**       | <code>number</code>                                                 |
| **`status`**           | <code>'SUCCESS' \| 'FAILURE' \| 'CANCELLED' \| 'IN_PROGRESS'</code> |


#### FileReceivedEvent

| Prop             | Type                |
| ---------------- | ------------------- |
| **`endpointId`** | <code>string</code> |
| **`payloadId`**  | <code>string</code> |
| **`fileName`**   | <code>string</code> |
| **`path`**       | <code>string</code> |


#### PermissionStatus

| Prop         | Type                                                        |
| ------------ | ----------------------------------------------------------- |
| **`nearby`** | <code><a href="#permissionstate">PermissionState</a></code> |


#### TransferStateSnapshot

| Prop                     | Type                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **`endpoints`**          | <code><a href="#record">Record</a>&lt;string, <a href="#endpointfoundevent">EndpointFoundEvent</a>&gt;</code>       |
| **`connectedEndpoints`** | <code><a href="#record">Record</a>&lt;string, <a href="#connectedendpoint">ConnectedEndpoint</a>&gt;</code>         |
| **`activeTransfers`**    | <code><a href="#record">Record</a>&lt;string, <a href="#transferprogressevent">TransferProgressEvent</a>&gt;</code> |
| **`transferHistory`**    | <code>TransferRecord[]</code>                                                                                       |
| **`stats`**              | <code><a href="#statssnapshot">StatsSnapshot</a></code>                                                             |


#### ConnectedEndpoint

| Prop               | Type                |
| ------------------ | ------------------- |
| **`endpointId`**   | <code>string</code> |
| **`endpointName`** | <code>string</code> |
| **`connectedAt`**  | <code>number</code> |


#### TransferRecord

| Prop                   | Type                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| **`id`**               | <code>string</code>                                                 |
| **`endpointId`**       | <code>string</code>                                                 |
| **`fileName`**         | <code>string</code>                                                 |
| **`totalBytes`**       | <code>number</code>                                                 |
| **`bytesTransferred`** | <code>number</code>                                                 |
| **`direction`**        | <code>'sent' \| 'received'</code>                                   |
| **`status`**           | <code>'SUCCESS' \| 'FAILURE' \| 'CANCELLED' \| 'IN_PROGRESS'</code> |
| **`startedAt`**        | <code>number</code>                                                 |
| **`completedAt`**      | <code>number</code>                                                 |
| **`speedBps`**         | <code>number</code>                                                 |


#### StatsSnapshot

| Prop                        | Type                |
| --------------------------- | ------------------- |
| **`totalBytesTransferred`** | <code>number</code> |
| **`filesTransferred`**      | <code>number</code> |
| **`sessionStart`**          | <code>number</code> |
| **`currentSpeedBps`**       | <code>number</code> |


### Type Aliases


#### PlatformType

<code>'android' | 'ios' | 'web' | 'unknown'</code>


#### TransferMethod

<code>'nearby' | 'lan' | 'none'</code>


#### PermissionState

<code>'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'</code>


#### Record

Construct a type with a set of properties K of type T

<code>{ [P in K]: T; }</code>

</docgen-api>

### Why is `serviceId` required?

The `serviceId` acts as a **namespace** for your offline network. It ensures that your application doesn't accidentally discover or connect to other unrelated apps that might also be using this plugin nearby.

Only devices that initialize with the **exact same string** will be able to see each other.

### ⚠️ iOS Configuration Rules

On iOS, this string is used as the Multipeer Connectivity `serviceType`, which has strict system requirements:

1.  **Strict Format**: Must be **1-15 characters** long, containing only **lowercase ASCII letters**, **numbers**, and **hyphens** (`-`).
2.  **Info.plist Match**: You must add this service to your `Info.plist` under `NSBonjourServices` with `._tcp` and `._udp` suffixes.

**Example Configuration:**

If you choose `serviceId: 'my-app-xfer'`:

**In TypeScript:**

```typescript
await OfflineTransfer.initialize({ serviceId: 'my-app-xfer' });
```

**In Info.plist:** Add your serviceId with `._tcp` and `._udp` suffixes to NSBonjourServices:

```xml
<key>NSBonjourServices</key>
<array>
  <string>_my-app-xfer._tcp</string>
  <string>_my-app-xfer._udp</string>
</array>
```

The underscore prefix is required as per Bonjour service naming conventions.

Failure to match these exactly will result in discovery failing or the app crashing on iOS.

---

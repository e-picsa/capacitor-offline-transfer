# Manual E2E Testing Guide

Since this plugin facilitates peer-to-peer file transfers, full end-to-end (E2E) testing requires at least two devices. Automated tests with mocks cover core logic, but manual validation is recommended for specific network conditions.

## 1. Two Physical Devices (Recommended)

This is the most reliable way to test all Tiers of discovery and transfer.

- **Set up both devices**:
  - Install the `example` app on both.
  - Ensure Wi-Fi and Bluetooth are enabled on both.

### API Transfer Workflow:

1. **Configure Strategy**: First, configure the underlying network topology on both devices by calling `setStrategy` (e.g., `OfflineTransfer.setStrategy({ strategy: 'P2P_CLUSTER' })`). Supported standard strategies are `P2P_CLUSTER`, `P2P_STAR`, or `P2P_POINT_TO_POINT`.
2. **Setup Host/Advertiser**: One device starts the advertising process by calling `OfflineTransfer.startAdvertising({ displayName: 'Device A' })`.
3. **Setup Client/Discoverer**: The other device starts listening by calling `OfflineTransfer.startDiscovery()`.
4. **Discover and Connect**:
   - Once the host is found, the client receives an `endpointFound` event.
   - The client then explicitly attempts a connection using `OfflineTransfer.connect({ endpointId: '<id>', displayName: 'Device B' })`.
5. **Accept Connection**:
   - The host receives a `connectionRequested` event with the client's information.
   - The host finalizes the connection by calling `OfflineTransfer.acceptConnection({ endpointId: '<id>' })`.
6. **Data Transfer**: After both devices emit a `connectionResult` indicating success, they can exchange messages (`sendMessage`) and files (`sendFile`) using the established `endpointId`.

## 2. Two Android Emulators

Since the Android Emulator does not support real Bluetooth or Wi-Fi Direct hardware, standard P2P discovery will not work between two emulators. **Note:** Standard strategies (`P2P_CLUSTER`, `P2P_STAR`, `P2P_POINT_TO_POINT`) require physical radios and cannot be used here.

Instead, emulator communication utilizes a manual connection over the "Tier 3" HTTP bridge, bypassing the Nearby Connections API entirely. You can test the plugin's data transfer and messaging events by creating a TCP bridge.

### Steps:

1. Identify Emulator IDs

List your running emulators:

```bash
adb devices
```

Expected output:

```bash
emulator-5554   device
emulator-5556   device
```

2. Setup TCP Bridge

Assuming `5554` is the Client and `5556` is the Server:

```bash
# On the host machine
adb -s emulator-5554 forward tcp:8080 tcp:8080
adb -s emulator-5556 reverse tcp:8080 tcp:8080
```

This maps `localhost:8080` on the Client emulator to `localhost:8080` on the Server emulator.

3. Transfer Flow (Using Example App UI)

The example app provides a specialized mode for emulators that simplifies this process.

**Server (Emulator 5556)**:

- Select **Emulator (HTTP Server Bridge)** in the **P2P Strategy** dropdown.
- Tap **Initialize**.
- In the **Step A: Host Emulator** section, tap **Start Server**.

**Client (Emulator 5554)**:

- Select **Emulator (HTTP Server Bridge)** in the **P2P Strategy** dropdown.
- Tap **Initialize**.
- In the **Step B: Client Emulator** section, ensure the URL is `http://localhost:8080` (must match your `adb forward` port).
- Tap **Manual Connect**.

The emulators will now behave as if they connected naturally. Both sides can use the server's URL as the `endpointId` to exchange files (`sendFile`) and messages (`sendMessage`).

**Note for Developers:** Behind the scenes, the example app bypasses the Nearby `setStrategy` call and directly uses `startServer` and `connectByAddress`. `connectByAddress` automatically simulates the `endpointFound` and `connectionResult` events on the client side to keep the state machine consistent.

## 2b. Physical Android Device via Dev Script

The `scripts/dev.ts` development script supports deploying to physical Android devices via USB or wireless debugging.

### Prerequisites

1. **Enable Developer Options** on your Android device:
   - Go to **Settings > About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings > Developer Options**

2. **Enable USB Debugging** (for USB connection):
   - In Developer Options, enable **USB Debugging**
   - Connect your device via USB
   - Accept the USB debugging authorization prompt on your device

3. **Enable Wireless Debugging** (for wireless connection):
   - In Developer Options, enable **Wireless Debugging**
   - Note the IP address and port (e.g., `192.168.1.100:5555`)
   - For first-time pairing, you'll need the pairing code

### Using the Dev Script

Run the development script:

```bash
bun run start android
```

The script will detect connected devices and prompt you to select:

```
📱 Available devices:
  [0]  Connect new physical device...
  [1]  emulator-5554 (Pixel 6 API 34)        [emulator]
  [2]  RF8N20XXXXX (Pixel 8)                [USB]
  [3]  192.168.1.100:5555 (Pixel 7 Pro)     [wireless]

⚡ Select devices (e.g. "1,2" or "all"):
```

- **Select [0]** to pair a new wireless device — the script will guide you through the pairing process
- **Select by number** (e.g., `1,2`) to deploy to specific devices
- **Select `all`** or `*` to deploy to all available devices

### Live-Reload

- **USB devices**: Uses `adb forward` to enable live-reload
- **Wireless devices**: Uses your device's IP address for live-reload (device must be on the same network)
- **Emulators**: Uses `adb reverse`

### Key Commands

During development, you can press:

- `r` — Force rebuild and redeploy
- `i` — Reinstall app (no rebuild)
- `c` — Cold-reboot emulators
- `p` — Pair a new wireless device
- `a` — Open Android Studio
- `q` — Quit

### Environment Variables

You can pre-configure devices in `example/.env`:

```bash
# Comma-separated list of device serials to auto-select
ANDROID_DEVICES=emulator-5554,RF8N20XXXXX

# Or specify emulators only
EMULATOR_AVDS=Pixel_6_API_34,Pixel_7_API_35
```

## 3. iOS + Mac (via Catalyst)

If you have a Mac, you can test Multipeer Connectivity between an iPhone/iPad and the Mac running the app via Mac Catalyst.

- **Requirements**:
  - Mac and iPhone on the same Wi-Fi network.
  - Apple's Multipeer Connectivity works natively on macOS as long as permissions are granted.
- **Workflow**:
  - Run the `example` app target in Xcode on the iPhone.
  - Run the same app target as "My Mac (Mac Catalyst)".
  - One device advertises, the other discovers.

## 4. Cross-Platform Limitations

- **Android <-> iOS (Tier 1)**: Native, high-performance P2P usually **does not work** directly between Android and iOS via custom apps. This is because Apple's _Multipeer Connectivity_ (AWDL) and Google's _Nearby Connections_ (Wi-Fi Direct) use different underlying link-layer protocols.
- **Recent Updates (Late 2025)**: Google's system-level **Quick Share** (on Android) has implemented AWDL support to allow sending/receiving directly with Apple's **AirDrop**.
  - **Status**: This is currently a _system-level_ feature of Google Play Services and is **not yet exposed** as a public API for third-party developers in the Nearby Connections SDK.
  - **Workaround**: You can use the standard Android/iOS "Share Sheet" to trigger these system-level transfers, but they will not be integrated into this plugin's P2P stream.
- **Tier 3 Fallback**: This remains the recommended way for cross-platform sharing within your app:
  - Start the "Local Hotspot" (Android only) and "HTTP Server".
  - Use the other device (iOS or another Android) to connect to the hotspot (SSID/Password provided).
  - Open the provided URL in the other device's browser to download the file directly.

# Manual E2E Testing Guide

Since this plugin facilitates peer-to-peer file transfers, full end-to-end (E2E) testing requires at least two devices. Automated tests with mocks cover core logic, but manual validation is recommended for specific network conditions.

## 1. Two Physical Devices (Recommended)

This is the most reliable way to test all Tiers of discovery and transfer.

- **Set up both devices**:
  - Install the `example` app on both.
  - Ensure Wi-Fi and Bluetooth are enabled on both.
- **Workflow**:
  - One device starts "Advertising".
  - The other device starts "Discovery".
  - Once discovered, the discovering device "Connects".
  - The advertiser "Accepts" the connection.
  - Send messages or files between them.

## 2. Two Android Emulators

Since the Android Emulator does not support real Bluetooth or Wi-Fi Direct hardware, the standard P2P discovery will not work between two emulators. However, you can test the plugin by creating a TCP bridge.

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
adb -s emulator-5554 forward tcp:1234 tcp:1234
adb -s emulator-5556 reverse tcp:1234 tcp:1234
```

This maps `localhost:1234` on the Client emulator to `localhost:1234` on the Server emulator.

3. Transfer Flow

**Server (Emulator 5556)**:

- Tap **Initialize**.
- Tap **Start Server** (default port 8080).

**Client (Emulator 5554)**:

- Tap **Initialize**.
- In the **Manual Server URL** field, enter `http://localhost:8080` (or whatever port the server used).
- Tap **Manual Connect**.

The emulators will now behave as if they discovered each other via P2P. You can send messages and files via the standard UI.

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

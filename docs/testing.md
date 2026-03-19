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

## 2. Android Emulator Bridge (TCP Bridge)

You can test discovery between two Android emulators on the same machine using `adb forward` and `adb reverse` if nearby connections support local networking.

### Steps:
1. Launch two emulators (A and B).
2. For Nearby Connections to work, they must "see" each other. Often, standard emulators are on an isolated network. 
3. You can try setting up a specific bridge using:
   ```bash
   adb -s <EMULATOR_A_ID> forward tcp:1234 tcp:1234
   adb -s <EMULATOR_B_ID> reverse tcp:1234 tcp:1234
   ```
   **Note**: This is not a perfect simulation of Bluetooth/Wi-Fi Direct, but it can help test the higher-level logic if the plugin uses local IP discovery as a fallback.

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

- **Android <-> iOS**: High-performance Native P2P (Tier 1) usually **does not work** between Android and iOS due to proprietary protocols (Nearby vs Multipeer). 
- **Tier 3 Fallback**: Use this for cross-platform sharing.
  - Start the "Local Hotspot" (Android only) and "HTTP Server".
  - Use the other device (iOS or another Android) to connect to the hotspot (SSID/Password provided).
  - Open the provided URL in the other device's browser to download the file directly.

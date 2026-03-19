# User Guide: Capacitor Offline Transfer

Learn how to use several peer-to-peer (P2P) file transfer strategies in your Capacitor app.

## The Tiered Strategy

This plugin uses a layered approach to ensure transfers work in diverse network situations.

### Tier 1: High Performance (App-to-App)
Uses native SDKs (**Android Nearby Connections** and **iOS Multipeer Connectivity**) for the fastest possible local transfer.
- **Best for**: Two people who both have your app installed.
- **Features**: Fast discovery, high bandwidth, Bluetooth/Wi-Fi Direct.
- **Platform support**: Works within each OS family (Android to Android, iOS to iOS).

### Tier 2: Enhanced Compatibility (App-to-App fallback)
Automatically handled by native SDKs when Tier 1 fails, often using an ad-hoc Wi-Fi network or a temporary hotspot.
- **Benefit**: Works even if a shared Wi-Fi network is not available.

### Tier 3: Universal Sharing (App-to-Device / App-to-Browser)
When the other person **doesn't** have your app installed. 
- **Android**: Can start a "Local Hotspot" and an "Embedded HTTP Server".
- **Usage**:
  - The sender with the app starts the hotspot.
  - The receiver connects their device to this hotspot (SSID/Password provided).
  - The receiver scans a QR code or enters a URL in their browser to download the file directly from the app's internal server.
- **Benefit**: Zero installation required for the receiver.

## Scenario Examples

### 1. Sharing Photos with a Friend (Both have the APP)
1. **Alice** (Sender) taps "Start Advertising".
2. **Bob** (Receiver) taps "Start Discovery".
3. Bob sees "Alice's Phone" on his screen and taps "Connect".
4. Alice "Accepts" the connection on her phone.
5. Alice selects a few photos and taps "Send".
6. Bob sees the progress bar and the photos appear in his gallery.

### 2. Sending a Large PDF to a Stranger's Laptop (No APP installed)
1. **Alice** (Sender) taps "Start Local Hotspot" within the app.
2. The app displays a Wi-Fi SSID ("Direct-XX-Alice") and a Password.
3. Alice also taps "Start Server" to host the PDF.
4. **Steve** (Receiver) connects his laptop to Alice's phone Wi-Fi via standard Wi-Fi menu.
5. Alice shows Steve a QR code on her screen.
6. Steve scans the QR code, which opens `http://192.168.43.1:8080/my-doc.pdf` in his browser.
7. The download begins immediately.

## Best Practices

- **Permissions**: Always check and request permissions before starting advertising or discovery.
- **Service ID**: Use a unique `serviceId` during initialization to avoid interference from other apps on the same network.
- **Connection Lifecycle**: Always call `disconnect()` when finished to save battery and free up network resources.
- **Large Files**: For files larger than a few megabytes, always use the `sendFile` API rather than `sendMessage` to avoid memory issues and ensure progress tracking.

# AI Agent Guidelines

Welcome, agent! This project is a Capacitor plugin for offline, large file transfers using Android Nearby Connections and iOS Multipeer Connectivity.

## 🛠 Preferred Tooling

> [!IMPORTANT]
> **Bun is the mandatory tool for this repository.** 
> Use `bun` for all package management, script execution, and workspace operations. Avoid `npm` or `yarn` unless explicitly required by a specific native tool (like `npx cap`).

### Key Commands
- `bun install`: Installs dependencies for the root and the `example` workspace.
- `bun run build`: Builds the plugin (Web/TS) and runs documentation generation.
- `bun run watch`: Recompiles TypeScript on changes.
- `bun run verify`: Validates Android, iOS, and Web builds.
- `bun run fmt`: Formats all source files (TS, Java, Swift, etc.).

---

## 🏗 Project Structure

- `src/`: Core TypeScript source.
  - `definitions.ts`: The plugin API interface. **Modify this first** when adding features.
  - `web.ts`: The web/no-op implementation.
  - `index.ts`: Main entry point.
- `android/`: Native Android source (Kotlin).
- `ios/`: Native iOS source (Swift).
- `example/`: A standalone Capacitor app to test the plugin.

---

## 👩‍💻 Implementation Workflow

When adding or modifying a feature, satisfy the "Three Pillars":
1. **Interface**: Update `src/definitions.ts`.
2. **Web/Proxy**: Update `src/web.ts` (often just a "not implemented" error, but must match the interface).
3. **Native**: Implement the logic in both `android/` (Kotlin) and `ios/` (Swift).

### Updating Documentation
If you change `definitions.ts`, you **must** run:
```bash
bun run docgen
```
This updates the API section in `README.md` automatically.

---

## 🧪 Testing with the Example App

The `example` directory contains a dedicated test app.
1. From the root, run `bun run watch` to ensure the plugin's JS output stays fresh.
2. In another terminal:
   ```bash
   cd example
   bun install
   bun run build
   npx cap sync
   ```
3. Run on a device/emulator:
   - **Android**: `npx cap run android`
   - **iOS**: `npx cap run ios`

---

## 💡 Tech Notes & Gotchas

- **Tiered Strategy**: This plugin attempts native transfers (Tier 1/2) and may fall back to local hotspots (Tier 3) on Android.
- **Permissions**: Native code handles most permission requests via the `Capacitor` permission system. Check `android/AndroidManifest.xml` and `ios/Sources/OfflineTransferPlugin/Info.plist` (or equivalent) for required keys.
- **Version Pinning**: Maintain `@capacitor/*` dependency versions at `^8.0.0` to ensure compatibility.
- **Lockfile**: Do not manually edit `bun.lock`. Let Bun update it during `bun install`.

---

## 🤖 Interaction Style for Agents
- If you encounter a build error in the Android or iOS projects, search for the specific error in the respective native subfolders.
- If you need to debug native logic, look into `OfflineTransferPlugin.kt` (Android) or `OfflineTransferPlugin.swift` (iOS).
- Always ensure `ios/Package.swift` and `.podspec` files are updated if you add new native dependencies.

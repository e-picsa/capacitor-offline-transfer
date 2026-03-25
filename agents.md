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

## 💡 Tech Notes & Gotchas

- **Permissions**: Native code handles most permission requests via the `Capacitor` permission system. Check `android/AndroidManifest.xml` and `ios/Sources/OfflineTransferPlugin/Info.plist` (or equivalent) for required keys.
- **Version Pinning**: Maintain `@capacitor/*` dependency versions at `^8.0.0` to ensure compatibility.
- **Lockfile**: Do not manually edit `bun.lock`. Let Bun update it during `bun install`.

---

## 🤖 Interaction Style for Agents

- If you encounter a build error in the Android or iOS projects, search for the specific error in the respective native subfolders.
- If you need to debug native logic, look into `OfflineTransferPlugin.kt` (Android) or `OfflineTransferPlugin.swift` (iOS).
- Always ensure `ios/Package.swift` and `.podspec` files are updated if you add new native dependencies.

---

## 🧠 Context & Tool Management

> [!WARNING]
> **Conserve Context Tokens:** Terminal output can be exceptionally bloated. Use specific workspace tools over terminal commands for context gathering.

- When asked to read, inspect, or review files, **ALWAYS** prefer your built-in, native workspace/file-reading tools (e.g., `view_file`, `read_file`, `search_files`, `grep_search`, depending on your specific agent environment like Google Antigravity, Gemini, Cursor, Windsurf, Copilot, etc.).
- **DO NOT** use terminal commands like `cat`, `less`, `head`, `tail`, or `git show` to read file contents unless explicitly instructed to do so by the user. These commands bypass context management systems and consume excessive tokens.
- When reviewing uncommitted or staged work, **ALWAYS** use `git diff` or your native equivalent instead of dumping full file contents.

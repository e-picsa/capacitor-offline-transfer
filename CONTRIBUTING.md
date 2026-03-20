# Contributing

This guide provides instructions for contributing to this Capacitor plugin.

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Bun](https://bun.sh/) (Required for dependency management)
- macOS with Xcode (for iOS development)
- Android Studio (for Android development)

## Developing

### Local Setup

1. Fork and clone the repo.
2. Install the dependencies using Bun:

```shell
   bun install
```

3. Install SwiftLint if you're on macOS:

```shell
   brew install swiftlint
```

### Recommended Local Workflow

The easiest way to develop this plugin is to use the automated development script, which handles the synchronization between the plugin and the example app.

1.  **Start the Dev Script**: In the root of the plugin repository, run:

```shell
bun run start
```

This script watches for changes in:

- Plugin native code (`android/src` and `ios/Sources`)
- Example app source (`example/src`)

When changes are detected, it automatically runs `bun install` (to sync the plugin in the example app), `vite build` (for the web bundle), and `cap sync` (to update the native projects).

### Testing on Native Emulators with Live Reload

For the best experience, use Capacitor's Live Reload feature. This allows you to see web-side changes immediately without waiting for a full `cap sync` loop.

1. Ensure `bun run start` (or your manual builds) is running.
2. In another terminal, navigate to the `example/` directory and run:

**For iOS:**

```shell
npx cap run ios --live-reload
```

**For Android:**

```shell
npx cap run android --live-reload
```

_Note: When prompted, select your local network IP address (usually the one starting with 192.168.x.x or 10.x.x.x) so your device/emulator can connect to the dev server._

### Scripts

#### `bun run start`

Runs a custom development script ([`scripts/dev.ts`](file:///c:/apps/picsa/capacitor-offline-transfer/scripts/dev.ts)) that automates the "Plugin $\rightarrow$ Example App" synchronization loop. It watches for native and example source changes and performs necessary builds and `cap sync` operations.

#### `bun run build`

Build the plugin web assets and generate plugin API documentation using [`@capacitor/docgen`](https://github.com/ionic-team/capacitor-docgen).

It will compile the TypeScript code from `src/` into ESM JavaScript in `dist/esm/`. These files are used in apps with bundlers when your plugin is imported.

Then, Rollup will bundle the code into a single file at `dist/plugin.js`. This file is used in apps without bundlers by including it as a script in `index.html`.

#### `bun run verify`

Build and validate the web and native projects.

This is useful to run in CI to verify that the plugin builds for all platforms.

#### `bun run lint` / `bun run fmt`

Check formatting and code quality, autoformat/autofix if possible.

This template is integrated with ESLint, Prettier, and SwiftLint. Using these tools is completely optional, but the [Capacitor Community](https://github.com/capacitor-community/) strives to have consistent code style and structure for easier cooperation.

## Publishing

There is a `prepublishOnly` hook in `package.json` which prepares the plugin before publishing, so all you need to do is run:

```shell
bun publish
```

> **Note**: The [`files`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files) array in `package.json` specifies which files get published. If you rename files/directories or add files elsewhere, you may need to update it.

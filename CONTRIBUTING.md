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

To test the plugin locally while making changes, use the provided `example` app.

1. **Start the Plugin Watcher**: In the root of the plugin repository, run:

```shell
bun run watch
```

This will automatically recompile your TypeScript changes as you work.

2. **Run the Example App**: In a new terminal, navigate to the `example/` directory and install its dependencies (if not already done):

```shell
cd example
bun install
# Start the web app with HMR (Hot Module Replacement)
npm run start
```

### Testing on Native Emulators with Live Reload

If you need to test native platform features (Android or iOS) with live reload enabled so changes propagate automatically:

1. Ensure your plugin watcher (`npm run watch`) and your example app's server (`cd example && npm run start`) are both running.
2. In a third terminal within the `example/` directory, run the Capacitor CLI with the live reload flag:

   **For iOS:**

```shell
   npx cap run ios --live-reload
```

**For Android:**

```shell
   npx cap run android --live-reload
```

_Note: When prompted, select the local network IP address that your emulator/device can resolve._

### Scripts

#### `npm run build`

Build the plugin web assets and generate plugin API documentation using [`@capacitor/docgen`](https://github.com/ionic-team/capacitor-docgen).

It will compile the TypeScript code from `src/` into ESM JavaScript in `dist/esm/`. These files are used in apps with bundlers when your plugin is imported.

Then, Rollup will bundle the code into a single file at `dist/plugin.js`. This file is used in apps without bundlers by including it as a script in `index.html`.

#### `npm run verify`

Build and validate the web and native projects.

This is useful to run in CI to verify that the plugin builds for all platforms.

#### `npm run lint` / `npm run fmt`

Check formatting and code quality, autoformat/autofix if possible.

This template is integrated with ESLint, Prettier, and SwiftLint. Using these tools is completely optional, but the [Capacitor Community](https://github.com/capacitor-community/) strives to have consistent code style and structure for easier cooperation.

## Publishing

There is a `prepublishOnly` hook in `package.json` which prepares the plugin before publishing, so all you need to do is run:

```shell
npm publish
```

> **Note**: The [`files`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files) array in `package.json` specifies which files get published. If you rename files/directories or add files elsewhere, you may need to update it.

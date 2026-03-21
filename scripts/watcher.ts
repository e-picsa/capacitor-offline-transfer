import { watch, type FSWatcher } from 'fs';
import { resolve } from 'path';
import { PATHS } from './paths';

// === Android watchers ===

export function watchPluginAndroid(onChange: () => void): FSWatcher {
  return watch(resolve(PATHS.ROOT, 'android', 'src'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.(kt|java)$/.test(filename)) return;
    onChange();
  });
}

export function watchPluginTS(onChange: () => void): FSWatcher {
  return watch(resolve(PATHS.ROOT, 'src'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.ts$/.test(filename)) return;
    onChange();
  });
}

// === iOS watchers ===

export function watchPluginIOS(onChange: () => void): FSWatcher {
  return watch(resolve(PATHS.ROOT, 'ios', 'Sources'), { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    if (!/\.(swift|m|h)$/.test(filename)) return;
    onChange();
  });
}

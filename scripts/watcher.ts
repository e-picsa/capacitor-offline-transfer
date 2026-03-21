import { watch, type FSWatcher } from 'fs';
import { resolve } from 'path';
import { PATHS } from './paths';

export function watchNativeSources(onChange: (label: string, filename: string | null) => void): FSWatcher[] {
  const targets = [
    { dir: resolve(PATHS.ROOT, 'android', 'src'), label: 'Android' },
    { dir: resolve(PATHS.ROOT, 'ios', 'Sources'), label: 'iOS' },
  ];

  return targets.map(({ dir, label }) =>
    watch(dir, { recursive: true }, (_evt, filename) => {
      onChange(label, filename ?? null);
    }),
  );
}

export {};

import { watch } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const EXAMPLE = resolve(ROOT, 'example');

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
let syncing = false;

let hasWebChanges = true;
let hasNativeChanges = true;

async function runInExample(cmd: string[], label: string) {
  console.log(`⏳ ${label}...`);
  const proc = Bun.spawn(cmd, {
    cwd: EXAMPLE,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ ${label} failed`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

async function syncExampleApp() {
  if (syncing) return;
  syncing = true;
  try {
    if (hasNativeChanges) {
      hasNativeChanges = false;
      // install command will pull latest plugin code into node_module for sync
      const ok = await runInExample(['bun', 'run', 'sync:plugin'], 'sync plugin');
      if (!ok) {
        return;
      }
    }
    if (hasWebChanges) {
      hasWebChanges = false;
      // vite build will compile web code
      const ok = await runInExample(['bun', 'run', 'build:web'], 'build web');
      if (!ok) {
        return;
      }
    }
    await runInExample(['bun', 'run', 'sync:native'], 'cap sync');
  } finally {
    syncing = false;
  }
}

function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    await syncExampleApp();
  }, 500);
}

// --- Initial build ---
console.log('🔨 Initial example build + sync\n');
await syncExampleApp();
console.log('\n👀 Watching for changes...\n');

// --- Watch plugin native code ---
watch(resolve(ROOT, 'android', 'src'), { recursive: true }, (_event, filename) => {
  console.log(`\n📦 Plugin Android changed: ${filename}`);
  hasNativeChanges = true;
  debouncedSync();
});

// --- Watch plugin iOS code ---
watch(resolve(ROOT, 'ios', 'Sources'), { recursive: true }, (_event, filename) => {
  console.log(`\n📦 Plugin iOS changed: ${filename}`);
  hasNativeChanges = true;
  debouncedSync();
});

// --- Watch example app source ---
watch(resolve(EXAMPLE, 'src'), { recursive: true }, (_event, filename) => {
  console.log(`\n📱 Example changed: ${filename}`);
  hasWebChanges = true;
  debouncedSync();
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down');
  process.exit();
});

await new Promise(() => {}); // block forever

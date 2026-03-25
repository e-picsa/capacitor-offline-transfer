import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { execCmd } from './cli.utils';
import { PATHS } from '../paths';

function getAppId(): string {
  const configPath = resolve(PATHS.EXAMPLE_APP, 'capacitor.config.ts');
  const content = readFileSync(configPath, 'utf-8');
  const match = content.match(/appId:\s*['"]([^'"]+)['"]/);
  if (!match) throw new Error('Could not find appId in example/capacitor.config.ts');
  return match[1];
}

const APP_ID = getAppId();

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const BOOT_POLL_INTERVAL_MS = 3_000;
const BOOT_TIMEOUT_MS = 120_000;

export async function adbSetupLiveReload(deviceId: string, port: string): Promise<void> {
  await execCmd('adb', ['-s', deviceId, 'reverse', `tcp:${port}`, `tcp:${port}`]);
}

interface AdbInstallResult {
  success: boolean;
  error?: string;
}

/**
 * Errors where an uninstall + reinstall should fix it automatically.
 */
const REINSTALL_PATTERNS: string[] = [
  'version_downgrade',
  'already_exists',
  'already-installed',
  'signatures do not match',
  'signature_mismatch',
];

/**
 * Errors that require waiting for the device to finish booting.
 */
const BOOT_PATTERNS: string[] = ['still boot', 'boot_not_complete', 'device not ready'];

/**
 * Errors that are fatal and cannot be resolved automatically.
 */
const FATAL_ERRORS: { patterns: string[]; message: string }[] = [
  {
    patterns: ['invalid_apk', 'parse_failed'],
    message: 'Invalid or corrupt APK — rebuild before retrying',
  },
  {
    patterns: ['no devices', 'device not found'],
    message: 'Emulator disconnected during install',
  },
  {
    patterns: ['device offline'],
    message: 'Emulator offline',
  },
  {
    patterns: ['unauthorized'],
    message: 'Device unauthorized — accept the USB debugging prompt on the device',
  },
  {
    patterns: ['insufficient_storage', 'not enough space'],
    message: 'Insufficient storage on device — free up space and try again',
  },
  {
    patterns: ['incompatible'],
    message: 'APK is incompatible with the device architecture',
  },
  {
    patterns: ['permission_denied', 'permission denied'],
    message: 'Permission denied during install',
  },
];

/** Transient errors worth retrying without uninstalling. */
const RETRYABLE_PATTERNS: string[] = ['time', 'timeout', 'connection reset', 'broken pipe', 'closed'];

function getApkPath(): string {
  return resolve(PATHS.EXAMPLE_APP, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
}

function matchesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function retryDelay(attempt: number): Promise<void> {
  const ms = BASE_DELAY_MS * Math.pow(2, attempt - 2);
  console.log(`\n    retrying in ${ms}ms (attempt ${attempt}/${MAX_RETRIES})…`);
  return delay(ms);
}

/**
 * Polls `sys.boot_completed` until the device reports "1" or the timeout
 * is reached. Falls back to a fixed delay if the property can't be read.
 */
async function waitForBoot(deviceId: string): Promise<boolean> {
  console.log(`\n    ⏳ device is still booting, waiting for boot…`);
  const start = Date.now();

  while (Date.now() - start < BOOT_TIMEOUT_MS) {
    const { code, stdout } = await execCmd('adb', ['-s', deviceId, 'shell', 'getprop', 'sys.boot_completed']);

    if (code === 0 && stdout.trim() === '1') {
      console.log(`    ✅ device booted after ${Date.now() - start}ms`);
      return true;
    }

    await delay(BOOT_POLL_INTERVAL_MS);
  }

  console.error(`\n    ❌ device did not finish booting within ${BOOT_TIMEOUT_MS / 1_000}s`);
  return false;
}

async function adbUninstall(deviceId: string): Promise<boolean> {
  console.log(`\n    uninstalling ${APP_ID} from ${deviceId}…`);
  const { code } = await execCmd('adb', ['-s', deviceId, 'uninstall', APP_ID]);
  return code === 0;
}

async function adbFreshInstall(deviceId: string, apkPath: string): Promise<AdbInstallResult> {
  const uninstalled = await adbUninstall(deviceId);
  if (!uninstalled) {
    return { success: false, error: 'Failed to uninstall app before attempting a fresh install.' };
  }

  const { code, stdout, stderr } = await execCmd('adb', ['-s', deviceId, 'install', apkPath]);

  if (code === 0) return { success: true };

  const errorOutput = (stderr || stdout).trim();
  return {
    success: false,
    error: `Fresh install failed: ${errorOutput.substring(0, 200)}`,
  };
}

function classifyError(errorOutput: string): 'reinstall' | 'boot' | 'fatal' | 'retry' {
  const lower = errorOutput.toLowerCase();

  if (matchesAny(lower, BOOT_PATTERNS)) return 'boot';
  if (matchesAny(lower, REINSTALL_PATTERNS)) return 'reinstall';

  for (const { patterns } of FATAL_ERRORS) {
    if (matchesAny(lower, patterns)) return 'fatal';
  }

  if (matchesAny(lower, RETRYABLE_PATTERNS)) return 'retry';

  return 'retry';
}

function getFatalMessage(errorOutput: string): string {
  const lower = errorOutput.toLowerCase();
  for (const { patterns, message } of FATAL_ERRORS) {
    if (matchesAny(lower, patterns)) return message;
  }
  return errorOutput.substring(0, 200);
}

const LAUNCH_PATTERNS = ['starting', 'started'];

const LAUNCH_ERRORS: { patterns: string[]; message: string }[] = [
  {
    patterns: ['not found', 'unable to resolve'],
    message: `Activity not found for ${APP_ID}/.MainActivity`,
  },
  {
    patterns: ['app is not installed', 'package does not exist'],
    message: `App ${APP_ID} is not installed on the device`,
  },
  {
    patterns: ['device not ready', 'device offline'],
    message: 'Device is not ready',
  },
  {
    patterns: ['security exception', 'permission denied'],
    message: 'Permission denied when launching app',
  },
];

function getLaunchError(errorOutput: string): string | null {
  const lower = errorOutput.toLowerCase();
  for (const { patterns, message } of LAUNCH_ERRORS) {
    if (patterns.some((p) => lower.includes(p))) return message;
  }
  return null;
}

export async function adbLaunch(deviceId: string): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) await retryDelay(attempt);

    const { code, stdout, stderr } = await execCmd('adb', [
      '-s',
      deviceId,
      'shell',
      'am',
      'start',
      '-n',
      `${APP_ID}/.MainActivity`,
    ]);

    const output = (stdout || stderr).trim().toLowerCase();

    if (code === 0 && LAUNCH_PATTERNS.some((p) => output.includes(p))) {
      return { success: true };
    }

    const errorMsg = getLaunchError(output);
    if (errorMsg) {
      return { success: false, error: errorMsg };
    }

    if (attempt < MAX_RETRIES) {
      const rawOutput = (stdout || stderr).trim().substring(0, 150);
      console.error(`\n    ⚠️  adb launch warning (attempt ${attempt}): ${rawOutput}`);
      continue;
    }

    return {
      success: false,
      error: `adb launch failed after ${MAX_RETRIES} attempts: ${(stdout || stderr).trim().substring(0, 200)}`,
    };
  }

  return { success: false, error: 'Unknown launch error' };
}

export async function adbInstall(deviceId: string): Promise<AdbInstallResult> {
  const apkPath = getApkPath();

  if (!existsSync(apkPath)) {
    return { success: false, error: `APK not found at ${apkPath}` };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) await retryDelay(attempt);

    const { code, stdout, stderr } = await execCmd('adb', ['-s', deviceId, 'install', '-r', apkPath]);

    if (code === 0) return { success: true };

    const errorOutput = (stderr || stdout).trim();
    const classification = classifyError(errorOutput);

    if (classification === 'fatal') {
      return { success: false, error: getFatalMessage(errorOutput) };
    }

    if (classification === 'reinstall') {
      console.log(`\n    conflicting install detected, uninstalling and retrying…`);
      return adbFreshInstall(deviceId, apkPath);
    }

    if (classification === 'boot') {
      const booted = await waitForBoot(deviceId);
      if (!booted) {
        return {
          success: false,
          error: `Device did not finish booting within ${BOOT_TIMEOUT_MS / 1_000}s`,
        };
      }
      // Don't count the boot wait as a failed attempt — retry immediately.
      attempt--;
      continue;
    }

    // "retry" — transient or unknown error
    if (attempt < MAX_RETRIES) {
      console.error(`\n    ⚠️  adb install warning (attempt ${attempt}): ${errorOutput.substring(0, 150)}`);
      continue;
    }

    return {
      success: false,
      error: `adb install failed after ${MAX_RETRIES} attempts: ${errorOutput.substring(0, 200)}`,
    };
  }

  return { success: false, error: 'Unknown install error' };
}

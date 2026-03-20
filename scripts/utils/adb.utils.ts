import { existsSync } from 'fs';
import { resolve } from 'path';

import { execCmd } from './cli.utils';
import { PATHS } from '../paths';

const APP_PACKAGE = 'com.example.app'; // adjust to your actual package name

export async function adbReverse(emulatorId: string, port: string): Promise<void> {
  await execCmd('adb', ['-s', emulatorId, 'reverse', `tcp:${port}`, `tcp:${port}`]);
}

interface AdbInstallResult {
  success: boolean;
  error?: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;

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
    message: 'Emulator unauthorized — accept the USB debugging prompt',
  },
  {
    patterns: ['insufficient_storage', 'not enough space'],
    message: 'Insufficient storage on emulator — wipe data and restart',
  },
  {
    patterns: ['incompatible'],
    message: 'APK is incompatible with the emulator architecture',
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

function delay(attempt: number): Promise<void> {
  const ms = BASE_DELAY_MS * Math.pow(2, attempt - 2);
  console.log(`\n    retrying in ${ms}ms (attempt ${attempt}/${MAX_RETRIES})…`);
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function adbUninstall(emulatorId: string): Promise<boolean> {
  console.log(`\n    uninstalling ${APP_PACKAGE} from ${emulatorId}…`);
  const { code } = await execCmd('adb', ['-s', emulatorId, 'uninstall', APP_PACKAGE]);
  return code === 0;
}

async function adbFreshInstall(emulatorId: string, apkPath: string): Promise<AdbInstallResult> {
  await adbUninstall(emulatorId);

  const { code, stdout, stderr } = await execCmd('adb', ['-s', emulatorId, 'install', apkPath]);

  if (code === 0) return { success: true };

  const errorOutput = (stderr || stdout).trim();
  return {
    success: false,
    error: `Fresh install failed: ${errorOutput.substring(0, 200)}`,
  };
}

function classifyError(errorOutput: string): 'reinstall' | 'fatal' | 'retry' {
  const lower = errorOutput.toLowerCase();

  if (matchesAny(lower, REINSTALL_PATTERNS)) return 'reinstall';

  for (const { patterns } of FATAL_ERRORS) {
    if (matchesAny(lower, patterns)) return 'fatal';
  }

  if (matchesAny(lower, RETRYABLE_PATTERNS)) return 'retry';

  // Unknown errors get retried — safe default for local emulators.
  return 'retry';
}

function getFatalMessage(errorOutput: string): string {
  const lower = errorOutput.toLowerCase();
  for (const { patterns, message } of FATAL_ERRORS) {
    if (matchesAny(lower, patterns)) return message;
  }
  return errorOutput.substring(0, 200);
}

export async function adbInstall(emulatorId: string): Promise<AdbInstallResult> {
  const apkPath = getApkPath();

  if (!existsSync(apkPath)) {
    return { success: false, error: `APK not found at ${apkPath}` };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) await delay(attempt);

    const { code, stdout, stderr } = await execCmd('adb', ['-s', emulatorId, 'install', '-r', apkPath]);

    if (code === 0) return { success: true };

    const errorOutput = (stderr || stdout).trim();
    const classification = classifyError(errorOutput);

    if (classification === 'fatal') {
      return { success: false, error: getFatalMessage(errorOutput) };
    }

    if (classification === 'reinstall') {
      console.log(`\n    conflicting install detected, uninstalling and retrying…`);
      return adbFreshInstall(emulatorId, apkPath);
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

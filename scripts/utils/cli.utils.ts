import { spawn } from 'node:child_process';
import { networkInterfaces, platform } from 'node:os';

export function runDetached(cmd: string, args: string[]): void {
  spawn(cmd, args, { detached: true, stdio: 'ignore', shell: true }).unref();
}

export function execCmd(
  cmd: string,
  args: string[],
  cwd?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { shell: true, cwd });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => (stdout += d.toString()));
    proc.stderr?.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

export async function prompt(question: string): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

export async function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve();
    });
  });
}

function parsePlatformArg(): 'android' | 'ios' | null {
  const platform = process.argv[2]?.trim().toLowerCase();
  if (platform === 'android' || platform === 'ios') return platform;
  return null;
}

export function parseMultiSelect(input: string): string[] {
  const parts = input
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  if (parts.length === 1 && (parts[0].toLowerCase() === 'all' || parts[0] === '*')) return ['*'];
  return parts;
}

export async function selectPlatform(): Promise<'android' | 'ios'> {
  const arg = parsePlatformArg();
  if (arg) return arg;
  const ans = (await prompt('Select platform (android/ios) [android]: ')).trim().toLowerCase();
  return ans === 'ios' ? 'ios' : 'android';
}

export function detectLocalIP(): string | null {
  const interfaces = networkInterfaces();
  for (const [, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
}

export async function ensurePortFree(port: string): Promise<void> {
  const isWindows = platform() === 'win32';

  if (isWindows) {
    const { stdout } = await execCmd('cmd', ['/c', `netstat -ano | findstr :${port}`]);
    for (const line of stdout.split('\n')) {
      const m = line.trim().match(/(\d+)\s*$/);
      if (m) {
        console.log(`  Killing process ${m[1]} on port ${port}...`);
        await execCmd('cmd', ['/c', `taskkill /F /PID ${m[1]}`]);
        await new Promise<void>((r) => setTimeout(r, 500));
        break;
      }
    }
  } else {
    try {
      const { stdout } = await execCmd('lsof', ['-ti', `:${port}`]);
      for (const pid of stdout.trim().split('\n').filter(Boolean)) {
        console.log(`  Killing process ${pid} on port ${port}...`);
        await execCmd('kill', ['-9', pid]);
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    } catch {
      // lsof exits with 1 when no matches found — port is already free
    }
  }
}

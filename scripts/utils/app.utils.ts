import { PATHS } from '../paths';

export async function runInExample(cmd: string[], label: string): Promise<boolean> {
  console.log(`\n⏳ ${label}...`);
  const proc = Bun.spawn(cmd, {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`❌ ${label} failed with exit code ${code}`);
    return false;
  }
  console.log(`✅ ${label}`);
  return true;
}

let viteProc: ReturnType<typeof Bun.spawn> | null = null;

export function startViteServer(): void {
  if (viteProc) {
    viteProc.kill();
    viteProc = null;
  }

  console.log(`\n🚀 Starting Vite dev server`);
  viteProc = Bun.spawn(['bun', 'run', 'start'], {
    cwd: PATHS.EXAMPLE_APP,
    stdout: 'inherit',
    stderr: 'inherit',
    env: process.env,
  });
}

// export async function syncPluginTS(): Promise<boolean> {
//   const webOk = await runInExample(['bun', 'run', 'build:web'], 'vite build');
//   if (!webOk) return false;
//   const syncOk = await runInExample(['bunx', 'cap', 'sync'], 'cap sync');
//   if (!syncOk) return false;
//   return await runGradleBuild();
// }

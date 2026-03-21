import { PATHS } from '../paths';

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

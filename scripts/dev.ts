export {};

const buildFirst = Bun.spawn(['tsc'], {
  stdout: 'inherit',
  stderr: 'inherit',
});

const code = await buildFirst.exited;
if (code !== 0) {
  console.error('Initial build failed');
  process.exit(1);
}

console.log('✅ Initial build done, starting watchers...\n');

const plugin = Bun.spawn(['tsc', '--watch', '--preserveWatchOutput'], {
  stdout: 'inherit',
  stderr: 'inherit',
});

const example = Bun.spawn(['bun', 'run', 'dev'], {
  cwd: 'example',
  stdout: 'inherit',
  stderr: 'inherit',
});

process.on('SIGINT', () => {
  plugin.kill();
  example.kill();
  process.exit();
});

await Promise.all([plugin.exited, example.exited]);

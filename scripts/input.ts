import readline from 'readline';
import type { KeyAction } from './types';

export function setupKeypress(onAction: (action: KeyAction) => void): () => void {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode?.(true);
  process.stdin.resume?.();

  const map: Record<string, KeyAction> = {
    r: 'redeploy',
    i: 'reinstall',
    c: 'reboot',
    a: 'studio',
  };

  const handler = (_ch: string, key: { name: string; ctrl: boolean }) => {
    if (key.ctrl && key.name === 'c') return;
    const action = map[key.name?.toLowerCase()] ?? null;
    if (action) onAction(action);
  };

  process.stdin.on('keypress', handler);

  return () => {
    process.stdin.removeListener('keypress', handler);
    process.stdin.setRawMode?.(false);
    process.stdin.pause?.();
  };
}

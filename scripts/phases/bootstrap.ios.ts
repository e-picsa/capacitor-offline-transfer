import { bootstrapShared } from './bootstrap.shared';
import type { DevContext } from '../types';

export async function bootstrap(): Promise<DevContext> {
  const { platform, serverIp, serverPort } = await bootstrapShared();
  console.log('\n⚠️  iOS bootstrap not yet implemented.');
  return { platform, emulators: [], serverIp, serverPort };
}

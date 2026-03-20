import { registerPlugin } from '@capacitor/core';

import type { OfflineTransferPlugin } from './definitions';

const OfflineTransfer = registerPlugin<OfflineTransferPlugin>('OfflineTransfer', {
  web: () => import('./web').then((m) => new m.OfflineTransferWeb()),
});

export * from './definitions';
export * from './reactive-state';
export { OfflineTransfer };

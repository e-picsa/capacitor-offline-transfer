import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import type { PermissionStatus } from '@picsa/capacitor-offline-transfer';
import { signal } from '@preact/signals';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { logService } from '../state/log.service';

type PermStatus = PermissionStatus['nearby'];

export const SetupPanel: FunctionComponent = () => {
  const permStatus = signal<PermStatus | null>(null);

  const handleCheckPerms = async () => {
    const status = await OfflineTransfer.checkPermissions();
    permStatus.value = status.nearby;
    logService.info(`Permissions: nearby=${status.nearby}`);
  };

  const handleRequestPerms = async () => {
    const status = await OfflineTransfer.requestPermissions();
    permStatus.value = status.nearby;
    logService.info(`Request result: nearby=${status.nearby}`);
  };

  return html`
    <section>
      <h2 class="text-lg font-semibold mb-3">Permissions</h2>

      <div class="flex flex-wrap gap-2">
        <button
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded text-sm border border-gray-300"
          onClick=${handleCheckPerms}
        >
          Check
        </button>
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded text-sm"
          onClick=${handleRequestPerms}
        >
          Request
        </button>
        ${permStatus.value
          ? html`<span class="text-xs text-gray-500 self-center px-2 py-1 bg-gray-100 rounded"
              >${permStatus.value}</span
            >`
          : ''}
      </div>
    </section>
  `;
};

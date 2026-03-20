import { OfflineTransfer } from '@picsa/capacitor-offline-transfer';
import type { PermissionStatus } from '@picsa/capacitor-offline-transfer';
import { signal, useSignal } from '@preact/signals';
import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { initialized, initPluginState } from '../state';
import { logService, errMsg } from '../state/log.service';

import { Badge } from './ui/badge';

type Strategy = 'P2P_STAR' | 'P2P_CLUSTER' | 'P2P_POINT_TO_POINT';

const STRATEGIES: Strategy[] = ['P2P_STAR', 'P2P_CLUSTER', 'P2P_POINT_TO_POINT'];
const LOG_LEVELS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Error' },
  { value: 2, label: 'Warn' },
  { value: 3, label: 'Info (Default)' },
  { value: 4, label: 'Debug' },
  { value: 5, label: 'Verbose' },
];

export const SetupPanel: FunctionComponent = () => {
  const strategy = useSignal('P2P_CLUSTER');
  const logLevel = useSignal(3);
  const initStatus = useSignal<'' | 'loading' | 'active' | 'stopped'>('stopped');
  const permStatus = signal<PermissionStatus['nearby'] | null>(null);

  const handleInit = async () => {
    try {
      initStatus.value = 'loading';
      await OfflineTransfer.initialize({ serviceId: 'picsa-offline' });
      await OfflineTransfer.setStrategy({ strategy: strategy.value as Strategy });
      await OfflineTransfer.setLogLevel({ logLevel: logLevel.value });
      initPluginState(OfflineTransfer);
      initialized.value = true;
      initStatus.value = 'active';
      logService.success('Initialized');
    } catch (e: unknown) {
      initStatus.value = 'stopped';
      logService.error(`Init Error: ${errMsg(e)}`);
    }
  };

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
      <h2 class="text-lg font-semibold mb-3">1. Setup</h2>

      <div class="mb-3">
        <label class="block text-sm text-gray-600 mb-1">P2P Strategy</label>
        <select
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value=${strategy.value}
          onChange=${(e: Event) => {
            strategy.value = (e.target as HTMLSelectElement).value;
          }}
        >
          ${STRATEGIES.map((s) => html`<option key=${s} value=${s} selected=${strategy.value === s}>${s}</option>`)}
        </select>
      </div>

      <div class="mb-3">
        <label class="block text-sm text-gray-600 mb-1">Log Level</label>
        <select
          class="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          value=${logLevel.value}
          onChange=${(e: Event) => {
            logLevel.value = parseInt((e.target as HTMLSelectElement).value);
          }}
        >
          ${LOG_LEVELS.map((l) => html`<option key=${l.value} value=${l.value}>${l.label}</option>`)}
        </select>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm disabled:opacity-50"
          onClick=${handleInit}
          disabled=${initStatus.value === 'loading' || initStatus.value === 'active'}
        >
          ${initStatus.value === 'loading' ? 'Initializing...' : 'Initialize'}
        </button>
        <${Badge}
          text=${initStatus.value === 'active' ? 'Ready' : initStatus.value === 'loading' ? 'Loading...' : ''}
          variant=${initStatus.value}
        />
        <button
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded text-sm border border-gray-300"
          onClick=${handleCheckPerms}
        >
          Check Perms
        </button>
        <button
          class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded text-sm border border-gray-300"
          onClick=${handleRequestPerms}
        >
          Request Perms
        </button>
        ${permStatus.value ? html`<span class="text-xs text-gray-500 self-center">${permStatus.value}</span>` : ''}
      </div>
    </section>
  `;
};

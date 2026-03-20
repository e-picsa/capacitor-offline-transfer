import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { logService } from '../state/log.service';

export const LogConsole: FunctionComponent = () => {
  const entries = logService.entries;

  const levelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-700';
    }
  };

  return html`
    <section>
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-semibold">Log Console</h2>
        <button class="text-xs text-gray-400 hover:text-gray-600" onClick=${() => logService.clear()}>Clear</button>
      </div>
      <div class="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono h-48 overflow-y-auto">
        ${entries.value.length === 0
          ? html`<div class="text-gray-500">Ready.</div>`
          : entries.value.map(
              (entry) => html`
                <div key=${entry.id} class="mb-1 flex gap-2">
                  <span class="text-gray-500 shrink-0">[${entry.time}]</span>
                  <span class=${levelColor(entry.level)}>${entry.message}</span>
                </div>
              `,
            )}
      </div>
    </section>
  `;
};

import { html } from 'htm/preact';
import type { FunctionComponent } from 'preact';

import { logService } from '../state/log.service';

export const LogConsole: FunctionComponent = () => {
  const entries = logService.entries;

  const levelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  return html`
    <div class="bg-gray-900 text-gray-100 p-3 text-xs font-mono h-[calc(60vh-50px)] overflow-y-auto">
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
  `;
};

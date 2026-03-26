import { connectionMode, connectedEndpoints } from '../state';

import { StatusBadge } from './connection-status';
import { handleConnect } from './connection-utils';

export const ConnectionControls = () => {
  const mode = connectionMode.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;
  const isConnected = !!connectedId;
  const isPending = mode === 'advertising' || mode === 'discovering' || mode === 'connecting';

  return (
    <div class="flex gap-2 items-center">
      <StatusBadge />
      <button
        class={
          isPending
            ? 'bg-gray-400 text-white font-medium py-2 px-4 rounded text-sm cursor-not-allowed'
            : isConnected || mode !== 'idle'
              ? 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm'
              : 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm'
        }
        onClick={handleConnect}
        disabled={isPending}
      >
        {isPending
          ? mode === 'advertising'
            ? 'Starting...'
            : 'Stopping...'
          : mode !== 'idle'
            ? 'Disconnect'
            : 'Connect'}
      </button>
    </div>
  );
};

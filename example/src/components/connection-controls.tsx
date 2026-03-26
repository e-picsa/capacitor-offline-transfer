import { connectionMode, connectedEndpoints } from '../state';

import { StatusBadge } from './connection-status';
import { handleConnect } from './connection-utils';

export const ConnectionControls = () => {
  const mode = connectionMode.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;
  const isConnected = !!connectedId;
  // Only "connecting" is a transient state where we might want to disable the button
  // to avoid multiple simultaneous connection attempts or ambiguous UI states.
  const isPending = mode === 'connecting';

  let buttonText = 'Connect';
  let buttonClass = 'bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors';

  if (isPending) {
    buttonText = 'Connecting...';
    buttonClass = 'bg-gray-400 text-white font-medium py-2 px-4 rounded text-sm cursor-not-allowed transition-colors';
  } else if (isConnected || (mode !== 'idle' && mode !== 'error')) {
    // If we are advertising, discovering, or connected, the primary action is "Stop" or "Disconnect"
    buttonText = mode === 'connected' ? 'Disconnect All' : 'Stop Searching';
    buttonClass = 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors';
  } else if (mode === 'error') {
    buttonText = 'Retry';
    buttonClass = 'bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors';
  }

  return (
    <div class="flex gap-2 items-center">
      <StatusBadge />
      <button
        class={buttonClass}
        onClick={handleConnect}
        disabled={isPending}
      >
        {buttonText}
      </button>
    </div>
  );
};

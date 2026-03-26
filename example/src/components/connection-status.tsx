import { connectionMode, connectionError, connectedEndpoints } from '../state';

export const ConnectionStatus = () => {
  const mode = connectionMode.value;
  const connected = connectedEndpoints.value;
  const connectedId = Object.keys(connected)[0] ?? null;
  const isConnected = !!connectedId;

  return (
    <>
      {isConnected ? (
        <div class="bg-green-50 border border-green-200 rounded p-3 mb-4">
          <p class="text-sm text-green-700">
            Connected to <span class="font-medium">{connected[connectedId]?.endpointName || connectedId}</span>
          </p>
        </div>
      ) : mode !== 'idle' ? (
        <div class="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
          <p class="text-sm text-blue-700">
            {mode === 'advertising' && 'Waiting for nearby devices to discover you...'}
            {mode === 'discovering' && 'Looking for nearby devices...'}
            {mode === 'connecting' && 'Attempting to connect...'}
            {mode === 'error' && connectionError.value}
          </p>
        </div>
      ) : (
        <div class="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
          <p class="text-sm text-gray-500">Tap Connect to start advertising and discovering nearby devices.</p>
        </div>
      )}
    </>
  );
};

export const StatusBadge = () => {
  const mode = connectionMode.value;

  const badges: Record<string, { text: string; class: string }> = {
    advertising: { text: '📡 Advertising', class: 'bg-blue-100 text-blue-800' },
    discovering: { text: '🔍 Discovering', class: 'bg-yellow-100 text-yellow-800' },
    connecting: { text: '⏳ Connecting...', class: 'bg-yellow-100 text-yellow-800' },
    connected: { text: '✅ Connected', class: 'bg-green-100 text-green-800' },
    error: { text: '❌ ' + (connectionError.value || 'Error'), class: 'bg-red-100 text-red-800' },
  };

  const badge = badges[mode];
  if (!badge) return null;

  return <span class={`text-xs px-2 py-1 rounded ${badge.class}`}>{badge.text}</span>;
};

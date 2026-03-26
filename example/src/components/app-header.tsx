interface AppHeaderProps {
  onToggleLogs: () => void;
}

export const AppHeader = ({ onToggleLogs }: AppHeaderProps) => {
  return (
    <header class="bg-blue-600 text-white px-4 pt-3 pb-3 flex items-center justify-between pt-[env(safe-area-inset-top)]">
      <h1 class="text-xl font-semibold">Offline Transfer</h1>
      <button
        class="bg-blue-500 hover:bg-blue-400 text-white font-medium py-1 px-3 rounded text-sm"
        onClick={onToggleLogs}
      >
        Logs
      </button>
    </header>
  );
};

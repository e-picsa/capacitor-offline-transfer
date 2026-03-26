import { LogConsole } from './log-console';

interface LogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogPanel = ({ isOpen, onClose }: LogPanelProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div class="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose}></div>
      <div class="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg z-50 max-h-[60vh] overflow-hidden">
        <div class="flex items-center justify-between p-3 border-b border-gray-200">
          <h3 class="font-medium">Logs</h3>
          <button class="text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>
        <div class="overflow-y-auto max-h-[calc(60vh-50px)]">
          <LogConsole />
        </div>
      </div>
    </>
  );
};

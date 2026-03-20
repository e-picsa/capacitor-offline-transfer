export const ProgressBar = ({
  percent,
  filename,
  status,
  visible,
}: {
  percent: number;
  filename?: string;
  status?: string;
  visible: boolean;
}) => {
  if (!visible) return null;

  return (
    <div class="mt-3">
      <div class="flex justify-between text-xs text-gray-500 mb-1">
        <span>{filename ?? 'Transferring...'}</span>
        <span>{status ?? `${percent}%`}</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div class="bg-blue-500 h-2 rounded-full transition-all duration-200" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

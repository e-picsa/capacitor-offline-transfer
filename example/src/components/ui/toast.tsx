import { signal } from '@preact/signals';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

const toasts = signal<Toast[]>([]);
let nextId = 0;

export function showToast(message: string, type: Toast['type'] = 'info') {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, message, type }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 4000);
}

const typeClass: Record<Toast['type'], string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
};

export const ToastContainer = () => {
  return (
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.value.map((t) => (
        <div
          key={t.id}
          class={`px-4 py-2 rounded shadow-lg text-sm pointer-events-auto animate-slide-in ${typeClass[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
};

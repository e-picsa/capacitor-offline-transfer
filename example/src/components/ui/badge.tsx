import type { ComponentChildren } from 'preact';

type BadgeVariant = 'active' | 'loading' | 'stopped' | '';

const variantClass: Record<BadgeVariant, string> = {
  active: 'bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded',
  loading: 'bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded',
  stopped: 'bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded',
  '': 'bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded',
};

export const Badge = ({ text, variant = '' }: { text: ComponentChildren; variant?: BadgeVariant }) => {
  return <span className={variantClass[variant]}>{text}</span>;
};

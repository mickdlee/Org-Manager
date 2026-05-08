import { type ReactNode } from 'react';

type BadgeColor = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'indigo';

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
}

const colorClasses: Record<BadgeColor, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-600',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
      {children}
    </span>
  );
}

import React from 'react';

export type BadgeVariant = 'info' | 'success' | 'warning' | 'error';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  info: 'bg-primary/10 text-primary',
  success: 'bg-semantic-success/10 text-semantic-success',
  warning: 'bg-semantic-warning/10 text-ink',
  error: 'bg-semantic-error/10 text-semantic-error',
};

export function Badge({ variant = 'info', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-sm py-xxs text-caption font-medium',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

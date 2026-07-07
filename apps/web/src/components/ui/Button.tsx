import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  secondary:
    'bg-ink text-inverse-ink hover:bg-ink-muted active:bg-ink-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
  tertiary:
    'bg-canvas text-primary border border-primary hover:bg-surface-1 active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  ghost:
    'bg-transparent text-primary hover:bg-surface-1 active:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  danger:
    'bg-semantic-error text-on-primary hover:opacity-90 active:opacity-80 focus-visible:ring-2 focus-visible:ring-semantic-error focus-visible:ring-offset-2',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-xs px-md text-button',
  md: 'py-sm px-md text-button',
  lg: 'py-md px-lg text-button',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-none font-normal transition-colors',
        'focus-visible:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="mr-sm animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
      ) : icon ? (
        <span className="mr-sm">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

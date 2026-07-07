import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-xs">
        {label && (
          <label
            htmlFor={inputId}
            className="text-body-sm text-ink-muted"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-sm top-1/2 -translate-y-1/2 text-ink-subtle">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full bg-surface-1 text-body py-[11px] px-md rounded-none',
              'border-b border-hairline',
              'placeholder:text-ink-subtle',
              'focus:outline-none focus:border-b-2 focus:border-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-b-2 border-b-semantic-error focus:border-b-semantic-error',
              icon && 'pl-xl',
              className,
            ].join(' ')}
            {...props}
          />
        </div>
        {error && (
          <span className="text-caption text-semantic-error">{error}</span>
        )}
        {helperText && !error && (
          <span className="text-caption text-ink-subtle">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

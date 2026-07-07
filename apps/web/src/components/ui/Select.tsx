import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-xs">
        {label && (
          <label
            htmlFor={selectId}
            className="text-body-sm text-ink-muted"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'w-full bg-surface-1 text-body py-[11px] px-md rounded-none appearance-none',
            'border-b border-hairline',
            'focus:outline-none focus:border-b-2 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-b-2 border-b-semantic-error focus:border-b-semantic-error',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';

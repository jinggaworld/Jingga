import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = '', id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="flex flex-col gap-xs">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-body-sm text-ink-muted"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={[
            'w-full bg-surface-1 text-body py-[11px] px-md rounded-none resize-y min-h-[100px]',
            'border-b border-hairline',
            'placeholder:text-ink-subtle',
            'focus:outline-none focus:border-b-2 focus:border-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-b-2 border-b-semantic-error focus:border-b-semantic-error',
            className,
          ].join(' ')}
          {...props}
        />
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

TextArea.displayName = 'TextArea';

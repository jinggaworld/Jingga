'use client';

import React, { useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className = '' }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-ink/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className={[
          'relative bg-canvas border border-hairline w-full max-w-lg mx-4',
          'max-h-[90vh] overflow-y-auto',
          className,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-xl py-lg border-b border-hairline">
            <h2 className="text-headline text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="text-ink-muted hover:text-ink p-xs transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M12 4L4 12M4 4l8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-xl py-lg">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-sm px-xl py-lg border-t border-hairline">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

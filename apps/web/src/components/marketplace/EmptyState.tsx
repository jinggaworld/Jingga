'use client';

import React from 'react';

interface EmptyStateProps {
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  message = 'No works found',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-section">
      <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-lg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-subtle">
          <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-headline text-ink mb-md">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-primary-hover transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

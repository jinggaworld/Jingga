'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-xs">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-sm py-xs text-body-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Prev
      </button>

      {pages.map((page, i) => (
        page === '...' ? (
          <span key={`dots-${i}`} className="px-xs text-ink-subtle">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={[
              'w-8 h-8 flex items-center justify-center text-body-sm rounded-none transition-colors',
              page === currentPage
                ? 'bg-primary text-on-primary'
                : 'bg-surface-1 text-ink hover:bg-surface-2',
            ].join(' ')}
          >
            {page}
          </button>
        )
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-sm py-xs text-body-sm text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}

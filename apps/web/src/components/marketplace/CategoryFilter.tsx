'use client';

import React from 'react';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const categories = [
  { value: '', label: 'All' },
  { value: 'fiksi', label: 'Fiction' },
  { value: 'paper', label: 'Paper' },
  { value: 'puisi', label: 'Poetry' },
  { value: 'non-fiksi', label: 'Non-Fiction' },
];

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-xs overflow-x-auto">
      {categories.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={[
            'text-body-sm py-sm px-md rounded-none whitespace-nowrap border-b-2 transition-colors',
            value === cat.value
              ? 'text-ink font-semibold border-primary'
              : 'text-ink-muted border-transparent hover:text-ink hover:border-ink-subtle',
          ].join(' ')}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

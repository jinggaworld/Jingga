'use client';

import React, { useState, useEffect } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search works...' }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <div className="relative">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="absolute left-sm top-1/2 -translate-y-1/2 text-ink-subtle"
      >
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14.5 14.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-1 text-body py-sm pl-xl pr-xl rounded-none border-b border-hairline focus:border-primary focus:border-b-2 outline-none transition-colors"
      />
      {localValue && (
        <button
          onClick={() => { setLocalValue(''); onChange(''); }}
          className="absolute right-sm top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
        >
          ×
        </button>
      )}
    </div>
  );
}

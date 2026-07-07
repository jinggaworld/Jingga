'use client';

import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = '' }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id || '');
  const current = activeTab ?? internalActive;

  const handleChange = (id: string) => {
    if (!activeTab) setInternalActive(id);
    onChange?.(id);
  };

  return (
    <div
      className={[
        'flex border-b border-hairline overflow-x-auto',
        className,
      ].join(' ')}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === current;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.id)}
            className={[
              'px-lg py-md text-body-sm rounded-none whitespace-nowrap transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? 'text-ink font-semibold border-primary'
                : 'text-ink-muted border-transparent hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-xs text-caption text-ink-subtle">
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';

interface GridProps {
  children: React.ReactNode;
  cols?: number;
  gap?: string;
  className?: string;
}

export function Grid({ children, cols = 4, gap = 'gap-md', className = '' }: GridProps) {
  const colClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }[cols] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={['grid', colClass, gap, className].join(' ')}>
      {children}
    </div>
  );
}

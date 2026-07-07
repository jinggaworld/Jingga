import React from 'react';

interface HeroCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HeroCard({ children, className = '' }: HeroCardProps) {
  return (
    <div
      className={[
        'bg-canvas border border-hairline rounded-none p-xxl',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

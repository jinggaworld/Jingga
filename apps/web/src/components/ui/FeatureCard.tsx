import React from 'react';

interface FeatureCardProps {
  elevated?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FeatureCard({ elevated = false, children, className = '' }: FeatureCardProps) {
  return (
    <div
      className={[
        'border border-hairline rounded-none p-lg',
        elevated ? 'bg-surface-1' : 'bg-canvas',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function FeatureCardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={['text-card-title text-ink mb-sm', className].join(' ')}>
      {children}
    </h3>
  );
}

export function FeatureCardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={['text-body text-ink-muted', className].join(' ')}>
      {children}
    </p>
  );
}

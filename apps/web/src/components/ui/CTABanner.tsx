import React from 'react';

interface CTABannerProps {
  children: React.ReactNode;
  className?: string;
}

export function CTABanner({ children, className = '' }: CTABannerProps) {
  return (
    <div
      className={[
        'bg-primary text-on-primary rounded-none p-xxl',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

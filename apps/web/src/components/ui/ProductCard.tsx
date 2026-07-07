import React from 'react';

interface ProductCardProps {
  href?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProductCard({ href, children, className = '' }: ProductCardProps) {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={[
        'block border border-hairline rounded-none bg-canvas p-xl',
        'hover:border-ink-subtle transition-colors',
        href && 'cursor-pointer',
        className,
      ].join(' ')}
    >
      {children}
    </Wrapper>
  );
}

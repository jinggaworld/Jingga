import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'max';
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-[672px]',
  md: 'max-w-[1056px]',
  lg: 'max-w-[1312px]',
  xl: 'max-w-[1584px]',
  max: 'max-w-full',
};

export function Container({ children, size = 'xl', className = '' }: ContainerProps) {
  return (
    <div
      className={[
        'mx-auto w-full px-lg',
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

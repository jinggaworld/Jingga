import React from 'react';
import { UtilityBar } from './UtilityBar';
import { TopNav } from './TopNav';
import { Footer } from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <UtilityBar />
      <TopNav />
      <main className={['flex-1', className].join(' ')}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

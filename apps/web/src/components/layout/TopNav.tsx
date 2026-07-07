'use client';

import React, { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
}

interface TopNavProps {
  items?: NavItem[];
  className?: string;
}

export function TopNav({ items = [], className = '' }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const defaultItems: NavItem[] = [
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Upload', href: '/upload' },
  ];

  const navItems = items.length > 0 ? items : defaultItems;

  return (
    <nav
      className={[
        'border-b border-hairline bg-canvas sticky top-0 z-50',
        className,
      ].join(' ')}
    >
      <div className="mx-auto max-w-[1584px] flex items-center justify-between h-12 px-lg">
        {/* Logo */}
        <a href="/" className="text-headline font-semibold text-ink tracking-tight">
          Jingga
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-xl text-body-sm">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-ink-muted hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-sm">
          <button className="hidden md:inline-flex bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors">
            Connect Wallet
          </button>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-ink p-xs"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {mobileOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-hairline bg-canvas px-lg py-md">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block py-sm text-body-sm text-ink-muted hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
          <button className="mt-sm w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors">
            Connect Wallet
          </button>
        </div>
      )}
    </nav>
  );
}

'use client';

import React from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePendingSignatures } from '@/hooks/usePendingSignatures';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { walletAddress, isConnected, isConnecting, isRestoring, authMethod, error, connectFreighter, disconnect } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { data: pendingSignatures } = usePendingSignatures();
  const pendingCount = pendingSignatures?.count || 0;

  return (
    <div className="min-h-screen bg-canvas">

      {/* Top Navigation */}
      <nav className="border-b border-hairline bg-canvas py-sm px-lg sticky top-0 z-50">
        <div className="mx-auto max-w-[1584px] flex items-center justify-between">
          <a href="/" className="text-headline font-semibold text-ink tracking-tight">
            Jingga
          </a>
          <div className="flex items-center gap-xl text-body-sm">
            <a href="/marketplace" className="text-ink-muted hover:text-primary transition-colors">
              Marketplace
            </a>
            {isConnected && (
              <>
                <a href="/dashboard" className="text-ink-muted hover:text-primary transition-colors relative">
                  Dashboard
                  {pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-3 bg-semantic-error text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center px-1">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </a>
                <a href="/editor" className="text-ink-muted hover:text-primary transition-colors">
                  Editor
                </a>
                <a href="/upload" className="text-ink-muted hover:text-primary transition-colors">
                  Upload
                </a>
                <a href="/reader" className="text-ink-muted hover:text-primary transition-colors">
                  My Collection
                </a>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="text-ink-subtle hover:text-ink transition-colors p-xs"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              /* Sun icon for dark mode */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              /* Moon icon for light mode */
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Wallet Connection */}
          <div className="flex items-center gap-sm">
            {isRestoring ? (
              <span className="text-body-sm text-ink-subtle">Checking session...</span>
            ) : isConnecting ? (
              <span className="text-body-sm text-ink-muted">Connecting...</span>
            ) : isConnected && walletAddress ? (
              <div className="flex items-center gap-sm">
                <span className="w-2 h-2 rounded-full bg-semantic-success" />
                <span className="text-body-sm text-ink font-mono">{truncateAddress(walletAddress)}</span>
                <span className="text-caption text-ink-subtle">
                  {authMethod === 'email' ? 'Managed' : 'Freighter'}
                </span>
                <button
                  onClick={disconnect}
                  className="text-body-sm text-semantic-error hover:underline"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={connectFreighter}
                  className="bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors"
                >
                  Connect Wallet
                </button>
                <a
                  href="/login"
                  className="text-body-sm text-ink-muted hover:text-primary transition-colors"
                >
                  Sign In
                </a>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="mx-auto max-w-[1584px] mt-sm">
            <p className="text-body-sm text-semantic-error">{error}</p>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-inverse-canvas py-xxl px-lg text-inverse-ink-muted">
        <div className="mx-auto max-w-[1584px]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-xl mb-xl">
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">Platform</h3>
              <ul className="space-y-sm text-body-sm">
                <li><a href="/marketplace" className="hover:text-inverse-ink transition-colors">Marketplace</a></li>
                <li><a href="/upload" className="hover:text-inverse-ink transition-colors">Upload Work</a></li>
                <li><a href="/dashboard" className="hover:text-inverse-ink transition-colors">Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">Developers</h3>
              <ul className="space-y-sm text-body-sm">
                <li><a href="https://developers.stellar.org" className="hover:text-inverse-ink transition-colors" target="_blank" rel="noopener noreferrer">Stellar Docs</a></li>
                <li><a href="https://soroban.stellar.org" className="hover:text-inverse-ink transition-colors" target="_blank" rel="noopener noreferrer">Soroban Docs</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-body-emphasis text-inverse-ink mb-md">About</h3>
              <ul className="space-y-sm text-body-sm">
                <li>APAC Stellar Hackathon 2026</li>
                <li>Local Finance & Real-World Access (RWA)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-inverse-surface-1 pt-lg text-caption">
            © 2026 Jingga. Built on Stellar.
          </div>
        </div>
      </footer>
    </div>
  );
}

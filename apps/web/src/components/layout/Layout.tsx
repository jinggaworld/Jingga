'use client';

import React from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { usePendingSignatures } from '@/hooks/usePendingSignatures';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { walletAddress, isConnected, isConnecting, isRestoring, authMethod, error, connectFreighter, disconnect } = useAuth();
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
          </div>

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

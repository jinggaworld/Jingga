'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function ConnectWallet() {
  const { user, walletAddress, isConnected, isConnecting, isFreighterAvailable, authMethod, error, connectFreighter, disconnect } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (isConnecting) {
    return (
      <div className="flex items-center gap-sm text-body-sm text-ink-muted">
        <Spinner size="sm" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (isConnected && walletAddress) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-sm bg-surface-1 text-body-sm text-ink py-sm px-md rounded-none border border-hairline hover:bg-surface-2 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-semantic-success" />
          <span>{truncateAddress(walletAddress)}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-xs bg-canvas border border-hairline rounded-none min-w-[200px] z-50">
            <div className="px-md py-sm border-b border-hairline">
              <p className="text-caption text-ink-subtle">Wallet</p>
              <p className="text-body-sm text-ink font-mono break-all">{truncateAddress(walletAddress, 8)}</p>
              <span className="text-caption text-ink-subtle">
                {authMethod === 'email' ? 'Managed Wallet' : 'Freighter'}
              </span>
            </div>
            {user && (
              <div className="px-md py-sm border-b border-hairline">
                <p className="text-body-sm text-ink">{user.nama}</p>
                {user.email && <p className="text-caption text-ink-subtle">{user.email}</p>}
              </div>
            )}
            <a href="/dashboard" className="block px-md py-sm text-body-sm text-ink hover:bg-surface-1 transition-colors" onClick={() => setDropdownOpen(false)}>
              Dashboard
            </a>
            <button onClick={() => { disconnect(); setDropdownOpen(false); }} className="w-full text-left px-md py-sm text-body-sm text-semantic-error hover:bg-surface-1 transition-colors">
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-sm">
      <Button onClick={connectFreighter} variant="primary" size="md">
        Connect Wallet
      </Button>
      <a href="/login" className="text-body-sm text-ink-muted hover:text-primary transition-colors">
        Sign in
      </a>
      {error && <p className="text-caption text-semantic-error">{error}</p>}
    </div>
  );
}

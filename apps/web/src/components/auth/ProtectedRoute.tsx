'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isConnected, isConnecting, connectFreighter, isFreighterAvailable } = useAuth();

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-body text-ink-muted mt-md">Connecting...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-1">
        <div className="bg-canvas border border-hairline p-xl rounded-none max-w-md text-center">
          <h2 className="text-headline text-ink mb-md">Sign In Required</h2>
          <p className="text-body text-ink-muted mb-lg">
            Sign in to access this page.
          </p>
          <div className="flex flex-col gap-sm items-center">
            {isFreighterAvailable && (
              <Button onClick={connectFreighter} variant="primary" size="lg">
                Connect Wallet
              </Button>
            )}
            <a href="/login" className="text-body-sm text-primary hover:underline">
              Sign in with email
            </a>
            {!isFreighterAvailable && (
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm text-ink-muted hover:text-primary"
              >
                Install Freighter
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

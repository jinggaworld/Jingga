'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

type PurchaseState =
  | 'idle'
  | 'initiating'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error';

interface PurchaseFlowProps {
  karyaId: string;
  judul: string;
  harga: number;
  onSuccess?: (data: { txHash: string; accessUrl: string; expiresAt: string; explorerUrl: string }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export function PurchaseFlow({
  karyaId,
  judul,
  harga,
  onSuccess,
  onError,
  onCancel,
}: PurchaseFlowProps) {
  const [state, setState] = useState<PurchaseState>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    txHash: string;
    accessUrl: string;
    expiresAt: string;
    explorerUrl: string;
  } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const getToken = () => localStorage.getItem('jingga_auth_token');

  const handlePurchase = async () => {
    setState('initiating');
    setError('');

    try {
      // 1. Initiate payment - get XDR
      const token = getToken();
      const initiateRes = await fetch(`${API_BASE}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ karya_id: karyaId }),
      });

      if (!initiateRes.ok) {
        const initData = await initiateRes.json();
        throw new Error(initData.error || 'Failed to initiate payment');
      }

      const { xdr, amount, recipient, memo } = await initiateRes.json();

      // 2. Sign with Freighter
      setState('signing');

      // Check if Freighter is available
      if (typeof window === 'undefined' || !(window as any).freighter) {
        throw new Error('Freighter wallet not found. Please install Freighter extension.');
      }

      const freighter = (window as any).freighter;

      // Get network passphrase
      const networkPassphrase = process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015';

      // Sign transaction
      const signedXdr = await freighter.signTransaction(xdr, {
        networkPassphrase,
      });

      // 3. Confirm payment
      setState('confirming');

      const confirmRes = await fetch(`${API_BASE}/api/v1/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          signed_xdr: signedXdr,
          karya_id: karyaId,
        }),
      });

      if (!confirmRes.ok) {
        const confirmData = await confirmRes.json();
        throw new Error(confirmData.error || 'Failed to confirm payment');
      }

      const confirmData = await confirmRes.json();
      setResult(confirmData);
      setState('success');
      onSuccess?.(confirmData);
    } catch (err: any) {
      console.error('[PurchaseFlow] Error:', err);
      setError(err.message || 'Payment failed');
      setState('error');
      onError?.(err.message);
    }
  };

  if (state === 'success' && result) {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-10 h-10 bg-semantic-success/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-card-title text-ink">Payment Successful!</h3>
            <p className="text-body-sm text-ink-muted">File access has been granted</p>
          </div>
        </div>

        <div className="bg-surface-1 p-md mb-lg">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-ink-muted">Tx Hash</span>
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs"
            >
              {result.txHash.slice(0, 12)}...
            </a>
          </div>
        </div>

        <div className="flex gap-md">
          <a
            href={result.accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-lg py-md bg-primary text-on-primary text-body text-center hover:bg-primary-hover transition-colors"
          >
            Download File
          </a>
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
          >
            Stellar Explorer
          </a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-canvas border border-semantic-error p-xl">
        <div className="flex items-center gap-md mb-lg">
          <div className="w-10 h-10 bg-semantic-error/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-semantic-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h3 className="text-card-title text-ink">Payment Failed</h3>
            <p className="text-body-sm text-ink-muted">{error}</p>
          </div>
        </div>

        <div className="flex gap-md">
          <button
            onClick={handlePurchase}
            className="flex-1 px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (state === 'initiating' || state === 'signing' || state === 'confirming') {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <Spinner size="md" />
          <div>
            <h3 className="text-card-title text-ink">
              {state === 'initiating' && 'Preparing payment...'}
              {state === 'signing' && 'Waiting for wallet confirmation...'}
              {state === 'confirming' && 'Processing payment...'}
            </h3>
            <p className="text-body-sm text-ink-muted">
              {state === 'signing' && 'Freighter popup opened in browser'}
              {state === 'confirming' && 'Transaction submitted to Stellar'}
            </p>
          </div>
        </div>

        {state === 'signing' && (
          <p className="text-body-sm text-ink-muted mb-lg">
            If it doesn't appear, click the Freighter extension in your browser.
          </p>
        )}
      </div>
    );
  }

  // Idle state
  return (
    <div className="bg-canvas border border-hairline p-xl">
      <h3 className="text-card-title text-ink mb-sm">Purchase Access</h3>
      <p className="text-body text-ink-muted mb-lg">
        Pay {harga} XLM to access &ldquo;{judul}&rdquo;
      </p>

      <button
        onClick={handlePurchase}
        className="w-full px-lg py-md bg-primary text-on-primary text-body font-medium hover:bg-primary-hover transition-colors"
      >
        Buy Access: {harga} XLM
      </button>
    </div>
  );
}

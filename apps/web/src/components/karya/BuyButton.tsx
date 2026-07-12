'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseFlow } from '@/components/payment/PurchaseFlow';
import { ClaimPayment } from '@/components/payment/ClaimPayment';
import { FileAccess } from '@/components/payment/FileAccess';
import { PaymentMethodSelector, PaymentMethod } from '@/components/payment/PaymentMethodSelector';
import { CurrencyConverter } from '@/components/payment/CurrencyConverter';
import { Spinner } from '@/components/ui/Spinner';

interface BuyButtonProps {
  karyaId: string;
  judul: string;
  harga: number;
  issuerWallet: string;
  isOwner: boolean;
  onPurchaseComplete?: () => void;
}

type ActiveFlow = 'direct' | 'claimable' | 'path' | null;

export function BuyButton({ karyaId, judul, harga, issuerWallet, isOwner, onPurchaseComplete }: BuyButtonProps) {
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('xlm');
  const [selectedAsset, setSelectedAsset] = useState<string>('USDC');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    const checkPurchase = async () => {
      try {
        const token = localStorage.getItem('jingga_auth_token');
        const res = await fetch(`${API_BASE}/api/v1/payments/check/${karyaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setHasPurchased(data.purchased);
        }
      } catch (err) {
        // Silently fail
      } finally {
        setChecking(false);
      }
    };

    checkPurchase();
  }, [karyaId]);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    if (method === 'xlm') setActiveFlow('direct');
    else if (method === 'claimable') setActiveFlow('claimable');
    else if (method === 'stablecoin') setActiveFlow('path');
  };

  if (isOwner) {
    return (
      <div className="bg-surface-1 border border-hairline p-md text-center">
        <p className="text-body-sm text-ink-muted">This is your work</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center p-md">
        <Spinner size="sm" />
      </div>
    );
  }

  if (hasPurchased) {
    return <FileAccess karyaId={karyaId} />;
  }

  // Show active payment flow
  if (activeFlow === 'direct') {
    return (
      <PurchaseFlow
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        onSuccess={(data) => {
          setHasPurchased(true);
          setActiveFlow(null);
          onPurchaseComplete?.();
        }}
        onCancel={() => setActiveFlow(null)}
      />
    );
  }

  if (activeFlow === 'claimable') {
    return (
      <ClaimPayment
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        onSuccess={(data) => {
          setHasPurchased(true);
          setActiveFlow(null);
          onPurchaseComplete?.();
        }}
        onCancel={() => setActiveFlow(null)}
      />
    );
  }

  if (activeFlow === 'path') {
    return (
      <PathPaymentFlow
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        sourceAsset={selectedAsset}
        onSuccess={() => {
          setHasPurchased(true);
          setActiveFlow(null);
          onPurchaseComplete?.();
        }}
        onCancel={() => setActiveFlow(null)}
      />
    );
  }

  // Default: show payment method selection
  return (
    <div className="space-y-md">
      <PaymentMethodSelector
        harga={harga}
        selectedMethod={selectedMethod}
        selectedAsset={selectedAsset}
        onSelectMethod={handleSelectMethod}
        onSelectAsset={setSelectedAsset}
      />

      <p className="text-caption text-ink-subtle text-center">
        Direct XLM is fastest. Stablecoin uses Stellar DEX for auto-conversion.
      </p>
    </div>
  );
}

// ============================================================
// Path Payment Flow sub-component
// ============================================================
function PathPaymentFlow({
  karyaId,
  judul,
  harga,
  sourceAsset,
  onSuccess,
  onCancel,
}: {
  karyaId: string;
  judul: string;
  harga: number;
  sourceAsset: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<'idle' | 'quoting' | 'signing' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ txHash: string; accessUrl: string; explorerUrl: string } | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const getToken = () => localStorage.getItem('jingga_auth_token');
  const getNetworkPassphrase = () =>
    process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'public'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';

  const handlePayWithStablecoin = async () => {
    setState('quoting');
    setError('');

    try {
      // 1. Fetch exchange rate to calculate stablecoin amount
      const token = getToken();
      const ratesRes = await fetch(`${API_BASE}/api/v1/payments/rates`);
      if (!ratesRes.ok) throw new Error('Failed to fetch exchange rates');
      const ratesData = await ratesRes.json();
      const rate = ratesData.rates?.find((r: any) => r.asset === sourceAsset)?.price_in_xlm || 0.5;
      const stableAmount = harga / rate;

      // 2. Initiate path payment
      setState('signing');
      const initRes = await fetch(`${API_BASE}/api/v1/payments/path/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          karya_id: karyaId,
          source_asset: sourceAsset,
          source_amount: stableAmount,
        }),
      });

      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initiate path payment');
      }

      const { xdr, quote } = await initRes.json();

      // 4. Sign with Freighter
      if (typeof window === 'undefined' || !(window as any).freighter) {
        throw new Error('Freighter wallet not found');
      }
      const freighter = (window as any).freighter;
      const signedXdr = await freighter.signTransaction(xdr, {
        networkPassphrase: getNetworkPassphrase(),
      });

      // 5. Confirm path payment
      setState('confirming');
      const confirmRes = await fetch(`${API_BASE}/api/v1/payments/path/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          signed_xdr: signedXdr,
          karya_id: karyaId,
          source_asset: sourceAsset,
        }),
      });

      if (!confirmRes.ok) {
        const errData = await confirmRes.json();
        throw new Error(errData.error || 'Failed to confirm path payment');
      }

      const confirmData = await confirmRes.json();
      setResult(confirmData);
      setState('success');
      onSuccess();
    } catch (err: any) {
      console.error('[PathPayment] Error:', err);
      setError(err.message || 'Path payment failed');
      setState('error');
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
            <p className="text-body-sm text-ink-muted">Paid with {sourceAsset} via Stellar DEX</p>
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
            onClick={handlePayWithStablecoin}
            className="flex-1 px-lg py-md bg-primary text-on-primary text-body hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onCancel}
            className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (state !== 'idle') {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md mb-lg">
          <Spinner size="md" />
          <div>
            <h3 className="text-card-title text-ink">
              {state === 'quoting' && 'Getting exchange rate...'}
              {state === 'signing' && 'Waiting for wallet confirmation...'}
              {state === 'confirming' && 'Processing payment via Stellar DEX...'}
            </h3>
            <p className="text-body-sm text-ink-muted">
              {state === 'signing' && 'Freighter popup opened in browser'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-canvas border border-hairline p-xl">
      <h3 className="text-card-title text-ink mb-sm">Pay with {sourceAsset}</h3>
      <p className="text-body text-ink-muted mb-lg">
        Pay for &ldquo;{judul}&rdquo; using {sourceAsset}, automatically converted to XLM via Stellar DEX
      </p>

      <div className="mb-lg">
        <CurrencyConverter xlmAmount={harga} />
      </div>

      <div className="flex gap-md">
        <button
          onClick={handlePayWithStablecoin}
          className="flex-1 px-lg py-md bg-primary text-on-primary text-body font-medium hover:bg-primary-hover transition-colors"
        >
          Pay with {sourceAsset}
        </button>
        <button
          onClick={onCancel}
          className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

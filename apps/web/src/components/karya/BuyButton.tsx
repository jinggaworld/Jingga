'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseFlow } from '@/components/payment/PurchaseFlow';
import { FileAccess } from '@/components/payment/FileAccess';
import { Spinner } from '@/components/ui/Spinner';

interface BuyButtonProps {
  karyaId: string;
  judul: string;
  harga: number;
  issuerWallet: string;
  isOwner: boolean;
  onPurchaseComplete?: () => void;
}

export function BuyButton({ karyaId, judul, harga, issuerWallet, isOwner, onPurchaseComplete }: BuyButtonProps) {
  const [hasPurchased, setHasPurchased] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);

  useEffect(() => {
    const checkPurchase = async () => {
      try {
        const token = localStorage.getItem('jingga_token');
        const res = await fetch(`/api/v1/payments/check/${karyaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setHasPurchased(data.purchased);
        }
      } catch (err) {
        // Silently fail - user hasn't purchased
      } finally {
        setChecking(false);
      }
    };

    checkPurchase();
  }, [karyaId]);

  if (isOwner) {
    return (
      <div className="bg-surface-1 border border-hairline p-md text-center">
        <p className="text-body-sm text-ink-muted">Ini adalah karya Anda</p>
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

  // Show file access if already purchased
  if (hasPurchased) {
    return <FileAccess karyaId={karyaId} />;
  }

  // Show purchase flow if user clicked buy
  if (showPurchase) {
    return (
      <PurchaseFlow
        karyaId={karyaId}
        judul={judul}
        harga={harga}
        onSuccess={(data) => {
          setHasPurchased(true);
          setShowPurchase(false);
          onPurchaseComplete?.();
        }}
        onCancel={() => setShowPurchase(false)}
      />
    );
  }

  // Default: show buy button
  return (
    <button
      onClick={() => setShowPurchase(true)}
      className="w-full px-lg py-md bg-accent text-white text-body font-medium hover:bg-accent-hover transition-colors"
    >
      Beli Akses — {harga} XLM
    </button>
  );
}

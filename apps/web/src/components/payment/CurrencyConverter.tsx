'use client';

import React from 'react';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { Spinner } from '@/components/ui/Spinner';

interface CurrencyConverterProps {
  xlmAmount: number;
  onSelectAsset?: (asset: string) => void;
  selectedAsset?: string;
}

export function CurrencyConverter({
  xlmAmount,
  onSelectAsset,
  selectedAsset,
}: CurrencyConverterProps) {
  const { rates, loading, refresh } = useExchangeRate();

  const stablecoins = Object.keys(rates || {}).filter((a) => a !== 'XLM');

  if (loading && !rates) {
    return (
      <div className="flex items-center gap-sm text-body-sm text-ink-muted">
        <Spinner size="sm" />
        Fetching rates...
      </div>
    );
  }

  if (!rates || stablecoins.length === 0) {
    return (
      <div className="text-body-sm text-ink-muted">
        Rates unavailable
        <button
          onClick={refresh}
          className="ml-sm text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-hairline p-md">
      <p className="text-caption text-ink-muted uppercase tracking-wider mb-sm">
        Price: {xlmAmount} XLM
      </p>

      <div className="border-t border-hairline pt-sm">
        <p className="text-caption text-ink-muted mb-xs">Pay with stablecoin</p>
        <div className="space-y-xs">
          {stablecoins.map((asset) => {
            const rate = rates[asset];
            const stableAmount = xlmAmount / rate;
            const isSelected = selectedAsset === asset;

            return (
              <button
                key={asset}
                onClick={() => onSelectAsset?.(asset)}
                className={`w-full flex items-center justify-between px-sm py-xs text-body-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/10 border border-primary text-ink'
                    : 'border border-transparent hover:bg-surface-2 text-ink-muted'
                }`}
              >
                <span className="font-medium">{asset}</span>
                <span className="font-mono">
                  ≈ {stableAmount.toFixed(2)} {asset}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-caption text-ink-subtle mt-xs">
        Rate: 1 XLM ≈ {stablecoins.map((a) => `${rates[a].toFixed(4)} ${a}`).join(' / ')}
        {' | '}
        <span className="text-primary hover:underline cursor-pointer" onClick={refresh}>
          Refresh
        </span>
      </p>
    </div>
  );
}

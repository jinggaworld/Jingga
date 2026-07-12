'use client';

import React from 'react';
import { CurrencyConverter } from './CurrencyConverter';

type PaymentMethod = 'xlm' | 'stablecoin' | 'claimable';

interface PaymentMethodSelectorProps {
  harga: number;
  selectedMethod: PaymentMethod;
  selectedAsset?: string;
  onSelectMethod: (method: PaymentMethod) => void;
  onSelectAsset?: (asset: string) => void;
}

const METHODS: { key: PaymentMethod; label: string; description: string }[] = [
  {
    key: 'xlm',
    label: 'XLM (Stellar Native)',
    description: 'Pay directly with Stellar Lumens',
  },
  {
    key: 'stablecoin',
    label: 'USDC (Stablecoin)',
    description: 'Pay with USDC, auto-converted via Stellar DEX',
  },
  {
    key: 'claimable',
    label: 'Claimable Balance',
    description: 'Escrow-style payment: create a claim then claim it',
  },
];

export function PaymentMethodSelector({
  harga,
  selectedMethod,
  selectedAsset,
  onSelectMethod,
  onSelectAsset,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-sm">
      <p className="text-caption text-ink-muted uppercase tracking-wider mb-xs">
        Select Payment Method
      </p>

      {METHODS.map((method) => {
        const isSelected = selectedMethod === method.key;
        return (
          <button
            key={method.key}
            onClick={() => onSelectMethod(method.key)}
            className={`w-full text-left px-md py-sm border transition-colors ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-hairline hover:bg-surface-1'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-body-sm font-medium text-ink">
                  {method.label}
                </span>
                <p className="text-caption text-ink-muted mt-xs">
                  {method.description}
                </p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? 'border-primary' : 'border-hairline-strong'
                }`}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Show currency converter when stablecoin is selected */}
      {selectedMethod === 'stablecoin' && onSelectAsset && (
        <div className="ml-md">
          <CurrencyConverter
            xlmAmount={harga}
            onSelectAsset={onSelectAsset}
            selectedAsset={selectedAsset}
          />
        </div>
      )}
    </div>
  );
}

export type { PaymentMethod };

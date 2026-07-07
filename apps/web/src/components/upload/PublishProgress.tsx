'use client';

import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export type PublishStep =
  | 'idle'
  | 'creating'
  | 'uploading'
  | 'minting'
  | 'success'
  | 'error';

interface PublishProgressProps {
  step: PublishStep;
  message: string;
  txHash?: string;
  explorerUrl?: string;
  assetCode?: string;
  karyaId?: string;
  karyaJudul?: string;
  error?: string;
  onRetry?: () => void;
}

const stepOrder: PublishStep[] = ['creating', 'uploading', 'minting', 'success'];

export function PublishProgress({
  step,
  message,
  txHash,
  explorerUrl,
  assetCode,
  karyaJudul,
  error,
  onRetry,
}: PublishProgressProps) {
  if (step === 'error') {
    return (
      <div className="bg-canvas border border-hairline p-xl rounded-none text-center">
        <div className="w-16 h-16 rounded-full bg-semantic-error/10 flex items-center justify-center mx-auto mb-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-semantic-error">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <h3 className="text-headline text-ink mb-sm">Publish Failed</h3>
        <p className="text-body text-ink-muted mb-lg">{error || 'An error occurred'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-primary-hover transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="bg-canvas border border-hairline p-xl rounded-none text-center">
        <div className="w-16 h-16 rounded-full bg-semantic-success/10 flex items-center justify-center mx-auto mb-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-semantic-success">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
        <h3 className="text-headline text-ink mb-sm">Published Successfully!</h3>
        <p className="text-body text-ink-muted mb-lg">
          Your work is now live on the marketplace.
        </p>

        <div className="bg-surface-1 border border-hairline p-md rounded-none mb-lg text-left">
          {karyaJudul && (
            <div className="flex justify-between text-body-sm mb-xs">
              <span className="text-ink-muted">Title</span>
              <span className="text-ink font-medium">{karyaJudul}</span>
            </div>
          )}
          {assetCode && (
            <div className="flex justify-between text-body-sm mb-xs">
              <span className="text-ink-muted">Asset</span>
              <span className="text-ink font-mono">{assetCode}</span>
            </div>
          )}
          {txHash && (
            <div className="flex justify-between text-body-sm">
              <span className="text-ink-muted">Tx Hash</span>
              <span className="text-ink font-mono">{txHash.slice(0, 12)}...</span>
            </div>
          )}
        </div>

        <div className="flex gap-md justify-center">
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-primary text-primary text-button py-sm px-lg rounded-none hover:bg-surface-1 transition-colors"
            >
              View on Stellar Explorer
            </a>
          )}
          <a
            href="/upload"
            className="bg-primary text-on-primary text-button py-sm px-lg rounded-none hover:bg-primary-hover transition-colors"
          >
            Upload Another
          </a>
        </div>
      </div>
    );
  }

  // Progress steps
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="bg-canvas border border-hairline p-xl rounded-none">
      <div className="flex items-center gap-md mb-xl">
        <Spinner size="md" />
        <h3 className="text-headline text-ink">{message}</h3>
      </div>

      <div className="space-y-md">
        {stepOrder.slice(0, -1).map((s, i) => {
          const isComplete = i < currentIdx;
          const isCurrent = s === step;
          const isPending = i > currentIdx;

          return (
            <div key={s} className="flex items-center gap-md">
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-body-sm ${
                isComplete
                  ? 'bg-semantic-success text-white'
                  : isCurrent
                  ? 'bg-primary text-white'
                  : 'bg-surface-1 text-ink-subtle border border-hairline'
              }`}>
                {isComplete ? '✓' : i + 1}
              </div>
              <span className={`text-body-sm ${
                isComplete
                  ? 'text-semantic-success'
                  : isCurrent
                  ? 'text-ink font-medium'
                  : 'text-ink-subtle'
              }`}>
                {s === 'creating' && 'Creating work metadata...'}
                {s === 'uploading' && 'Uploading to IPFS...'}
                {s === 'minting' && 'Minting on Stellar...'}
              </span>
              {isCurrent && <Spinner size="sm" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

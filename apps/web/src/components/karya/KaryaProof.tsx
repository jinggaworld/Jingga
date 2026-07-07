'use client';

import React from 'react';

interface KaryaProofProps {
  proof: {
    verified: boolean;
    timestamp: string | null;
    blockHeight: number | null;
    explorer_url: string | null;
  } | null;
  txHash: string | null;
}

export function KaryaProof({ proof, txHash }: KaryaProofProps) {
  if (!txHash) {
    return (
      <div className="bg-surface-1 border border-hairline p-lg rounded-none">
        <h3 className="text-card-title text-ink mb-sm">Proof of Authorship</h3>
        <p className="text-body-sm text-ink-subtle">This work has not been minted on Stellar yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-1 border border-hairline p-lg rounded-none">
      <h3 className="text-card-title text-ink mb-md">Proof of Authorship</h3>

      <div className="flex items-center gap-sm mb-md">
        <div className={`w-3 h-3 rounded-full ${proof?.verified ? 'bg-semantic-success' : 'bg-semantic-warning'}`} />
        <span className={`text-body-sm font-medium ${proof?.verified ? 'text-semantic-success' : 'text-semantic-warning'}`}>
          {proof?.verified ? 'Verified on Stellar' : 'Verification pending'}
        </span>
      </div>

      <div className="space-y-sm text-body-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">Tx Hash</span>
          <span className="text-ink font-mono text-caption">{txHash.slice(0, 16)}...</span>
        </div>
        {proof?.timestamp && (
          <div className="flex justify-between">
            <span className="text-ink-muted">Timestamp</span>
            <span className="text-ink">{new Date(proof.timestamp).toLocaleString()}</span>
          </div>
        )}
        {proof?.blockHeight && (
          <div className="flex justify-between">
            <span className="text-ink-muted">Block Height</span>
            <span className="text-ink">{proof.blockHeight}</span>
          </div>
        )}
      </div>

      {proof?.explorer_url && (
        <a
          href={proof.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-xs mt-md text-body-sm text-primary hover:underline"
        >
          View on Stellar Explorer
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 9l6-6M9 3H4v5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </a>
      )}
    </div>
  );
}

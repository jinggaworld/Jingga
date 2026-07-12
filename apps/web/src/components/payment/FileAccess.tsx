'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';

interface FileAccessProps {
  karyaId: string;
}

interface AccessData {
  purchased: boolean;
  transaction: {
    txHash: string;
    purchasedAt: string;
  } | null;
}

interface AccessUrlData {
  accessUrl: string;
  expiresAt: string;
  judul: string;
}

export function FileAccess({ karyaId }: FileAccessProps) {
  const [access, setAccess] = useState<AccessData | null>(null);
  const [accessUrlData, setAccessUrlData] = useState<AccessUrlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const getToken = () => localStorage.getItem('jingga_auth_token');

  useEffect(() => {
    const fetchAccess = async () => {
      const token = getToken();

      try {
        // Check purchase status
        const checkRes = await fetch(`${API_BASE}/api/v1/payments/check/${karyaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!checkRes.ok) {
          throw new Error('Failed to check access');
        }

        const checkData = await checkRes.json();
        setAccess(checkData);

        // If purchased, fetch access URL
        if (checkData.purchased) {
          setLoadingUrl(true);
          try {
            const urlRes = await fetch(`${API_BASE}/api/v1/reader/access/${karyaId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });

            if (urlRes.ok) {
              const urlData = await urlRes.json();
              setAccessUrlData(urlData);
            }
          } catch {
            // Access URL fetch is non-critical
          } finally {
            setLoadingUrl(false);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [karyaId]);

  if (loading) {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md">
          <Spinner size="sm" />
          <span className="text-body-sm text-ink-muted">Checking access...</span>
        </div>
      </div>
    );
  }

  if (error || !access?.purchased) {
    return null; // Don't show if not purchased
  }

  const purchasedAt = access.transaction?.purchasedAt
    ? new Date(access.transaction.purchasedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-canvas border border-primary p-xl">
      <div className="flex items-center gap-md mb-lg">
        <div className="w-10 h-10 bg-semantic-success/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-semantic-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-card-title text-ink">File Tersedia!</h3>
          <p className="text-body-sm text-ink-muted">
            {accessUrlData ? `Akses ke "${accessUrlData.judul}"` : 'Akses file telah dibuka untuk Anda'}
          </p>
        </div>
      </div>

      {purchasedAt && (
        <div className="bg-surface-1 p-md mb-lg">
          <div className="flex items-center justify-between text-body-sm">
            <span className="text-ink-muted">Purchased on</span>
            <span className="text-ink">{purchasedAt}</span>
          </div>
          {access.transaction?.txHash && (
            <div className="flex items-center justify-between text-body-sm mt-xs">
              <span className="text-ink-muted">Transaction</span>
              <a
                href={`https://stellar.expert/testnet/tx/${access.transaction.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-mono text-xs"
              >
                {access.transaction.txHash.slice(0, 12)}...
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-md">
        {loadingUrl ? (
          <div className="flex-1 px-lg py-md bg-surface-2 text-ink-muted text-body text-center">
            Generating download link...
          </div>
        ) : accessUrlData ? (
          <a
            href={accessUrlData.accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-lg py-md bg-primary text-on-primary text-body text-center font-medium hover:bg-primary-hover transition-colors"
          >
            Download File
          </a>
        ) : (
          <div className="flex-1 px-lg py-md bg-surface-2 text-ink-muted text-body text-center">
            File unavailable
          </div>
        )}
        {accessUrlData && (
          <a
            href={accessUrlData.accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
          >
            Read Online
          </a>
        )}
      </div>
    </div>
  );
}

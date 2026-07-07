'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';

interface FileAccessProps {
  karyaId: string;
}

interface FileAccessData {
  purchased: boolean;
  transaction: {
    txHash: string;
    purchasedAt: string;
  } | null;
}

export function FileAccess({ karyaId }: FileAccessProps) {
  const [access, setAccess] = useState<FileAccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('jingga_token');
        const res = await fetch(`/api/v1/payments/check/${karyaId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error('Failed to check access');
        }

        const data = await res.json();
        setAccess(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [karyaId]);

  if (loading) {
    return (
      <div className="bg-canvas border border-hairline p-xl">
        <div className="flex items-center gap-md">
          <Spinner size="sm" />
          <span className="text-body-sm text-ink-muted">Memeriksa akses...</span>
        </div>
      </div>
    );
  }

  if (error || !access?.purchased) {
    return null; // Don't show if not purchased
  }

  return (
    <div className="bg-canvas border border-accent p-xl">
      <div className="flex items-center gap-md mb-lg">
        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center">
          <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-card-title text-ink">File Tersedia!</h3>
          <p className="text-body-sm text-ink-muted">Akses file telah dibuka untuk Anda</p>
        </div>
      </div>

      <div className="bg-surface-2 p-md mb-lg">
        <div className="flex items-center justify-between text-body-sm">
          <span className="text-ink-muted">Dibeli pada</span>
          <span className="text-ink">
            {new Date(access.transaction?.purchasedAt || '').toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      <div className="flex gap-md">
        <a
          href={`/api/v1/karya/${karyaId}/download`}
          className="flex-1 px-lg py-md bg-accent text-white text-body text-center hover:bg-accent-hover transition-colors"
        >
          Download File
        </a>
        <a
          href={`/karya/${karyaId}/read`}
          className="px-lg py-md border border-hairline text-ink text-body hover:bg-surface-1 transition-colors"
        >
          Baca Online
        </a>
      </div>
    </div>
  );
}

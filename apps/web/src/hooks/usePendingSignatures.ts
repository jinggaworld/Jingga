'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getAuthToken } from '@/lib/api';

export interface PendingLicense {
  id: string;
  karya_id: string;
  karya_judul: string;
  purchaser_wallet: string;
  license_type: string;
  territory: string;
  duration: string;
  license_fee: number;
  issued_at: string;
}

export interface PendingSignaturesResponse {
  count: number;
  licenses: PendingLicense[];
}

/**
 * Hook to fetch licenses pending on-chain signing for the connected author.
 * Auto-refreshes every 30 seconds when there are pending items.
 */
export function usePendingSignatures() {
  const [data, setData] = useState<PendingSignaturesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setData(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/v1/licenses/pending-signatures`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setData(null);
        return;
      }

      const result: PendingSignaturesResponse = await res.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error('[PendingSignatures] Error:', err);
      setError(err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();

    // Auto-refresh every 30s if there are pending items
    const interval = setInterval(() => {
      // Only re-fetch if we know there are pending or we haven't loaded yet
      fetchPending();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchPending]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchPending();
  }, [fetchPending]);

  return { data, loading, error, refetch };
}

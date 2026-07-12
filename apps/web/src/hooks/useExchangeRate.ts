'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api';

export interface ExchangeRates {
  [asset: string]: number; // asset -> XLM price
}

export function useExchangeRate() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/v1/payments/rates`);
      if (!res.ok) throw new Error('Failed to fetch rates');
      const data = await res.json();

      const rateMap: ExchangeRates = {};
      if (data.rates) {
        for (const r of data.rates) {
          rateMap[r.asset] = r.price_in_xlm;
        }
      }
      setRates(rateMap);
      setError(null);
    } catch (err: any) {
      console.error('[ExchangeRate] Error:', err);
      setError(err.message || 'Failed to fetch rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
    // Refresh every 60 seconds
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convertToXLM = (asset: string, amount: number): number | null => {
    if (!rates || !rates[asset]) return null;
    return amount * rates[asset];
  };

  const convertFromXLM = (asset: string, xlmAmount: number): number | null => {
    if (!rates || !rates[asset] || rates[asset] === 0) return null;
    return xlmAmount / rates[asset];
  };

  const formatAssetAmount = (asset: string, amount: number): string => {
    if (asset === 'XLM') return `${amount.toFixed(2)} XLM`;
    return `${amount.toFixed(2)} ${asset}`;
  };

  return {
    rates,
    loading,
    error,
    refresh: fetchRates,
    convertToXLM,
    convertFromXLM,
    formatAssetAmount,
  };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export type SortOption = 'newest' | 'popular' | 'price_asc' | 'price_desc';

export interface MarketplaceKarya {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  cover_image_url: string | null;
  issuer_wallet: string;
  issuer_name: string;
  total_sales: number;
  total_revenue: number;
  created_at: string;
  file_type: string | null;
}

interface MarketplaceData {
  karya: MarketplaceKarya[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useMarketplace() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<MarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const kategori = searchParams.get('kategori') || '';
  const sort = (searchParams.get('sort') || 'newest') as SortOption;
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (kategori) params.set('kategori', kategori);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));

    fetch(`/api/v1/marketplace?${params.toString()}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ karya: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }))
      .finally(() => setLoading(false));
  }, [search, kategori, sort, page]);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    if (updates.search !== undefined || updates.kategori !== undefined || updates.sort !== undefined) {
      params.delete('page');
    }
    router.push(`/marketplace?${params.toString()}`);
  }, [searchParams, router]);

  return { data, loading, search, kategori, sort, page, updateParams };
}

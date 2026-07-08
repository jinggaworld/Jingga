import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('jingga_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Dashboard overview
export interface DashboardStats {
  totalKarya: number;
  totalPublished: number;
  totalDraft: number;
  totalArchived: number;
  totalRevenue: number;
  totalSales: number;
  totalViews: number;
}

export interface RecentTransaction {
  id: string;
  karya_id: string;
  karya_judul: string;
  karya_cover: string | null;
  buyer_wallet: string;
  jumlah: number;
  tx_hash: string;
  status: string;
  created_at: string;
  explorer_url: string | null;
}

export interface RecentKarya {
  id: string;
  judul: string;
  kategori: string;
  status: string;
  cover_image_url: string | null;
  total_sales?: number;
  total_revenue?: number;
  created_at: string;
}

export interface DashboardOverview {
  stats: DashboardStats;
  recentTransactions: RecentTransaction[];
  recentKarya: RecentKarya[];
}

// Karya list
export interface KaryaListItem {
  id: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  status: string;
  cover_image_url: string | null;
  stellar_asset_code: string | null;
  total_sales?: number;
  total_revenue?: number;
  created_at: string;
  published_at: string | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KaryaListResponse {
  karya: KaryaListItem[];
  pagination: Pagination;
}

// Transaction history
export interface Transaction {
  id: string;
  karya_id: string;
  karya_judul: string;
  buyer_wallet: string;
  jumlah: number;
  tx_hash: string;
  status: string;
  created_at: string;
  explorer_url: string | null;
}

export interface TransactionSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgPerTransaction: number;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  pagination: Pagination;
  summary: TransactionSummary;
}

// Revenue breakdown
export interface RevenueItem {
  karya_id: string;
  judul: string;
  cover_image_url: string | null;
  total_sales: number;
  total_revenue: number;
  percentage_of_total: number;
}

export interface RevenueBreakdownResponse {
  revenue: RevenueItem[];
  totalRevenue: number;
}

// Hook for dashboard overview
export function useDashboardOverview() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest<DashboardOverview>('/api/v1/dashboard');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, loading, error, refetch: fetchOverview };
}

// Hook for karya list
export function useDashboardKarya(status?: string, page: number = 1) {
  const [data, setData] = useState<KaryaListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKarya = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (status && status !== 'all') params.set('status', status);
      params.set('page', String(page));
      const query = params.toString();
      const result = await apiRequest<KaryaListResponse>(
        `/api/v1/dashboard/karya${query ? `?${query}` : ''}`
      );
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchKarya();
  }, [fetchKarya]);

  return { data, loading, error, refetch: fetchKarya };
}

// Hook for transaction history
export function useDashboardTransactions(karyaId?: string, page: number = 1) {
  const [data, setData] = useState<TransactionHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (karyaId) params.set('karya_id', karyaId);
      params.set('page', String(page));
      const query = params.toString();
      const result = await apiRequest<TransactionHistoryResponse>(
        `/api/v1/dashboard/transactions${query ? `?${query}` : ''}`
      );
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [karyaId, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return { data, loading, error, refetch: fetchTransactions };
}

// Hook for revenue breakdown
export function useDashboardRevenue() {
  const [data, setData] = useState<RevenueBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest<RevenueBreakdownResponse>('/api/v1/dashboard/revenue');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  return { data, loading, error, refetch: fetchRevenue };
}

// Archive karya
export async function archiveKarya(karyaId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/v1/dashboard/archive/${karyaId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to archive' }));
    throw new Error(err.error);
  }
  return true;
}

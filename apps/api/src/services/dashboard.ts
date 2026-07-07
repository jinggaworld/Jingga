import { supabaseAdmin } from '../lib/supabase';

export class DashboardError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number = 500) {
    super(message);
    this.name = 'DashboardError';
    this.code = code;
    this.status = status;
  }
}

export const DASHBOARD_ERRORS = {
  DATABASE_NOT_CONFIGURED: new DashboardError('Database not configured', 'DATABASE_NOT_CONFIGURED', 500),
  USER_NOT_FOUND: new DashboardError('User not found', 'USER_NOT_FOUND', 404),
  KARYA_NOT_FOUND: new DashboardError('Karya not found', 'KARYA_NOT_FOUND', 404),
  NOT_AUTHORIZED: new DashboardError('Not authorized to modify this karya', 'NOT_AUTHORIZED', 403),
};

// Get dashboard overview stats
export async function getDashboardStats(walletAddress: string) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  // Get total karya counts by status
  const { data: karyaCounts, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('id, status')
    .eq('issuer_wallet', walletAddress);

  if (karyaError) {
    console.error('[Dashboard] Karya count error:', karyaError);
    throw new DashboardError('Failed to fetch karya counts', 'KARYA_COUNT_ERROR');
  }

  const totalKarya = karyaCounts?.length || 0;
  const totalPublished = karyaCounts?.filter(k => k.status === 'published').length || 0;
  const totalDraft = karyaCounts?.filter(k => k.status === 'draft').length || 0;
  const totalArchived = karyaCounts?.filter(k => k.status === 'archived').length || 0;

  // Get total sales and revenue from transactions
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('jumlah')
    .eq('seller_wallet', walletAddress)
    .eq('status', 'confirmed');

  if (txError) {
    console.error('[Dashboard] Transaction count error:', txError);
    throw new DashboardError('Failed to fetch transactions', 'TRANSACTION_COUNT_ERROR');
  }

  const totalSales = transactions?.length || 0;
  const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.jumlah || 0), 0) || 0;

  // Get total views
  const { data: viewCounts, error: viewError } = await supabaseAdmin
    .from('karya_views')
    .select('id')
    .in('karya_id', karyaCounts?.map(k => k.id) || []);

  if (viewError) {
    console.error('[Dashboard] View count error:', viewError);
    // Views are non-critical, don't throw
  }

  const totalViews = viewCounts?.length || 0;

  return {
    totalKarya,
    totalPublished,
    totalDraft,
    totalArchived,
    totalRevenue,
    totalSales,
    totalViews,
  };
}

// Get recent transactions for dashboard
export async function getRecentTransactions(walletAddress: string, limit: number = 5) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  const { data: transactions, error } = await supabaseAdmin
    .from('transactions')
    .select('id, karya_id, buyer_wallet, jumlah, tx_hash, status, created_at, karya(id, judul, cover_image_url)')
    .eq('seller_wallet', walletAddress)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Dashboard] Recent transactions error:', error);
    throw new DashboardError('Failed to fetch recent transactions', 'RECENT_TX_ERROR');
  }

  return (transactions || []).map(tx => ({
    id: tx.id,
    karya_id: tx.karya_id,
    karya_judul: (tx.karya as any)?.judul || 'Unknown',
    karya_cover: (tx.karya as any)?.cover_image_url || null,
    buyer_wallet: tx.buyer_wallet,
    jumlah: tx.jumlah,
    tx_hash: tx.tx_hash,
    status: tx.status,
    created_at: tx.created_at,
    explorer_url: tx.tx_hash
      ? `https://stellar.expert/testnet/tx/${tx.tx_hash}`
      : null,
  }));
}

// Get writer's karya list with details
export async function getKaryaList(
  walletAddress: string,
  options: { status?: string; page?: number; limit?: number } = {}
) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  const { status, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('karya')
    .select('*', { count: 'exact' })
    .eq('issuer_wallet', walletAddress);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: karya, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Dashboard] Karya list error:', error);
    throw new DashboardError('Failed to fetch karya list', 'KARYA_LIST_ERROR');
  }

  return {
    karya: karya || [],
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// Get transaction history with pagination
export async function getTransactionHistory(
  walletAddress: string,
  options: { karya_id?: string; page?: number; limit?: number } = {}
) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  const { karya_id, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('transactions')
    .select('id, karya_id, buyer_wallet, jumlah, tx_hash, status, created_at, karya(id, judul)', { count: 'exact' })
    .eq('seller_wallet', walletAddress)
    .eq('status', 'confirmed');

  if (karya_id) {
    query = query.eq('karya_id', karya_id);
  }

  const { data: transactions, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Dashboard] Transaction history error:', error);
    throw new DashboardError('Failed to fetch transaction history', 'TX_HISTORY_ERROR');
  }

  const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.jumlah || 0), 0) || 0;
  const totalTransactions = count || 0;
  const avgPerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  return {
    transactions: (transactions || []).map(tx => ({
      id: tx.id,
      karya_id: tx.karya_id,
      karya_judul: (tx.karya as any)?.judul || 'Unknown',
      buyer_wallet: tx.buyer_wallet,
      jumlah: tx.jumlah,
      tx_hash: tx.tx_hash,
      status: tx.status,
      created_at: tx.created_at,
      explorer_url: tx.tx_hash
        ? `https://stellar.expert/testnet/tx/${tx.tx_hash}`
        : null,
    })),
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
    summary: {
      totalRevenue,
      totalTransactions,
      avgPerTransaction,
    },
  };
}

// Get revenue breakdown per karya
export async function getRevenueBreakdown(walletAddress: string) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  // Get all karya for this writer
  const { data: karyaList, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('id, judul, cover_image_url, status')
    .eq('issuer_wallet', walletAddress)
    .eq('status', 'published');

  if (karyaError) {
    console.error('[Dashboard] Revenue karya error:', karyaError);
    throw new DashboardError('Failed to fetch karya for revenue', 'REVENUE_KARYA_ERROR');
  }

  if (!karyaList || karyaList.length === 0) {
    return { revenue: [], totalRevenue: 0 };
  }

  // Get sales per karya
  const revenue = await Promise.all(
    karyaList.map(async (karya) => {
      const { data: transactions, error: txError } = await supabaseAdmin!
        .from('transactions')
        .select('jumlah')
        .eq('karya_id', karya.id)
        .eq('seller_wallet', walletAddress)
        .eq('status', 'confirmed');

      if (txError) {
        console.error('[Dashboard] Revenue tx error for karya:', karya.id, txError);
        return {
          karya_id: karya.id,
          judul: karya.judul,
          cover_image_url: karya.cover_image_url,
          total_sales: 0,
          total_revenue: 0,
          percentage_of_total: 0,
        };
      }

      const totalSales = transactions?.length || 0;
      const totalRevenue = transactions?.reduce((sum, tx) => sum + (tx.jumlah || 0), 0) || 0;

      return {
        karya_id: karya.id,
        judul: karya.judul,
        cover_image_url: karya.cover_image_url,
        total_sales: totalSales,
        total_revenue: totalRevenue,
        percentage_of_total: 0, // Will be calculated below
      };
    })
  );

  // Calculate total revenue and percentages
  const grandTotal = revenue.reduce((sum, r) => sum + r.total_revenue, 0);
  revenue.forEach(r => {
    r.percentage_of_total = grandTotal > 0 ? Math.round((r.total_revenue / grandTotal) * 100) : 0;
  });

  // Sort by revenue descending
  revenue.sort((a, b) => b.total_revenue - a.total_revenue);

  return { revenue, totalRevenue: grandTotal };
}

// Archive karya
export async function archiveKarya(karyaId: string, walletAddress: string) {
  if (!supabaseAdmin) {
    throw DASHBOARD_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  const { data: karya, error: fetchError } = await supabaseAdmin
    .from('karya')
    .select('issuer_wallet, status')
    .eq('id', karyaId)
    .single();

  if (fetchError || !karya) {
    throw DASHBOARD_ERRORS.KARYA_NOT_FOUND;
  }

  if (karya.issuer_wallet !== walletAddress) {
    throw DASHBOARD_ERRORS.NOT_AUTHORIZED;
  }

  const { error: updateError } = await supabaseAdmin
    .from('karya')
    .update({ status: 'archived' })
    .eq('id', karyaId);

  if (updateError) {
    console.error('[Dashboard] Archive error:', updateError);
    throw new DashboardError('Failed to archive karya', 'ARCHIVE_ERROR');
  }

  return { success: true };
}

import { supabaseAdmin } from '../lib/supabase';
import { getSignedUrl, getGatewayUrl } from '../lib/ipfs';

export class ReaderError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number = 500) {
    super(message);
    this.name = 'ReaderError';
    this.code = code;
    this.status = status;
  }
}

export const READER_ERRORS = {
  DATABASE_NOT_CONFIGURED: new ReaderError('Database not configured', 'DATABASE_NOT_CONFIGURED', 500),
  NOT_PURCHASED: new ReaderError('You have not purchased this karya', 'NOT_PURCHASED', 403),
  KARYA_NOT_FOUND: new ReaderError('Karya not found', 'KARYA_NOT_FOUND', 404),
  ACCESS_EXPIRED: new ReaderError('Access URL has expired', 'ACCESS_EXPIRED', 410),
};

// Get reader dashboard overview
export async function getReaderDashboard(walletAddress: string) {
  if (!supabaseAdmin) {
    throw READER_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  // Get all purchases
  const { data: purchases, error: purchaseError } = await supabaseAdmin
    .from('transactions')
    .select('id, karya_id, jumlah, tx_hash, created_at, karya(id, judul, cover_image_url, kategori, issuer_wallet, users!issuer_wallet(nama))')
    .eq('buyer_wallet', walletAddress)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false });

  if (purchaseError) {
    console.error('[Reader] Purchases error:', purchaseError);
    throw new ReaderError('Failed to fetch purchases', 'PURCHASES_ERROR');
  }

  const totalPurchased = purchases?.length || 0;
  const totalSpent = purchases?.reduce((sum, tx) => sum + (tx.jumlah || 0), 0) || 0;

  // Determine favorite category
  const categoryCount: Record<string, number> = {};
  purchases?.forEach(tx => {
    const karya = tx.karya as any;
    if (karya?.kategori) {
      categoryCount[karya.kategori] = (categoryCount[karya.kategori] || 0) + 1;
    }
  });
  const favoriteCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Build recent purchases (last 5)
  const recentPurchases = (purchases || []).slice(0, 5).map(tx => {
    const karya = tx.karya as any;
    const author = karya?.users as any;
    return {
      karya_id: tx.karya_id,
      judul: karya?.judul || 'Unknown',
      cover_image_url: karya?.cover_image_url || null,
      kategori: karya?.kategori || 'unknown',
      issuer_name: author?.nama || 'Unknown Author',
      jumlah: tx.jumlah,
      purchased_at: tx.created_at,
      tx_hash: tx.tx_hash,
    };
  });

  // Get recommendations based on favorite category
  let recommendations: any[] = [];
  if (favoriteCategory) {
    // Get karya IDs already purchased
    const purchasedKaryaIds = purchases?.map(tx => tx.karya_id) || [];

    let recQuery = supabaseAdmin
      .from('karya')
      .select('id, judul, cover_image_url, kategori, harga, issuer_wallet, users!issuer_wallet(nama)')
      .eq('status', 'published')
      .eq('kategori', favoriteCategory)
      .order('created_at', { ascending: false })
      .limit(6);

    if (purchasedKaryaIds.length > 0) {
      recQuery = recQuery.not('id', 'in', `(${purchasedKaryaIds.join(',')})`);
    }

    const { data: recs } = await recQuery;

    recommendations = (recs || []).map((k: any) => ({
      id: k.id,
      judul: k.judul,
      cover_image_url: k.cover_image_url,
      kategori: k.kategori,
      harga: k.harga,
      issuer_name: k.users?.nama || 'Unknown Author',
    }));
  }

  return {
    stats: {
      totalPurchased,
      totalSpent,
      favoriteCategory,
    },
    recentPurchases,
    recommendations,
  };
}

// Get all purchases with pagination
export async function getPurchaseList(
  walletAddress: string,
  options: { kategori?: string; page?: number; limit?: number } = {}
) {
  if (!supabaseAdmin) {
    throw READER_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  const { kategori, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('transactions')
    .select('id, karya_id, jumlah, tx_hash, status, created_at, karya(id, judul, cover_image_url, kategori, harga, issuer_wallet, users!issuer_wallet(nama))', { count: 'exact' })
    .eq('buyer_wallet', walletAddress)
    .eq('status', 'confirmed');

  if (kategori && kategori !== 'all') {
    query = query.eq('karya.kategori', kategori);
  }

  const { data: purchases, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Reader] Purchase list error:', error);
    throw new ReaderError('Failed to fetch purchase list', 'PURCHASE_LIST_ERROR');
  }

  return {
    purchases: (purchases || []).map(tx => {
      const karya = tx.karya as any;
      const author = karya?.users as any;
      return {
        karya_id: tx.karya_id,
        judul: karya?.judul || 'Unknown',
        cover_image_url: karya?.cover_image_url || null,
        kategori: karya?.kategori || 'unknown',
        harga: karya?.harga || 0,
        issuer_name: author?.nama || 'Unknown Author',
        jumlah: tx.jumlah,
        purchased_at: tx.created_at,
        tx_hash: tx.tx_hash,
        explorer_url: tx.tx_hash
          ? `https://stellar.expert/testnet/tx/${tx.tx_hash}`
          : null,
      };
    }),
    pagination: {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

// Generate fresh access URL for purchased karya
export async function getDownloadUrl(buyerWallet: string, karyaId: string) {
  if (!supabaseAdmin) {
    throw READER_ERRORS.DATABASE_NOT_CONFIGURED;
  }

  // Verify purchase exists
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('buyer_wallet', buyerWallet)
    .eq('karya_id', karyaId)
    .eq('status', 'confirmed')
    .limit(1)
    .single();

  if (purchaseError || !purchase) {
    throw READER_ERRORS.NOT_PURCHASED;
  }

  // Get karya IPFS link
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('ipfs_link, judul')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) {
    throw READER_ERRORS.KARYA_NOT_FOUND;
  }

  if (!karya.ipfs_link) {
    throw new ReaderError('Karya file not available', 'FILE_NOT_AVAILABLE', 404);
  }

  // Generate fresh signed URL (1 hour expiry)
  const url = await getSignedUrl(karya.ipfs_link, 3600);
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  return { accessUrl: url, expiresAt, judul: karya.judul };
}

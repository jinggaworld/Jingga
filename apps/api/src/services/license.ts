import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, transactionFromXDR } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { buildIssueLicenseXdr } from './soroban';

// ============================================================
// Error Handling
// ============================================================

export const LICENSE_ERRORS = {
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Karya not found', status: 404 },
  KARYA_NOT_PUBLISHED: { code: 'KARYA_NOT_PUBLISHED', message: 'Karya is not published', status: 400 },
  CANNOT_LICENSE_OWN: { code: 'CANNOT_LICENSE_OWN', message: 'Cannot purchase license for your own work', status: 400 },
  EXCLUSIVE_EXISTS: { code: 'EXCLUSIVE_EXISTS', message: 'An exclusive license already exists for this karya', status: 400 },
  LICENSE_NOT_FOUND: { code: 'LICENSE_NOT_FOUND', message: 'License not found', status: 404 },
  LICENSE_NOT_ACTIVE: { code: 'LICENSE_NOT_ACTIVE', message: 'License is not active', status: 400 },
  NOT_LICENSE_HOLDER: { code: 'NOT_LICENSE_HOLDER', message: 'You do not hold this license', status: 403 },
  TX_FAILED: { code: 'TX_FAILED', message: 'Transaction failed on Stellar network', status: 400 },
  ACCOUNT_NOT_FOUND: { code: 'ACCOUNT_NOT_FOUND', message: 'Wallet not activated on Stellar network. Please fund it first via Dashboard > Fund Wallet or use the Stellar testnet faucet.', status: 400 },
  INSUFFICIENT_BALANCE: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient XLM balance', status: 400 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', message: 'Database operation failed', status: 500 },
  ROYALTY_SPLIT_EXISTS: { code: 'ROYALTY_SPLIT_EXISTS', message: 'Royalty split already configured for this karya', status: 400 },
} as const;

export class LicenseError extends Error {
  code: string;
  status: number;

  constructor(errorKey: keyof typeof LICENSE_ERRORS) {
    const err = LICENSE_ERRORS[errorKey];
    super(err.message);
    this.name = 'LicenseError';
    this.code = err.code;
    this.status = err.status;
  }
}

// ============================================================
// Types
// ============================================================

export interface LicensePurchaseInput {
  karya_id: string;
  purchaser_wallet: string;
  license_type: 'exclusive' | 'non-exclusive';
  territory: string;
  duration: string;
}

export interface LicensePurchaseResult {
  license_id: string;
  tx_hash: string;
  license_fee: number;
  explorer_url: string;
  xdr?: string; // For Freighter signing if needed
  requires_signing: boolean;
}

export interface ResaleInput {
  license_id: string;
  seller_wallet: string;
  buyer_wallet: string;
  sale_price: number;
}

export interface ResaleResult {
  resale_id: string;
  sale_price: number;
  author_royalty: number;
  author_wallet: string;
  seller_receives: number;
  seller_wallet: string;
  tx_hash: string;
  explorer_url: string;
  xdr?: string;
  requires_signing: boolean;
}

export interface LicenseDetail {
  id: string;
  karya_id: string;
  karya_judul: string;
  purchaser_wallet: string;
  original_author_wallet: string;
  original_author_name: string;
  license_type: string;
  territory: string;
  duration: string;
  resale_percentage: number;
  license_fee: number;
  status: string;
  issued_at: string;
  expires_at: string | null;
  resale_count: number;
  total_resale_volume: number;
}

// ============================================================
// License Service
// ============================================================

/**
 * Purchase a license for a karya
 */
export async function purchaseLicense(
  input: LicensePurchaseInput
): Promise<LicensePurchaseResult> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { karya_id, purchaser_wallet, license_type, territory, duration } = input;

  // 1. Fetch karya
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karya_id)
    .single();

  if (karyaError || !karya) throw new LicenseError('KARYA_NOT_FOUND');
  if (karya.status !== 'published') throw new LicenseError('KARYA_NOT_PUBLISHED');
  if (karya.issuer_wallet === purchaser_wallet) throw new LicenseError('CANNOT_LICENSE_OWN');

  // 2. Check if exclusive license exists
  if (license_type === 'exclusive') {
    const { data: existingExclusive } = await supabaseAdmin
      .from('licenses')
      .select('id')
      .eq('karya_id', karya_id)
      .eq('license_type', 'exclusive')
      .eq('status', 'active')
      .single();

    if (existingExclusive) throw new LicenseError('EXCLUSIVE_EXISTS');
  }

  // 3. Calculate license fee (configurable: default 5x the karya price)
  const licenseFee = karya.harga * 5;
  const amount = licenseFee.toString();
  const memo = `JINGGA:LICENSE:${karya_id.slice(0, 8)}`;

  // 4. Calculate expiry date based on duration
  let expiresAt: string | null = null;
  if (duration !== 'perpetual') {
    const durationMap: Record<string, number> = {
      '1year': 365,
      '2years': 730,
      '5years': 1825,
    };
    const days = durationMap[duration] || 365;
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  try {
    // 5. Build Stellar payment transaction
    const buyerAccount = await getServer().loadAccount(purchaser_wallet);

    const transaction = new StellarSdk.TransactionBuilder(buyerAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(StellarSdk.Operation.payment({
        destination: karya.issuer_wallet,
        asset: StellarSdk.Asset.native(),
        amount,
      }))
      .addMemo(StellarSdk.Memo.text(memo))
      .setTimeout(300)
      .build();

    // Return XDR for Freighter signing
    const xdr = transaction.toXDR();

    return {
      license_id: '',
      tx_hash: '',
      license_fee: licenseFee,
      explorer_url: '',
      xdr,
      requires_signing: true,
    };
  } catch (error: any) {
    console.error('[License] Purchase error:', error);
    // Wallet not activated on Stellar network (e.g., never funded on testnet)
    if (error.name === 'NotFoundError' || error.constructor?.name === 'NotFoundError' || error.response?.status === 404) {
      throw new LicenseError('ACCOUNT_NOT_FOUND');
    }
    if (error.message?.includes('insufficient')) {
      throw new LicenseError('INSUFFICIENT_BALANCE');
    }
    throw new LicenseError('TX_FAILED');
  }
}

/**
 * Confirm license purchase after Stellar transaction is signed & submitted
 */
export async function confirmLicensePurchase(
  signedXdr: string,
  karyaId: string,
  purchaserWallet: string,
  licenseType: 'exclusive' | 'non-exclusive',
  territory: string,
  duration: string
): Promise<LicensePurchaseResult> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  // 1. Submit transaction to Stellar
  let transaction;
  try {
    transaction = transactionFromXDR(signedXdr, getNetworkPassphrase());
  } catch {
    throw new LicenseError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch (error) {
    console.error('[License] Submit error:', error);
    throw new LicenseError('TX_FAILED');
  }

  // 2. Fetch karya for details
  const { data: karya, error: karyaError } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (karyaError || !karya) throw new LicenseError('KARYA_NOT_FOUND');

  const licenseFee = karya.harga * 5;

  // 3. Determine expiry
  let expiresAt: string | null = null;
  if (duration !== 'perpetual') {
    const durationMap: Record<string, number> = {
      '1year': 365,
      '2years': 730,
      '5years': 1825,
    };
    const days = durationMap[duration] || 365;
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  // 4. Record license in database
  const { data: license, error: insertError } = await supabaseAdmin
    .from('licenses')
    .insert({
      karya_id: karyaId,
      purchaser_wallet: purchaserWallet,
      original_author_wallet: karya.issuer_wallet,
      license_type: licenseType,
      territory,
      duration,
      resale_percentage: 10.0, // Default 10% to original author
      license_fee: licenseFee,
      stellar_tx_hash: result.hash,
      status: 'active',
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (insertError || !license) {
    console.error('[License] Insert error:', insertError);
    throw new LicenseError('DATABASE_ERROR');
  }

  // 5. Record the license fee as a transaction (two-step pending→confirmed to avoid broken badge trigger)
  await supabaseAdmin.from('transactions').insert({
    karya_id: karyaId,
    buyer_wallet: purchaserWallet,
    seller_wallet: karya.issuer_wallet,
    jumlah: licenseFee,
    stellar_tx_hash: result.hash,
    status: 'pending',
    payment_method: 'direct',
  });

  await supabaseAdmin
    .from('transactions')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('stellar_tx_hash', result.hash);

  // 6. Create royalty split for this license (for future resales) — skip if exists
  const { data: existingSplit } = await supabaseAdmin
    .from('royalty_splits')
    .select('id')
    .eq('karya_id', karyaId)
    .maybeSingle();

  if (!existingSplit) {
    await supabaseAdmin.from('royalty_splits').insert({
      karya_id: karyaId,
      contract_address: null,
      total_percentage: 10.0,
      status: 'active',
    });
  }

  // 7. Generate license asset code (e.g., JINGGA001-L1)
  const licenseAssetCode = `${karya.stellar_asset_code}-L1`;

  // 8. Build unsigned XDR for on-chain license registration (non-blocking)
  //     Requires author to sign via Freighter — skipped here, frontend handles it
  buildIssueLicenseXdr(
    license.id,
    karyaId,
    karya.issuer_wallet,
    licenseType,
    territory,
    duration,
    1000, // 10% resale royalty in basis points
  ).then((xdrResult) => {
    if (xdrResult.success) {
      console.log('[License] On-chain license XDR built:', license.id);
    }
  }).catch((err: any) =>
    console.warn('[License] On-chain issue failed (non-fatal):', err)
  );

  return {
    license_id: license.id,
    tx_hash: result.hash,
    license_fee: licenseFee,
    explorer_url: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    requires_signing: false,
    xdr: undefined,
  };
}

/**
 * Execute resale of a license with automatic author royalty.
 *
 * Flow: SELLER signs a royalty payment to the original author.
 * - The seller has received the full `sale_price` from the buyer (off-chain).
 * - The seller signs a single payment: author_royalty XLM to the original author.
 * - The buyer pays the seller the full sale price outside this transaction.
 */
export async function executeResale(input: ResaleInput): Promise<ResaleResult> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { license_id, seller_wallet, buyer_wallet, sale_price } = input;

  // 1. Fetch license details
  const { data: license, error: licenseError } = await supabaseAdmin
    .from('licenses')
    .select('*, karya!inner(id, judul, issuer_wallet)')
    .eq('id', license_id)
    .single();

  if (licenseError || !license) throw new LicenseError('LICENSE_NOT_FOUND');
  if (license.status !== 'active') throw new LicenseError('LICENSE_NOT_ACTIVE');
  if (license.purchaser_wallet !== seller_wallet) throw new LicenseError('NOT_LICENSE_HOLDER');

  // 2. Calculate royalty (seller pays this to the author)
  const authorRoyalty = Math.round(sale_price * (license.resale_percentage / 100) * 1e6) / 1e6;
  const sellerReceives = Math.round((sale_price - authorRoyalty) * 1e6) / 1e6;

  const memo = `JINGGA:RESALE:${license_id.slice(0, 8)}`;

  // Fee: single operation (payment to author)
  const feeStr = String(Number(StellarSdk.BASE_FEE));

  try {
    // 3. Build transaction: SELLER pays the author royalty
    //    The SELLER signs this with Freighter (they are the authenticated user)
    const sellerAccount = await getServer().loadAccount(seller_wallet);

    const txBuilder = new StellarSdk.TransactionBuilder(sellerAccount, {
      fee: feeStr,
      networkPassphrase: getNetworkPassphrase(),
    });

    // Seller sends authorRoyalty to the original author as royalty fee
    if (authorRoyalty > 0) {
      txBuilder.addOperation(StellarSdk.Operation.payment({
        destination: license.original_author_wallet,
        asset: StellarSdk.Asset.native(),
        amount: authorRoyalty.toString(),
      }));
    }

    const transaction = txBuilder
      .addMemo(StellarSdk.Memo.text(memo))
      .setTimeout(300)
      .build();

    // Return unsigned XDR for Freighter (SELLER signs)
    const xdr = transaction.toXDR();

    return {
      resale_id: '',
      sale_price,
      author_royalty: authorRoyalty,
      author_wallet: license.original_author_wallet,
      seller_receives: sellerReceives,
      seller_wallet,
      tx_hash: '',
      explorer_url: '',
      xdr,
      requires_signing: true,
    };
  } catch (error: any) {
    console.error('[License] Resale error:', error);
    if (error.name === 'NotFoundError' || error.constructor?.name === 'NotFoundError' || error.response?.status === 404) {
      throw new LicenseError('ACCOUNT_NOT_FOUND');
    }
    if (error.message?.includes('insufficient')) {
      throw new LicenseError('INSUFFICIENT_BALANCE');
    }
    throw new LicenseError('TX_FAILED');
  }
}

/**
 * Confirm resale after Stellar transaction is signed & submitted
 */
export async function confirmResale(
  signedXdr: string,
  licenseId: string,
  sellerWallet: string,
  buyerWallet: string,
  salePrice: number
): Promise<ResaleResult> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  // 1. Submit transaction
  let transaction;
  try {
    transaction = transactionFromXDR(signedXdr, getNetworkPassphrase());
  } catch {
    throw new LicenseError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch (error: any) {
    // Log Horizon error details including result_codes for debugging
    const resultCodes = error?.response?.data?.extras?.result_codes;
    if (resultCodes) {
      console.error('[License] Resale submit error — result_codes:', JSON.stringify(resultCodes));
    }
    console.error('[License] Resale submit error:', error);
    throw new LicenseError('TX_FAILED');
  }

  // 2. Fetch license
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('*, karya!inner(id, judul, issuer_wallet)')
    .eq('id', licenseId)
    .single();

  if (!license) throw new LicenseError('LICENSE_NOT_FOUND');

  const karya = license.karya as any;

  // 3. Calculate royalty
  const authorRoyalty = Math.round(salePrice * (license.resale_percentage / 100) * 1e6) / 1e6;
  const sellerReceives = Math.round((salePrice - authorRoyalty) * 1e6) / 1e6;

  // 4. Record resale in database
  const { data: resale, error: insertError } = await supabaseAdmin
    .from('resale_transactions')
    .insert({
      license_id: licenseId,
      seller_wallet: sellerWallet,
      buyer_wallet: buyerWallet,
      sale_price: salePrice,
      author_royalty: authorRoyalty,
      seller_receives: sellerReceives,
      stellar_tx_hash: result.hash,
      status: 'completed',
    })
    .select()
    .single();

  if (insertError || !resale) {
    console.error('[License] Resale insert error:', insertError);
    throw new LicenseError('DATABASE_ERROR');
  }

  // 5. Transfer license ownership in database
  await supabaseAdmin
    .from('licenses')
    .update({
      purchaser_wallet: buyerWallet,
    })
    .eq('id', licenseId);

  // 6. On-chain resale is handled by the frontend via Freighter signing.
  //    The backend only records the resale in the database.
  //    Contract interaction: buyer signs `execute_resale` with XDR from /resale/xdr endpoint.

  return {
    resale_id: resale.id,
    sale_price: salePrice,
    author_royalty: authorRoyalty,
    author_wallet: license.original_author_wallet,
    seller_receives: sellerReceives,
    seller_wallet: sellerWallet,
    tx_hash: result.hash,
    explorer_url: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
    requires_signing: false,
  };
}

/**
 * Get license details with resale statistics
 */
export async function getLicenseDetails(licenseId: string): Promise<LicenseDetail | null> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('*, karya!inner(id, judul, issuer_wallet)')
    .eq('id', licenseId)
    .single();

  if (!license) return null;

  const karya = license.karya as any;

  // Get resale stats
  const { data: resales } = await supabaseAdmin
    .from('resale_transactions')
    .select('sale_price')
    .eq('license_id', licenseId)
    .eq('status', 'completed');

  const resaleCount = resales?.length || 0;
  const totalResaleVolume = resales?.reduce((sum, r) => sum + r.sale_price, 0) || 0;

  return {
    id: license.id,
    karya_id: license.karya_id,
    karya_judul: karya?.judul || 'Unknown',
    purchaser_wallet: license.purchaser_wallet,
    original_author_wallet: license.original_author_wallet,
    original_author_name: 'Author',
    license_type: license.license_type,
    territory: license.territory,
    duration: license.duration,
    resale_percentage: license.resale_percentage,
    license_fee: license.license_fee,
    status: license.status,
    issued_at: license.issued_at,
    expires_at: license.expires_at,
    resale_count: resaleCount,
    total_resale_volume: totalResaleVolume,
  };
}

/**
 * Get all licenses for a karya
 */
export async function getKaryaLicenses(karyaId: string): Promise<{
  licenses: LicenseDetail[];
  total_licenses: number;
  total_revenue: number;
}> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { data: licenses } = await supabaseAdmin
    .from('licenses')
    .select('*')
    .eq('karya_id', karyaId)
    .order('issued_at', { ascending: false });

  if (!licenses) {
    return { licenses: [], total_licenses: 0, total_revenue: 0 };
  }

  const licenseDetails: LicenseDetail[] = await Promise.all(
    licenses.map(async (license: any) => {
      const { data: resales } = await supabaseAdmin!
        .from('resale_transactions')
        .select('sale_price')
        .eq('license_id', license.id)
        .eq('status', 'completed');

      return {
        id: license.id,
        karya_id: license.karya_id,
        karya_judul: '', // Will be filled by caller
        purchaser_wallet: license.purchaser_wallet,
        original_author_wallet: license.original_author_wallet,
        original_author_name: 'Author',
        license_type: license.license_type,
        territory: license.territory,
        duration: license.duration,
        resale_percentage: license.resale_percentage,
        license_fee: license.license_fee,
        status: license.status,
        issued_at: license.issued_at,
        expires_at: license.expires_at,
        resale_count: resales?.length || 0,
        total_resale_volume: resales?.reduce((sum, r) => sum + r.sale_price, 0) || 0,
      };
    })
  );

  const totalRevenue = licenseDetails.reduce((sum, l) => sum + l.license_fee, 0);

  return {
    licenses: licenseDetails,
    total_licenses: licenseDetails.length,
    total_revenue: totalRevenue,
  };
}

/**
 * Get resale history for a license
 */
export async function getResaleHistory(licenseId: string) {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { data: resales } = await supabaseAdmin
    .from('resale_transactions')
    .select('*')
    .eq('license_id', licenseId)
    .order('created_at', { ascending: false });

  if (!resales) return [];

  return resales.map((r: any) => ({
    id: r.id,
    license_id: r.license_id,
    seller_wallet: r.seller_wallet,
    buyer_wallet: r.buyer_wallet,
    sale_price: r.sale_price,
    author_royalty: r.author_royalty,
    seller_receives: r.seller_receives,
    status: r.status,
    created_at: r.created_at,
    explorer_url: `https://stellar.expert/explorer/testnet/tx/${r.stellar_tx_hash}`,
  }));
}

/**
 * Get all licenses purchased by a user
 */
export async function getUserLicenses(walletAddress: string): Promise<{
  licenses: (LicenseDetail & { karya_judul: string; karya_cover: string | null })[];
  total_licenses: number;
  total_spent: number;
}> {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { data: licenses } = await supabaseAdmin
    .from('licenses')
    .select('*, karya!inner(id, judul, cover_image_url, issuer_wallet)')
    .eq('purchaser_wallet', walletAddress)
    .eq('status', 'active')
    .order('issued_at', { ascending: false });

  if (!licenses) {
    return { licenses: [], total_licenses: 0, total_spent: 0 };
  }

  const licenseDetails = await Promise.all(
    licenses.map(async (license: any) => {
      const karya = license.karya as any;
      const { data: resales } = await supabaseAdmin!
        .from('resale_transactions')
        .select('sale_price')
        .eq('license_id', license.id)
        .eq('status', 'completed');

      return {
        id: license.id,
        karya_id: license.karya_id,
        karya_judul: karya?.judul || 'Unknown',
        karya_cover: karya?.cover_image_url || null,
        purchaser_wallet: license.purchaser_wallet,
        original_author_wallet: license.original_author_wallet,
        original_author_name: 'Author',
        license_type: license.license_type,
        territory: license.territory,
        duration: license.duration,
        resale_percentage: license.resale_percentage,
        license_fee: license.license_fee,
        status: license.status,
        issued_at: license.issued_at,
        expires_at: license.expires_at,
        resale_count: resales?.length || 0,
        total_resale_volume: resales?.reduce((sum, r) => sum + r.sale_price, 0) || 0,
      };
    })
  );

  const totalSpent = licenseDetails.reduce((sum, l) => sum + l.license_fee, 0);

  return {
    licenses: licenseDetails,
    total_licenses: licenseDetails.length,
    total_spent: totalSpent,
  };
}

/**
 * Get royalties earned by an author from resales
 */
export async function getAuthorResaleRoyalties(walletAddress: string) {
  if (!supabaseAdmin) throw new LicenseError('DATABASE_ERROR');

  const { data: resales, error } = await supabaseAdmin
    .from('resale_transactions')
    .select(`
      *,
      licenses!inner(
        karya_id,
        original_author_wallet,
        karya!inner(id, judul)
      )
    `)
    .eq('licenses.original_author_wallet', walletAddress)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[License] Author royalties error:', error);
    return [];
  }

  return (resales || []).map((r: any) => {
    const license = r.licenses as any;
    return {
      resale_id: r.id,
      karya_id: license?.karya_id || '',
      karya_judul: license?.karya?.judul || 'Unknown',
      buyer_wallet: r.buyer_wallet,
      sale_price: r.sale_price,
      author_royalty_received: r.author_royalty,
      seller_receives: r.seller_receives,
      created_at: r.created_at,
      explorer_url: `https://stellar.expert/explorer/testnet/tx/${r.stellar_tx_hash}`,
    };
  });
}

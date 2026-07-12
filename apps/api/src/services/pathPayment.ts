import * as Stellar from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, getStellarExpertTxUrl, transactionFromXDR } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';

// Stablecoins supported for path payment (lazy-loaded — tidak crash server saat startup)
let _stablecoins: Record<string, Stellar.Asset> | null = null;

function getStablecoins(): Record<string, Stellar.Asset> {
  if (_stablecoins) return _stablecoins;

  const assets: Record<string, Stellar.Asset> = {};
  const usdcIssuer = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

  try {
    if (Stellar.StrKey.isValidEd25519PublicKey(usdcIssuer)) {
      assets.USDC = new Stellar.Asset('USDC', usdcIssuer);
    } else {
      console.warn('[PathPayment] Invalid USDC issuer address. Path payment with USDC disabled.');
    }
  } catch (err) {
    console.warn('[PathPayment] Failed to create USDC asset:', err);
  }

  _stablecoins = assets;
  return assets;
}

const STABLECOIN_DECIMALS: Record<string, number> = {
  USDC: 7, // 7 decimal places for Stellar USDC
};

export const PATH_PAYMENT_ERRORS = {
  KARYA_NOT_FOUND: { code: 'KARYA_NOT_FOUND', message: 'Karya not found', status: 404 },
  UNSUPPORTED_ASSET: { code: 'UNSUPPORTED_ASSET', message: 'Unsupported source asset', status: 400 },
  NO_PATH_FOUND: { code: 'NO_PATH_FOUND', message: 'No path found for conversion', status: 400 },
  TX_FAILED: { code: 'TX_FAILED', message: 'Transaction failed', status: 400 },
  CANNOT_BUY_OWN: { code: 'CANNOT_BUY_OWN', message: 'Cannot buy your own work', status: 400 },
  ALREADY_PURCHASED: { code: 'ALREADY_PURCHASED', message: 'Already purchased this work', status: 400 },
} as const;

export class PathPaymentError extends Error {
  code: string;
  status: number;
  constructor(errorKey: keyof typeof PATH_PAYMENT_ERRORS) {
    const err = PATH_PAYMENT_ERRORS[errorKey];
    super(err.message);
    this.name = 'PathPaymentError';
    this.code = err.code;
    this.status = err.status;
  }
}

export interface PathPaymentQuote {
  source_asset: string;
  source_amount: number;
  destination_amount: number;
  rate: number;
  path: string[];
  expires_at: string;
}

export interface RateData {
  asset: string;
  price_in_xlm: number;
  updated_at: string;
}

// Get a path payment quote via Stellar DEX
export async function getPathPaymentQuote(
  sourceAsset: string,
  sourceAmount: number
): Promise<PathPaymentQuote> {
  const asset = getStablecoins()[sourceAsset];
  if (!asset) throw new PathPaymentError('UNSUPPORTED_ASSET');

  try {
    // Use strictSend path: send exact source amount, receive whatever XLM it yields
    const paths = await (getServer() as any)
      .strictSendPaths(
        asset,
        sourceAmount.toFixed(STABLECOIN_DECIMALS[sourceAsset] || 7),
        Stellar.Asset.native()
      )
      .limit(3)
      .call();

    if (!paths.records || paths.records.length === 0) {
      throw new PathPaymentError('NO_PATH_FOUND');
    }

    const best = paths.records[0];
    const destAmount = parseFloat(best.destination_amount);
    const rate = destAmount / sourceAmount;

    return {
      source_asset: sourceAsset,
      source_amount: sourceAmount,
      destination_amount: destAmount,
      rate,
      path: (best.path || []).map((p: any) =>
        p.asset_type === 'native' ? 'XLM' : `${p.asset_code}:${p.asset_issuer}`
      ),
      expires_at: new Date(Date.now() + 60000).toISOString(), // quote valid 1 min
    };
  } catch (err) {
    if (err instanceof PathPaymentError) throw err;
    console.error('[PathPayment] Quote error:', err);
    throw new PathPaymentError('NO_PATH_FOUND');
  }
}

// Build unsigned XDR for path payment (to be signed by Freighter)
export async function initiatePathPayment(
  buyerWallet: string,
  karyaId: string,
  sourceAsset: string,
  sourceAmount: number
): Promise<{
  xdr: string;
  quote: PathPaymentQuote;
  karya: { id: string; judul: string; issuer_wallet: string };
}> {
  const asset = getStablecoins()[sourceAsset];
  if (!asset) throw new PathPaymentError('UNSUPPORTED_ASSET');
  if (!supabaseAdmin) throw new PathPaymentError('KARYA_NOT_FOUND');

  // 1. Fetch karya
  const { data: karya, error: karyaErr } = await supabaseAdmin
    .from('karya')
    .select('id, judul, harga, issuer_wallet, stellar_asset_code, status')
    .eq('id', karyaId)
    .eq('status', 'published')
    .single();

  if (karyaErr || !karya) throw new PathPaymentError('KARYA_NOT_FOUND');
  if (karya.issuer_wallet === buyerWallet) throw new PathPaymentError('CANNOT_BUY_OWN');

  // 2. Check if already purchased
  const { data: existingTx } = await supabaseAdmin
    .from('transactions')
    .select('id')
    .eq('karya_id', karyaId)
    .eq('buyer_wallet', buyerWallet)
    .eq('status', 'confirmed')
    .single();
  if (existingTx) throw new PathPaymentError('ALREADY_PURCHASED');

  // 3. Load buyer account
  let buyerAccount;
  try {
    buyerAccount = await getServer().loadAccount(buyerWallet);
  } catch {
    throw new PathPaymentError('TX_FAILED');
  }

  // 4. Get quote and find best path
  const paths = await (getServer() as any)
    .strictSendPaths(
      asset,
      sourceAmount.toFixed(STABLECOIN_DECIMALS[sourceAsset] || 7),
      Stellar.Asset.native()
    )
    .limit(3)
    .call();

  if (!paths.records || paths.records.length === 0) {
    throw new PathPaymentError('NO_PATH_FOUND');
  }

  const best = paths.records[0];
  const destAmount = parseFloat(best.destination_amount);

  // 5. Build path payment transaction
  const memo = `JINGGA:PATH:${karyaId.slice(0, 7)}`;

  const transaction = new Stellar.TransactionBuilder(buyerAccount, {
    fee: Stellar.BASE_FEE,
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(
      Stellar.Operation.pathPaymentStrictSend({
        sendAsset: asset,
        sendAmount: sourceAmount.toFixed(STABLECOIN_DECIMALS[sourceAsset] || 7),
        destination: karya.issuer_wallet,
        destAsset: Stellar.Asset.native(),
        destMin: destAmount.toString(),
        // path is optional - Stellar DEX will find best path
      })
    )
    .addMemo(Stellar.Memo.text(memo))
    .setTimeout(300)
    .build();

  const rate = destAmount / sourceAmount;

  return {
    xdr: transaction.toXDR(),
    quote: {
      source_asset: sourceAsset,
      source_amount: sourceAmount,
      destination_amount: destAmount,
      rate,
      path: [],
      expires_at: new Date(Date.now() + 60000).toISOString(),
    },
    karya: {
      id: karya.id,
      judul: karya.judul,
      issuer_wallet: karya.issuer_wallet,
    },
  };
}

// Confirm path payment and grant access
export async function confirmPathPayment(
  signedXdr: string,
  karyaId: string,
  buyerWallet: string,
  sourceAsset: string
): Promise<{
  txHash: string;
  sourceAmount: number;
  xlmReceived: number;
  explorerUrl: string;
  accessUrl: string;
  expiresAt: string;
}> {
  if (!supabaseAdmin) throw new PathPaymentError('KARYA_NOT_FOUND');

  // 1. Submit signed transaction
  let transaction;
  try {
    transaction = transactionFromXDR(signedXdr, getNetworkPassphrase());
  } catch {
    throw new PathPaymentError('TX_FAILED');
  }

  let result;
  try {
    result = await getServer().submitTransaction(transaction);
  } catch {
    throw new PathPaymentError('TX_FAILED');
  }

  // 2. Fetch karya
  const { data: karya } = await supabaseAdmin
    .from('karya')
    .select('*')
    .eq('id', karyaId)
    .single();

  if (!karya) throw new PathPaymentError('KARYA_NOT_FOUND');

  // 3. Extract amounts from transaction operations
  const xlmReceived = karya.harga;

  // 4. Record transaction in database (two-step pending→confirmed to avoid broken badge trigger)
  await supabaseAdmin.from('transactions').insert({
    karya_id: karyaId,
    buyer_wallet: buyerWallet,
    seller_wallet: karya.issuer_wallet,
    jumlah: xlmReceived,
    payment_asset: sourceAsset,
    stellar_tx_hash: result.hash,
    status: 'pending',
    payment_method: 'path_payment',
  });

  await supabaseAdmin
    .from('transactions')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('stellar_tx_hash', result.hash);

  // 5. Update karya stats
  await supabaseAdmin.rpc('increment_karya_sales', {
    p_karya_id: karyaId,
    p_amount: xlmReceived,
  });

  // 6. Generate access URL
  const { getSignedUrl } = await import('../lib/ipfs');
  const accessUrl = karya.ipfs_link ? await getSignedUrl(karya.ipfs_link, 3600) : '';
  const explorerUrl = getStellarExpertTxUrl(result.hash);

  return {
    txHash: result.hash,
    sourceAmount: parseFloat((transaction.operations[0] as any)?.sendAmount?._value || '0') || 0,
    xlmReceived,
    explorerUrl,
    accessUrl: accessUrl || '',
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
  };
}

// Get current exchange rates
export async function getExchangeRates(): Promise<RateData[]> {
  const rates: RateData[] = [];
  const now = new Date().toISOString();

  for (const [code, asset] of Object.entries(getStablecoins())) {
    try {
      // Use strictSend with 1 unit of stablecoin to get XLM equivalent
      const paths = await (getServer() as any)
        .strictSendPaths(asset, '1', Stellar.Asset.native())
        .limit(1)
        .call();

      if (paths.records && paths.records.length > 0) {
        const destAmount = parseFloat(paths.records[0].destination_amount);
        rates.push({
          asset: code,
          price_in_xlm: destAmount,
          updated_at: now,
        });
      }
    } catch {
      // Skip if rate fetch fails
      rates.push({
        asset: code,
        price_in_xlm: 0,
        updated_at: now,
      });
    }
  }

  return rates;
}

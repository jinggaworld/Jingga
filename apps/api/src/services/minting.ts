import * as StellarSdk from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase, getStellarExpertTxUrl } from '../lib/stellar';
import { supabaseAdmin } from '../lib/supabase';
import { decryptPrivateKey } from '../lib/crypto';
import {
  createRoyaltySplitOnChain,
  executeRoyaltySplitOnChain,
  calculateSharesOnChain,
  getSplitFromChain,
  parseScValResult,
} from './soroban';

export interface MintResult {
  stellar_tx_hash: string;
  asset_code: string;
  issuer_wallet: string;
  ledger: number;
  timestamp: string;
  explorer_url: string;
}

export async function mintKaryaAsset(
  karyaId: string,
  issuerWallet: string,
  assetCode: string,
  issuerSecretKey?: string
): Promise<MintResult> {
  const server = getServer();
  const networkPassphrase = getNetworkPassphrase();

  // Load issuer account
  const issuerAccount = await server.loadAccount(issuerWallet);

  // Create asset
  const asset = new StellarSdk.Asset(assetCode, issuerWallet);

  // Build transaction: create trust line + issue 1 unit to self
  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.changeTrust({
      asset,
      source: issuerWallet,
    }))
    .addOperation(StellarSdk.Operation.payment({
      destination: issuerWallet,
      asset,
      amount: '1',
    }))
    .addMemo(StellarSdk.Memo.text(`JINGGA:MINT:${karyaId}`))
    .setTimeout(180)
    .build();

  // Sign transaction
  if (issuerSecretKey) {
    const keypair = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    transaction.sign(keypair);
  }

  // Submit transaction
  const result = await server.submitTransaction(transaction);

  // Record in database
  if (supabaseAdmin) {
    await supabaseAdmin
      .from('karya')
      .update({
        stellar_tx_hash: result.hash,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', karyaId);
  }

  return {
    stellar_tx_hash: result.hash,
    asset_code: assetCode,
    issuer_wallet: issuerWallet,
    ledger: result.ledger,
    timestamp: new Date().toISOString(),
    explorer_url: getStellarExpertTxUrl(result.hash),
  };
}

// ============================================================
// Royalty Split (Soroban Contract) Integration
// ============================================================

/**
 * Create a royalty split configuration on-chain for a karya.
 * Called after a karya with collaborators is created/published.
 */
export async function createRoyaltySplitForKarya(
  karyaId: string,
  creatorSecretKey: string,
  recipients: Array<{ wallet: string; percentageBps: number; role: string }>,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  // Validate total percentage
  const totalBps = recipients.reduce((sum, r) => sum + r.percentageBps, 0);
  if (totalBps > 10000) {
    return { success: false, error: 'Total percentage exceeds 100% (10000 bps)' };
  }

  const result = await createRoyaltySplitOnChain(
    karyaId,
    creatorSecretKey,
    recipients,
  );

  if (result.success && result.txHash) {
    // Record the split configuration in database
    if (supabaseAdmin) {
      await supabaseAdmin.from('royalty_splits').upsert({
        karya_id: karyaId,
        contract_address: process.env.CONTRACT_ROYALTY_SPLIT || '',
        total_percentage: totalBps / 100,
        status: 'active',
      });
    }

    console.log(`[RoyaltySplit] Created split for karya ${karyaId}: tx=${result.txHash}`);
  }

  return {
    success: result.success,
    txHash: result.txHash,
    error: result.error,
  };
}

/**
 * Execute a royalty split on-chain when a purchase occurs.
 * Distributes payment among all collaborators automatically.
 * Token is always native XLM (hardcoded in soroban.ts).
 */
export async function executeRoyaltySplitForPayment(
  karyaId: string,
  totalAmountXlm: number,
  custodialSecretKey: string,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  // Check if a split exists on-chain first
  const splitCheck = await getSplitFromChain(karyaId);
  if (!splitCheck.success) {
    // No split configured — skip
    return { success: true, txHash: undefined, error: undefined };
  }

  // Calculate shares (stroops: 1 XLM = 10^7 stroops)
  const totalStroops = BigInt(Math.round(totalAmountXlm * 1e7));

  const result = await executeRoyaltySplitOnChain(
    karyaId,
    totalStroops,
    custodialSecretKey,
  );

  return {
    success: result.success,
    txHash: result.txHash,
    error: result.error,
  };
}

/**
 * Calculate expected royalty shares for a given amount.
 * Useful for previewing the breakdown before executing.
 */
export async function previewRoyaltyShares(
  karyaId: string,
  totalAmountXlm: number,
): Promise<{ success: boolean; shares?: Record<string, number>; error?: string }> {
  const totalStroops = Math.round(totalAmountXlm * 1e7);
  const result = await calculateSharesOnChain(karyaId, totalStroops);

  if (!result.success || !result.result) {
    return { success: false, error: result.error };
  }

  const parsed = parseScValResult(result.result);

  if (parsed && typeof parsed === 'object') {
    const shares: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed)) {
      shares[key] = Number(val || 0);
    }
    return { success: true, shares };
  }

  return { success: false, error: 'Failed to parse shares result' };
}

export async function buildMintTransaction(
  issuerWallet: string,
  assetCode: string,
  karyaId: string
): Promise<string> {
  const server = getServer();
  const networkPassphrase = getNetworkPassphrase();

  const issuerAccount = await server.loadAccount(issuerWallet);
  const asset = new StellarSdk.Asset(assetCode, issuerWallet);

  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.changeTrust({
      asset,
      source: issuerWallet,
    }))
    .addOperation(StellarSdk.Operation.payment({
      destination: issuerWallet,
      asset,
      amount: '1',
    }))
    .addMemo(StellarSdk.Memo.text(`JINGGA:MINT:${karyaId}`))
    .setTimeout(180)
    .build();

  return transaction.toXDR();
}

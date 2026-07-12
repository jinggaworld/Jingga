// ============================================================
// Jingga Soroban Smart Contract Client Service
// ============================================================
// Handles invocation of deployed Soroban contracts:
//   - RoyaltySplit  (CDATTT53...)
//   - LicenseManager (CD3PN2HL...)
//
// Uses @stellar/stellar-sdk v12 SCVal conversions.
// ============================================================

import * as StellarSdk from '@stellar/stellar-sdk';
import {
  getServer,
  getNetworkPassphrase,
  getRoyaltySplitContractId,
  getLicenseManagerContractId,
} from '../lib/stellar';

// ============================================================
// Configuration
// ============================================================

const SOROBAN_RPC_URL =
  process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

/** Soroban native XLM token contract address (testnet) */
export const NATIVE_XLM_CONTRACT_ID =
  process.env.NATIVE_XLM_CONTRACT_ID ||
  'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// Lazily instantiated RPC server
let _rpcServer: any = null;

async function getRpcServer(): Promise<any> {
  if (_rpcServer) return _rpcServer;

  // Try dynamic import of @stellar/stellar-sdk/rpc first (v12+)
  try {
    const rpcModule = await import('@stellar/stellar-sdk/rpc');
    _rpcServer = new rpcModule.Server(SOROBAN_RPC_URL);
    return _rpcServer;
  } catch {
    // Fallback: use StellarSdk.rpc.Server
    if ((StellarSdk as any).rpc?.Server) {
      _rpcServer = new (StellarSdk as any).rpc.Server(SOROBAN_RPC_URL);
      return _rpcServer;
    }
    throw new Error(
      `Soroban RPC Server not available. Install @stellar/stellar-sdk v12+.`,
    );
  }
}

// ============================================================
// SCVal Helpers
// ============================================================

function symbolVal(name: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(name, { type: 'symbol' });
}

function addressVal(publicKey: string): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(publicKey, { type: 'address' });
}

function i128Val(value: number | bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: 'i128' });
}

function u32Val(value: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: 'u32' });
}

function u64Val(value: number): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: 'u64' });
}

function boolVal(value: boolean): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(value, { type: 'bool' });
}

/**
 * Build a Recipient struct SCVal for RoyaltySplit contract.
 * Uses proper ScMap construction via xdr.
 */
function recipientScVal(
  wallet: string,
  percentageBps: number,
  role: string,
): StellarSdk.xdr.ScVal {
  // Build a ScMap with named fields matching the Recipient struct
  const map = [
    new StellarSdk.xdr.ScMapEntry({
      key: symbolVal('wallet'),
      val: addressVal(wallet),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: symbolVal('percentage_bps'),
      val: u32Val(percentageBps),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: symbolVal('role'),
      val: symbolVal(role),
    }),
  ];
  return StellarSdk.xdr.ScVal.scvMap(map);
}

/**
 * LicenseType enum: Exclusive / NonExclusive
 * In Soroban, `#[contracttype]` enums serialize as ScVal::Symbol(variant_name).
 */
function licenseTypeVal(type: 'exclusive' | 'non-exclusive'): StellarSdk.xdr.ScVal {
  return symbolVal(type === 'exclusive' ? 'Exclusive' : 'NonExclusive');
}

/**
 * LicenseDuration enum: OneYear / FiveYears / Perpetual
 */
function licenseDurationVal(duration: string): StellarSdk.xdr.ScVal {
  const map: Record<string, string> = {
    '1year': 'OneYear',
    '2years': 'FiveYears',
    '5years': 'FiveYears',
    perpetual: 'Perpetual',
  };
  return symbolVal(map[duration] || 'Perpetual');
}

// ============================================================
// Core Contract Invocation
// ============================================================

export interface SorobanInvokeOptions {
  contractId: string;
  method: string;
  args: StellarSdk.xdr.ScVal[];
  sourceSecretKey?: string;
  sourcePublicKey?: string;
  fee?: string;
}

export interface SorobanInvokeResult {
  success: boolean;
  txHash?: string;
  result?: StellarSdk.xdr.ScVal;
  xdr?: string;
  error?: string;
}

/**
 * Build a Soroban invoke transaction and return unsigned XDR.
 * For frontend/Freighter signing.
 */
export async function buildSorobanTransaction(
  options: SorobanInvokeOptions,
): Promise<SorobanInvokeResult> {
  const { contractId, method, args, sourcePublicKey, fee = '100' } = options;

  try {
    if (!sourcePublicKey) {
      return { success: false, error: 'sourcePublicKey is required' };
    }

    const server = getServer();
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }),
      )
      .setTimeout(300)
      .build();

    return { success: true, xdr: tx.toXDR() };
  } catch (error: any) {
    console.error(`[Soroban] Build tx error (${method}):`, error);
    return { success: false, error: error.message || 'Failed to build transaction' };
  }
}

/**
 * Simulate a read-only Soroban contract call.
 */
export async function simulateSorobanCall(
  contractId: string,
  method: string,
  args: StellarSdk.xdr.ScVal[],
  sourcePublicKey?: string,
): Promise<SorobanInvokeResult> {
  try {
    const server = getServer();
    const rpcServer = await getRpcServer();
    const pk = sourcePublicKey || getContractAdminPublicKey();
    const sourceAccount = await server.loadAccount(pk);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }),
      )
      .setTimeout(300)
      .build();

    const simulation = await rpcServer.simulateTransaction(tx);
    // Extract the return value from simulation results
    const resultValue = simulation?.result?.retval;

    return {
      success: true,
      result: resultValue || undefined,
    };
  } catch (error: any) {
    console.error(`[Soroban] Simulate error (${method}):`, error);
    return { success: false, error: error.message || 'Simulation failed' };
  }
}

/**
 * Prepare, sign, and submit a Soroban write transaction.
 * For backend-custodial signing (email auth users who have a backend-managed key).
 *
 * IMPORTANT: The source key MUST match the wallet that the contract
 * requires auth from (e.g. creator.require_auth() needs the creator's key).
 */
export async function submitSorobanTransaction(
  options: SorobanInvokeOptions,
): Promise<SorobanInvokeResult> {
  const {
    contractId,
    method,
    args,
    sourceSecretKey,
    sourcePublicKey,
    fee = '100',
  } = options;

  try {
    if (!sourceSecretKey) {
      return { success: false, error: 'sourceSecretKey is required for submission' };
    }

    const server = getServer();
    const rpcServer = await getRpcServer();
    const keypair = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    const pk = sourcePublicKey || keypair.publicKey();
    const sourceAccount = await server.loadAccount(pk);

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        StellarSdk.Operation.invokeContractFunction({
          contract: contractId,
          function: method,
          args,
        }),
      )
      .setTimeout(300)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(tx);
    preparedTx.sign(keypair);

    const result = await rpcServer.sendTransaction(preparedTx);

    // Poll for completion
    let status = result.status;
    let attempts = 0;
    while (status === 'pending' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollResult = await rpcServer.getTransaction(result.hash);
      status = pollResult.status;
      attempts++;
    }

    if (status === 'success') {
      return { success: true, txHash: result.hash };
    }

    return { success: false, error: `Transaction failed with status: ${status}` };
  } catch (error: any) {
    console.error(`[Soroban] Submit error (${method}):`, error);
    return {
      success: false,
      error: error.message || 'Transaction submission failed',
    };
  }
}

/**
 * Helper: parse a Soroban result ScVal into a plain JS value.
 * Uses type assertion for xdr types (the SDK's xdr types are complex).
 */
export function parseScValResult(val: any): any {
  if (!val) return null;

  const type = val.switch();
  const name = type.name;

  if (name === 'scvSymbol') return val.sym().toString();
  if (name === 'scvAddress') return val.address().toString();
  if (name === 'scvU32') return val.u32();
  if (name === 'scvI32') return val.i32();
  if (name === 'scvU64') return Number(val.u64().toString());
  if (name === 'scvI64') return Number(val.i64().toString());
  if (name === 'scvU128') return val.u128().toString();
  if (name === 'scvI128') return val.i128().toString();
  if (name === 'scvBool') return val.b();
  if (name === 'scvVoid') return null;
  if (name === 'scvString') return val.str().toString();
  if (name === 'scvBytes') return Buffer.from(val.bytes()).toString('hex');

  // Map (struct) — convert to plain object
  if (name === 'scvMap') {
    const entries: any[] = val.map() || [];
    const obj: Record<string, any> = {};
    for (const entry of entries) {
      const key = parseScValResult(entry.key);
      const value = parseScValResult(entry.val);
      obj[String(key)] = value;
    }
    return obj;
  }

  // Vec — convert to array
  if (name === 'scvVec') {
    const items: any[] = val.vec() || [];
    return items.map(parseScValResult);
  }

  return null;
}

// ============================================================
// Contract Admin Key
// ============================================================

function getContractAdminPublicKey(): string {
  return (
    process.env.CONTRACT_DEPLOYER_PUBLIC_KEY ||
    'GDEB5U56S3WIT3IFIKWTQ2UZPWOLR3W22QHBEV3I4PHBFOHH2BUVYRJH'
  );
}

// ============================================================
// LicenseManager Contract API
// ============================================================

function getLicenseId(): string {
  return getLicenseManagerContractId();
}

/**
 * Build an unsigned XDR for issuing a license (author to sign via Freighter).
 * The contract requires original_author.require_auth(), so the author
 * must sign this transaction.
 */
export async function buildIssueLicenseXdr(
  licenseId: string,
  karyaId: string,
  originalAuthor: string,
  licenseType: 'exclusive' | 'non-exclusive',
  territory: string,
  duration: string,
  resaleRoyaltyBps: number,
): Promise<SorobanInvokeResult> {
  return buildSorobanTransaction({
    contractId: getLicenseId(),
    method: 'issue_license',
    args: [
      symbolVal(licenseId),
      symbolVal(karyaId),
      addressVal(originalAuthor),
      licenseTypeVal(licenseType),
      symbolVal(territory),
      licenseDurationVal(duration),
      u32Val(resaleRoyaltyBps),
    ],
    sourcePublicKey: originalAuthor,
  });
}

/**
 * Purchase a license on-chain (custodial flow).
 * Requires the buyer's secret key.
 */
export async function purchaseLicenseOnChain(
  licenseId: string,
  buyerSecretKey: string,
): Promise<SorobanInvokeResult> {
  const buyer = StellarSdk.Keypair.fromSecret(buyerSecretKey).publicKey();
  return submitSorobanTransaction({
    contractId: getLicenseId(),
    method: 'purchase_license',
    args: [symbolVal(licenseId), addressVal(buyer)],
    sourceSecretKey: buyerSecretKey,
    sourcePublicKey: buyer,
  });
}

/**
 * Build unsigned XDR for execute_resale (buyer to sign via Freighter).
 * Contract requires buyer.require_auth().
 */
export async function buildResaleXdr(
  licenseId: string,
  buyer: string,
  salePriceStroops: bigint,
): Promise<SorobanInvokeResult> {
  return buildSorobanTransaction({
    contractId: getLicenseId(),
    method: 'execute_resale',
    args: [
      symbolVal(licenseId),
      addressVal(buyer),
      i128Val(salePriceStroops),
      addressVal(NATIVE_XLM_CONTRACT_ID), // XLM native token contract
    ],
    sourcePublicKey: buyer,
  });
}

/**
 * Execute resale on-chain (custodial flow).
 */
export async function executeResaleOnChain(
  licenseId: string,
  buyerSecretKey: string,
  salePriceStroops: bigint,
): Promise<SorobanInvokeResult> {
  const buyer = StellarSdk.Keypair.fromSecret(buyerSecretKey).publicKey();
  return submitSorobanTransaction({
    contractId: getLicenseId(),
    method: 'execute_resale',
    args: [
      symbolVal(licenseId),
      addressVal(buyer),
      i128Val(salePriceStroops),
      addressVal(NATIVE_XLM_CONTRACT_ID),
    ],
    sourceSecretKey: buyerSecretKey,
    sourcePublicKey: buyer,
  });
}

/** Get a license from on-chain */
export async function getLicenseFromChain(
  licenseId: string,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getLicenseId(), 'get_license', [symbolVal(licenseId)]);
}

/** Calculate resale royalty on-chain */
export async function calculateResaleRoyaltyOnChain(
  licenseId: string,
  salePriceStroops: number,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getLicenseId(), 'calculate_resale_royalty', [
    symbolVal(licenseId),
    i128Val(salePriceStroops),
  ]);
}

/** Revoke a license on-chain (author only, custodial) */
export async function revokeLicenseOnChain(
  licenseId: string,
  authorSecretKey: string,
): Promise<SorobanInvokeResult> {
  return submitSorobanTransaction({
    contractId: getLicenseId(),
    method: 'revoke_license',
    args: [symbolVal(licenseId)],
    sourceSecretKey: authorSecretKey,
  });
}

/** Check karya license count on-chain */
export async function getKaryaLicenseCountOnChain(
  karyaId: string,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getLicenseId(), 'get_karya_license_count', [
    symbolVal(karyaId),
  ]);
}

// ============================================================
// RoyaltySplit Contract API
// ============================================================

function getRoyaltyId(): string {
  return getRoyaltySplitContractId();
}

/**
 * Create a royalty split on-chain (custodial flow).
 * Contract requires creator.require_auth(), so creatorSecretKey is needed.
 */
export async function createRoyaltySplitOnChain(
  karyaId: string,
  creatorSecretKey: string,
  recipients: Array<{ wallet: string; percentageBps: number; role: string }>,
): Promise<SorobanInvokeResult> {
  const creator = StellarSdk.Keypair.fromSecret(creatorSecretKey).publicKey();

  const recipientScVals = recipients.map((r) =>
    recipientScVal(r.wallet, r.percentageBps, r.role),
  );

  // Build vec SCVal using nativeToScVal
  const vecVal = StellarSdk.nativeToScVal(recipientScVals, { type: 'vec' });

  return submitSorobanTransaction({
    contractId: getRoyaltyId(),
    method: 'create_split',
    args: [symbolVal(karyaId), addressVal(creator), vecVal],
    sourceSecretKey: creatorSecretKey,
    sourcePublicKey: creator,
  });
}

/**
 * Execute royalty split on-chain (custodial flow).
 */
export async function executeRoyaltySplitOnChain(
  karyaId: string,
  totalAmountStroops: bigint,
  callerSecretKey: string,
): Promise<SorobanInvokeResult> {
  const caller = StellarSdk.Keypair.fromSecret(callerSecretKey).publicKey();
  return submitSorobanTransaction({
    contractId: getRoyaltyId(),
    method: 'execute_split',
    args: [
      symbolVal(karyaId),
      i128Val(totalAmountStroops),
      addressVal(NATIVE_XLM_CONTRACT_ID),
    ],
    sourceSecretKey: callerSecretKey,
    sourcePublicKey: caller,
  });
}

/** Get split from on-chain */
export async function getSplitFromChain(
  karyaId: string,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getRoyaltyId(), 'get_split', [symbolVal(karyaId)]);
}

/** Calculate shares on-chain */
export async function calculateSharesOnChain(
  karyaId: string,
  totalAmountStroops: number,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getRoyaltyId(), 'calculate_shares', [
    symbolVal(karyaId),
    i128Val(totalAmountStroops),
  ]);
}

/** Get total distributed from on-chain */
export async function getTotalDistributedOnChain(
  karyaId: string,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getRoyaltyId(), 'get_total_distributed', [
    symbolVal(karyaId),
  ]);
}

/** Get distributions from on-chain (paginated) */
export async function getDistributionsOnChain(
  karyaId: string,
  page: number,
  pageSize: number,
): Promise<SorobanInvokeResult> {
  return simulateSorobanCall(getRoyaltyId(), 'get_distributions', [
    symbolVal(karyaId),
    u64Val(page),
    u64Val(pageSize),
  ]);
}

/**
 * Submit a Freighter-signed Soroban transaction to the network.
 * Used when the frontend signs the XDR with Freighter.
 */
export async function submitSignedSorobanTx(
  signedXdr: string,
): Promise<SorobanInvokeResult> {
  try {
    const rpcServer = await getRpcServer();

    // Reconstruct transaction from XDR
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      getNetworkPassphrase(),
    );

    // Submit to Soroban RPC
    const result = await rpcServer.sendTransaction(transaction);

    // Poll for completion
    let status = result.status;
    let attempts = 0;
    while (status === 'pending' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      const pollResult = await rpcServer.getTransaction(result.hash);
      status = pollResult.status;
      attempts++;
    }

    if (status === 'success') {
      return { success: true, txHash: result.hash };
    }

    return {
      success: false,
      error: `Transaction failed with status: ${status}`,
    };
  } catch (error: any) {
    console.error('[Soroban] Submit signed error:', error);
    return {
      success: false,
      error: error.message || 'Failed to submit signed transaction',
    };
  }
}

/** Pause or reactivate a royalty split (custodial) */
export async function setSplitActiveOnChain(
  karyaId: string,
  active: boolean,
  adminSecretKey: string,
): Promise<SorobanInvokeResult> {
  return submitSorobanTransaction({
    contractId: getRoyaltyId(),
    method: 'set_split_active',
    args: [symbolVal(karyaId), boolVal(active)],
    sourceSecretKey: adminSecretKey,
  });
}

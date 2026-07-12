import * as StellarSdk from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK === 'mainnet'
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

let server: StellarSdk.Horizon.Server | null = null;

export function getServer(): StellarSdk.Horizon.Server {
  if (!server) {
    server = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return server;
}

export function getNetworkPassphrase(): string {
  return NETWORK_PASSPHRASE;
}

export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const friendbotUrl = process.env.STELLAR_FRIENDBOT_URL || 'https://friendbot.stellar.org';
  const response = await fetch(`${friendbotUrl}?addr=${publicKey}`);
  if (!response.ok) {
    throw new Error(`Failed to fund testnet account: ${response.statusText}`);
  }
}

export async function accountExists(publicKey: string): Promise<boolean> {
  try {
    await getServer().loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}

export async function getAccountBalance(publicKey: string): Promise<number> {
  const account = await getServer().loadAccount(publicKey);
  const nativeBalance = account.balances.find((b) => b.asset_type === 'native');
  return nativeBalance ? parseFloat(nativeBalance.balance) : 0;
}

export function getStellarExpertTxUrl(txHash: string): string {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  return `https://stellar.expert/${network}/tx/${txHash}`;
}

export function getStellarExpertAccountUrl(publicKey: string): string {
  const network = process.env.STELLAR_NETWORK || 'testnet';
  return `https://stellar.expert/${network}/account/${publicKey}`;
}

// ============================================================
// Soroban Smart Contract Configuration
// ============================================================

/** Get the deployed RoyaltySplit contract ID */
export function getRoyaltySplitContractId(): string {
  return process.env.CONTRACT_ROYALTY_SPLIT || 'CDATTT53GBFZZZQOVMGVO63FIM6FGRXGEBIVC4I2OPOHWOTXHQOOSWGN';
}

/** Get the deployed LicenseManager contract ID */
export function getLicenseManagerContractId(): string {
  return process.env.CONTRACT_LICENSE_MANAGER || 'CD3PN2HLF2ZL6AXLDD3RUE5WCLK3RZDV6LOVB6KREFO3YYLNZAHBKKMF';
}

/** Get the deployer public key (admin of both contracts) */
export function getContractAdminPublicKey(): string {
  return process.env.CONTRACT_DEPLOYER_PUBLIC_KEY || 'GDEB5U56S3WIT3IFIKWTQ2UZPWOLR3W22QHBEV3I4PHBFOHH2BUVYRJH';
}

/** Get all contract config as an object */
export function getContractConfig() {
  return {
    royaltySplitId: getRoyaltySplitContractId(),
    licenseManagerId: getLicenseManagerContractId(),
    adminPublicKey: getContractAdminPublicKey(),
    network: process.env.STELLAR_NETWORK || 'testnet',
    networkPassphrase: getNetworkPassphrase(),
    horizonUrl: HORIZON_URL,
  };
}


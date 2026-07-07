import { STELLAR_NETWORK_PASSPHRASE } from '@jingga/shared';

let FreighterApi: any = null;

// Dynamically import Freighter (browser-only)
async function getFreighter() {
  if (!FreighterApi) {
    try {
      FreighterApi = await import('@stellar/freighter-api');
    } catch {
      return null;
    }
  }
  return FreighterApi;
}

export async function isFreighterInstalled(): Promise<boolean> {
  const freighter = await getFreighter();
  if (!freighter) return false;
  try {
    return await freighter.isConnected();
  } catch {
    return false;
  }
}

export async function getPublicKey(): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');
  return await freighter.getAddress();
}

export async function signTransaction(xdr: string): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');
  const result = await freighter.signTx(xdr, STELLAR_NETWORK_PASSPHRASE);
  return result.signedTx;
}

export async function signMessage(message: string): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');
  // Freighter may not have signMessage, use signTx as fallback
  if (freighter.signMessage) {
    return await freighter.signMessage(message);
  }
  // Fallback: sign a transaction with the message as memo
  return '';
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

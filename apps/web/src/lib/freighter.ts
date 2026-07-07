import { STELLAR_NETWORK_PASSPHRASE } from '@jingga/shared';

let freighterApi: any = null;

// Dynamically import Freighter (browser-only)
async function getFreighter() {
  if (!freighterApi) {
    try {
      const mod = await import('@stellar/freighter-api');
      freighterApi = mod.default || mod;
    } catch {
      return null;
    }
  }
  return freighterApi;
}

export async function isFreighterInstalled(): Promise<boolean> {
  // Check if window.freighter exists (extension injected)
  if (typeof window !== 'undefined' && (window as any).freighter) {
    return true;
  }
  // Fallback: try the API module
  const freighter = await getFreighter();
  if (!freighter) return false;
  try {
    if (typeof freighter.isConnected === 'function') {
      return await freighter.isConnected();
    }
    return false;
  } catch {
    return false;
  }
}

export async function getPublicKey(): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');

  // v2 API uses getPublicKey()
  if (typeof freighter.getPublicKey === 'function') {
    return await freighter.getPublicKey();
  }

  // Fallback: check window.freighter directly
  if (typeof (window as any).freighter?.getPublicKey === 'function') {
    return await (window as any).freighter.getPublicKey();
  }

  throw new Error('Freighter is not installed or getPublicKey is not available');
}

export async function signTransaction(xdr: string, network?: string): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');

  const networkPassphrase = network || STELLAR_NETWORK_PASSPHRASE;

  // v2 API uses signTransaction(xdr, { network })
  if (typeof freighter.signTransaction === 'function') {
    const result = await freighter.signTransaction(xdr, { network: networkPassphrase });
    return typeof result === 'string' ? result : result.signedTx || result.signedTransaction || result;
  }

  // Fallback: try signTx
  if (typeof freighter.signTx === 'function') {
    const result = await freighter.signTx(xdr, networkPassphrase);
    return typeof result === 'string' ? result : result.signedTx || result;
  }

  throw new Error('Freighter signTransaction is not available');
}

export async function signAuthEntry(entryXdr: string): Promise<string> {
  const freighter = await getFreighter();
  if (!freighter) throw new Error('Freighter is not installed');

  if (typeof freighter.signAuthEntry === 'function') {
    return await freighter.signAuthEntry(entryXdr);
  }

  throw new Error('Freighter signAuthEntry is not available');
}

export async function requestAccess(): Promise<boolean> {
  const freighter = await getFreighter();
  if (!freighter) return false;

  if (typeof freighter.requestAccess === 'function') {
    return await freighter.requestAccess();
  }

  return false;
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

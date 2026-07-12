/**
 * Freighter wallet integration using @stellar/freighter-api v6.0.1
 *
 * IMPORTANT: In v6, the function is getAddress() — NOT getPublicKey().
 * The package handles all window injection detection internally.
 */

let freighterModule: any = null;

async function getFreighterApi(): Promise<any> {
  if (freighterModule) return freighterModule;
  try {
    const mod = await import('@stellar/freighter-api');
    freighterModule = mod.default || mod;
    return freighterModule;
  } catch (err) {
    console.error('[Freighter] Failed to import @stellar/freighter-api:', err);
    return null;
  }
}

/**
 * Check if Freighter extension is installed in the browser.
 * This checks if the extension has injected its API into window.
 * It does NOT check if the user has authorized the dApp — use isConnected() for that.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Direct window check — fastest, synchronous, no API call needed
  // The Freighter extension injects window.freighterApi (modern) or window.freighter (legacy)
  if ((window as any).freighterApi) {
    console.log('[Freighter] Detected window.freighterApi ✓');
    return true;
  }
  if ((window as any).freighter) {
    console.log('[Freighter] Detected window.freighter (legacy) ✓');
    return true;
  }

  // 2. Try the npm package as fallback
  const api = await getFreighterApi();
  if (api && typeof api.isConnected === 'function') {
    try {
      const result = await api.isConnected();
      if (result === true) {
        console.log('[Freighter] Detected via isConnected() ✓');
        return true;
      }
    } catch {
      // isConnected might throw if not installed
    }
  }

  console.log('[Freighter] Not detected');
  return false;
}

/**
 * Wait for Freighter extension to inject its API into window.
 * The extension injects asynchronously after page load.
 * Polls every 500ms for up to maxWait ms.
 */
export async function waitForFreighter(maxWait = 5000): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Already detected?
  if ((window as any).freighterApi || (window as any).freighter) {
    return true;
  }

  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      if ((window as any).freighterApi || (window as any).freighter) {
        console.log('[Freighter] Extension detected after wait ✓');
        resolve(true);
        return;
      }
      if (Date.now() - startTime >= maxWait) {
        console.log('[Freighter] Timed out waiting for extension');
        resolve(false);
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

/**
 * Get the user's Stellar address (public key).
 * v6 uses getAddress() — NOT getPublicKey().
 */
export async function getPublicKey(): Promise<string> {
  // Wait for extension injection first
  await waitForFreighter(3000);

  const api = await getFreighterApi();
  if (!api) throw new Error('Freighter is not installed. Please install the Freighter browser extension.');

  // v6: getAddress() returns { address: string } or just the address string
  if (typeof api.getAddress === 'function') {
    const result = await api.getAddress();

    // Handle both return formats:
    // - { address: "G..." } (object with address property)
    // - "G..." (plain string)
    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object' && result.address) {
      return result.address;
    }
  }

  throw new Error('Freighter is not installed or getAddress is not available');
}

/**
 * Sign a message with Freighter wallet.
 * Returns the signature string, or null if signMessage is not available.
 */
export async function signMessage(message: string): Promise<string | null> {
  const api = await getFreighterApi();
  if (!api) return null;

  if (typeof api.signMessage === 'function') {
    try {
      const result = await api.signMessage(message);
      return typeof result === 'string' ? result : result?.signature || null;
    } catch (err) {
      console.warn('[Freighter] signMessage failed:', err);
      return null;
    }
  }

  console.warn('[Freighter] signMessage not available in this extension version');
  return null;
}

/**
 * Sign a transaction XDR with Freighter wallet.
 * 
 * Freighter v6+ expects the second argument as an options object: { networkPassphrase }.
 * Passing a plain string works with older versions but fails silently with v6.
 */
export async function signTransaction(xdr: string, network?: string): Promise<string> {
  const api = await getFreighterApi();
  if (!api) throw new Error('Freighter is not installed');

  if (typeof api.signTransaction === 'function') {
    // Freighter v6+ uses options object format
    const opts = network ? { networkPassphrase: network } : undefined;
    return await api.signTransaction(xdr, opts);
  }

  throw new Error('Freighter signTransaction is not available');
}

/**
 * Sign an auth entry with Freighter wallet.
 */
export async function signAuthEntry(entryXdr: string): Promise<string> {
  const api = await getFreighterApi();
  if (!api) throw new Error('Freighter is not installed');

  if (typeof api.signAuthEntry === 'function') {
    return await api.signAuthEntry(entryXdr);
  }

  throw new Error('Freighter signAuthEntry is not available');
}

/**
 * Request access to the user's wallet.
 */
export async function requestAccess(): Promise<boolean> {
  const api = await getFreighterApi();
  if (!api) return false;

  if (typeof api.requestAccess === 'function') {
    return await api.requestAccess();
  }

  return false;
}

/**
 * Get the current network passphrase from Freighter.
 */
export async function getNetwork(): Promise<string> {
  const api = await getFreighterApi();
  if (!api) return '';

  if (typeof api.getNetwork === 'function') {
    const result = await api.getNetwork();
    return typeof result === 'string' ? result : result?.networkPassphrase || '';
  }

  return '';
}

/**
 * Check if the dApp is allowed to access Freighter.
 */
export async function isAllowed(): Promise<boolean> {
  const api = await getFreighterApi();
  if (!api) return false;

  if (typeof api.isAllowed === 'function') {
    return await api.isAllowed();
  }

  return false;
}

/**
 * Truncate a Stellar address for display.
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

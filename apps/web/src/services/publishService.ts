const API_BASE = '/api/v1';

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('jingga_auth_token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it automatically with boundary)
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface PublishData {
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: number;
  tags?: string[];
  file: File;
  cover?: File;
  collaborators?: Array<{
    wallet_address: string;
    nama?: string;
    role: string;
    persentase: number;
  }>;
}

export interface PublishResult {
  karya: {
    id: string;
    judul: string;
    stellar_asset_code: string;
    status: string;
  };
  txHash?: string;
  explorerUrl?: string;
  requiresSigning?: boolean;
  xdr?: string;
}

export async function publishKarya(data: PublishData): Promise<PublishResult> {
  // Step 1: Create FormData
  const formData = new FormData();
  formData.append('judul', data.judul);
  formData.append('deskripsi', data.deskripsi);
  formData.append('kategori', data.kategori);
  formData.append('harga', String(data.harga));
  if (data.tags) formData.append('tags', JSON.stringify(data.tags));
  if (data.collaborators?.length) {
    formData.append('collaborators', JSON.stringify(data.collaborators));
  }
  formData.append('file', data.file);
  if (data.cover) formData.append('cover', data.cover);

  // Step 2: Create karya
  const { karya } = await apiRequest<{ karya: any }>('/karya', {
    method: 'POST',
    body: formData,
  });

  // Step 3: Publish karya (triggers minting)
  const publishResult = await apiRequest<{ karya: any }>(`/karya/${karya.id}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      confirmOriginal: true,
      confirmTerms: true,
    }),
  });

  // Step 4: Mint on Stellar (if not already done by publish)
  let txHash = publishResult.karya.stellar_tx_hash;
  let explorerUrl = txHash ? `https://stellar.expert/testnet/tx/${txHash}` : undefined;
  let requiresSigning = false;
  let xdr: string | undefined;

  if (!txHash) {
    try {
      const mintResult = await apiRequest<any>(`/karya/${karya.id}/mint`, {
        method: 'POST',
      });

      if (mintResult.requiresSigning) {
        requiresSigning = true;
        xdr = mintResult.xdr;
      } else if (mintResult.mint) {
        txHash = mintResult.mint.stellar_tx_hash;
        explorerUrl = mintResult.mint.explorer_url;
      }
    } catch (err) {
      console.error('[Publish] Mint error:', err);
      // Don't fail the whole flow — karya is created, minting can be retried
    }
  }

  return {
    karya: {
      id: karya.id,
      judul: karya.judul,
      stellar_asset_code: karya.stellar_asset_code,
      status: publishResult.karya.status || 'published',
    },
    txHash,
    explorerUrl,
    requiresSigning,
    xdr,
  };
}

export async function mintExistingKarya(karyaId: string, signedXdr?: string): Promise<{
  txHash: string;
  explorerUrl: string;
}> {
  const result = await apiRequest<any>(`/karya/${karyaId}/mint`, {
    method: 'POST',
    body: JSON.stringify({ signedXdr }),
  });

  if (result.requiresSigning) {
    throw new Error('Transaction needs to be signed by wallet');
  }

  return {
    txHash: result.mint.stellar_tx_hash,
    explorerUrl: result.mint.explorer_url,
  };
}

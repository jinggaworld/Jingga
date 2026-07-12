import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { getNetworkPassphrase, getLicenseManagerContractId } from '../lib/stellar';
import {
  purchaseLicense,
  confirmLicensePurchase,
  executeResale,
  confirmResale,
  getLicenseDetails,
  getKaryaLicenses,
  getResaleHistory,
  getAuthorResaleRoyalties,
  LicenseError,
} from '../services/license';
import { buildIssueLicenseXdr, submitSignedSorobanTx } from '../services/soroban';

const router: ReturnType<typeof Router> = Router();

// Helper to get wallet address from user
async function getWalletAddress(userId: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('wallet_address')
    .eq('id', userId)
    .single();
  return user?.wallet_address || null;
}

// ============================================================
// GET /api/v1/licenses/pending-signatures — Get licenses needing on-chain signing
// (For authors to see which licenses they need to sign)
// ※ MUST be before /:id to avoid Express route conflict
// ============================================================
router.get('/pending-signatures', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.json({ count: 0, licenses: [] });
      return;
    }

    // Fetch active licenses where user is the original author AND
    // haven't been signed on-chain yet (metadata->>'soroban_tx_hash' IS NULL)
    // metadata has DEFAULT '{}'::jsonb, so ->'soroban_tx_hash' IS NULL catches unsigned licenses
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select(`
        id,
        karya_id,
        purchaser_wallet,
        license_type,
        territory,
        duration,
        license_fee,
        status,
        issued_at,
        metadata,
        karya!inner(judul)
      `)
      .eq('original_author_wallet', walletAddress)
      .eq('status', 'active')
      .is('metadata->>soroban_tx_hash', null)
      .order('issued_at', { ascending: false });

    const formatted = (licenses || []).map((l: any) => ({
      id: l.id,
      karya_id: l.karya_id,
      karya_judul: l.karya?.judul || 'Unknown',
      purchaser_wallet: l.purchaser_wallet,
      license_type: l.license_type,
      territory: l.territory,
      duration: l.duration,
      license_fee: l.license_fee,
      issued_at: l.issued_at,
    }));

    res.json({
      count: formatted.length,
      licenses: formatted,
    });
  } catch (error) {
    console.error('[License] Pending signatures error:', error);
    res.status(500).json({ error: 'Failed to fetch pending signatures' });
  }
});

// ============================================================
// POST /api/v1/licenses/purchase — Initiate license purchase
// ============================================================
router.post('/purchase', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { karya_id, license_type, territory = 'global', duration = 'perpetual' } = req.body;

    if (!karya_id || !license_type) {
      res.status(400).json({ error: 'karya_id and license_type are required' });
      return;
    }

    if (!['exclusive', 'non-exclusive'].includes(license_type)) {
      res.status(400).json({ error: 'license_type must be exclusive or non-exclusive' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await purchaseLicense({
      karya_id,
      purchaser_wallet: walletAddress,
      license_type,
      territory,
      duration,
    });

    res.json(result);
  } catch (error) {
    console.error('[License] Purchase error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate license purchase' });
  }
});

// ============================================================
// POST /api/v1/licenses/confirm — Confirm license purchase
// ============================================================
router.post('/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { signed_xdr, karya_id, license_type, territory, duration } = req.body;

    if (!signed_xdr || !karya_id || !license_type) {
      res.status(400).json({ error: 'signed_xdr, karya_id, and license_type are required' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await confirmLicensePurchase(
      signed_xdr,
      karya_id,
      walletAddress,
      license_type,
      territory || 'global',
      duration || 'perpetual'
    );

    res.json(result);
  } catch (error) {
    console.error('[License] Confirm error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm license purchase' });
  }
});

// ============================================================
// POST /api/v1/licenses/resale/initiate — Initiate resale
// ============================================================
router.post('/resale/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { license_id, buyer_wallet, sale_price } = req.body;

    if (!license_id || !buyer_wallet || !sale_price) {
      res.status(400).json({ error: 'license_id, buyer_wallet, and sale_price are required' });
      return;
    }

    if (sale_price <= 0) {
      res.status(400).json({ error: 'sale_price must be greater than 0' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await executeResale({
      license_id,
      seller_wallet: walletAddress,
      buyer_wallet,
      sale_price,
    });

    res.json(result);
  } catch (error) {
    console.error('[License] Resale initiate error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate resale' });
  }
});

// ============================================================
// POST /api/v1/licenses/resale/confirm — Confirm resale
// ============================================================
router.post('/resale/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { signed_xdr, license_id, buyer_wallet, sale_price } = req.body;

    if (!signed_xdr || !license_id || !buyer_wallet || !sale_price) {
      res.status(400).json({ error: 'signed_xdr, license_id, buyer_wallet, and sale_price are required' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await confirmResale(
      signed_xdr,
      license_id,
      walletAddress,
      buyer_wallet,
      sale_price
    );

    res.json(result);
  } catch (error) {
    console.error('[License] Resale confirm error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm resale' });
  }
});

// ============================================================
// POST /api/v1/licenses/:id/submit-soroban — Submit Freighter-signed Soroban tx
// (Author signs the XDR from /:id/xdr then submits it here)
// ============================================================
router.post('/:id/submit-soroban', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { signed_xdr } = req.body;

    if (!signed_xdr) {
      res.status(400).json({ error: 'signed_xdr is required' });
      return;
    }

    // Verify license exists
    const license = await getLicenseDetails(id);
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    // Submit signed transaction to Soroban RPC
    const result = await submitSignedSorobanTx(signed_xdr);

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to submit transaction' });
      return;
    }

    // Update license record with on-chain tx hash
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('licenses')
        .update({ metadata: { soroban_tx_hash: result.txHash } } as any)
        .eq('id', id);
    }

    res.json({
      success: true,
      tx_hash: result.txHash,
      explorer_url: `https://stellar.expert/testnet/tx/${result.txHash}`,
    });
  } catch (error) {
    console.error('[License] Submit Soroban error:', error);
    res.status(500).json({ error: 'Failed to submit Soroban transaction' });
  }
});

// ============================================================
// GET /api/v1/licenses/:id/xdr — Get unsigned Soroban tx XDR for signing
// (Author uses this XDR to sign with Freighter to issue license on-chain)
// ※ MUST be before /:id to avoid Express route conflict
// ============================================================
router.get('/:id/xdr', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // 1. Fetch license from database
    const license = await getLicenseDetails(id);
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    // 2. Verify caller is the original author
    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    if (walletAddress !== license.original_author_wallet) {
      res.status(403).json({ error: 'Only the original author can sign license issuance' });
      return;
    }

    // 3. Build unsigned XDR for issue_license contract call
    const result = await buildIssueLicenseXdr(
      license.id,
      license.karya_id,
      license.original_author_wallet,
      license.license_type as 'exclusive' | 'non-exclusive',
      license.territory,
      license.duration,
      Math.round(license.resale_percentage * 100), // Convert % to basis points (e.g., 10% = 1000 bps)
    );

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to build transaction' });
      return;
    }

    res.json({
      success: true,
      xdr: result.xdr,
      license_id: license.id,
      karya_id: license.karya_id,
      original_author: license.original_author_wallet,
      contract_id: getLicenseManagerContractId(),
      method: 'issue_license',
      network_passphrase: getNetworkPassphrase(),
    });
  } catch (error) {
    console.error('[License] XDR build error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to build license XDR' });
  }
});

// ============================================================
// GET /api/v1/licenses/author/royalties — Get author's resale royalties
// ※ MUST be before /:id to avoid Express route conflict
// ============================================================
router.get('/author/royalties', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const royalties = await getAuthorResaleRoyalties(walletAddress);
    const totalRoyalties = royalties.reduce((sum, r) => sum + r.author_royalty_received, 0);

    res.json({ royalties, total: totalRoyalties });
  } catch (error) {
    console.error('[License] Author royalties error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to get author royalties' });
  }
});

// ============================================================
// GET /api/v1/licenses/:id — Get license details
// ============================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const license = await getLicenseDetails(id);

    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    res.json({ license });
  } catch (error) {
    console.error('[License] Detail error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to get license details' });
  }
});

// ============================================================
// GET /api/v1/licenses/karya/:karyaId — Get all licenses for a karya
// ============================================================
router.get('/karya/:karyaId', async (req: Request, res: Response) => {
  try {
    const { karyaId } = req.params;
    const result = await getKaryaLicenses(karyaId);

    res.json(result);
  } catch (error) {
    console.error('[License] Karya licenses error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to get karya licenses' });
  }
});

// ============================================================
// GET /api/v1/licenses/:id/resales — Get resale history for a license
// ============================================================
router.get('/:id/resales', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resales = await getResaleHistory(id);

    res.json({ resales });
  } catch (error) {
    console.error('[License] Resale history error:', error);
    if (error instanceof LicenseError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to get resale history' });
  }
});

export default router;

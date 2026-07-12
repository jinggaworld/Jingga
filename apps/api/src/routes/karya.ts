import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { uploadToIPFS } from '../lib/ipfs';
import { validateFile, validateCover } from '../utils/fileValidation';
import { generateAssetCode } from '../services/assetCode';
import { createKaryaSchema, updateKaryaSchema } from '../schemas/karya';
import { KARYA_ERRORS } from '../errors/KaryaError';
import { verifyAuthorship } from '../services/verification';
import { mintKaryaAsset, buildMintTransaction } from '../services/minting';
import { getGatewayUrl } from '../lib/ipfs';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/karya — Create karya
router.post('/', requireAuth, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const formData = {
      judul: req.body.judul,
      deskripsi: req.body.deskripsi,
      kategori: req.body.kategori,
      harga: parseFloat(req.body.harga),
      tags: req.body.tags ? JSON.parse(req.body.tags) : undefined,
      collaborators: req.body.collaborators ? JSON.parse(req.body.collaborators) : undefined,
    };

    const parsed = createKaryaSchema.safeParse(formData);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = files?.file?.[0];
    if (!file) {
      res.status(400).json({ error: KARYA_ERRORS.MISSING_FILE.message });
      return;
    }

    const fileValidation = validateFile(file.buffer, file.mimetype);
    if (!fileValidation.valid) {
      res.status(400).json({ error: fileValidation.error });
      return;
    }

    const fileResult = await uploadToIPFS(file.buffer, file.originalname, file.mimetype);

    let coverUrl = null;
    const cover = files?.cover?.[0];
    if (cover) {
      const coverValidation = validateCover(cover.buffer, cover.mimetype);
      if (coverValidation.valid) {
        const coverResult = await uploadToIPFS(cover.buffer, 'cover', cover.mimetype);
        coverUrl = coverResult.gatewayUrl;
      }
    }

    const assetCode = await generateAssetCode();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }

    const collaborators = parsed.data.collaborators || [];
    const totalPercentage = collaborators.reduce((sum, c) => sum + c.persentase, 0);
    if (totalPercentage > 100) {
      res.status(400).json({ error: KARYA_ERRORS.INVALID_COLLABORATORS.message });
      return;
    }

    const { data: karya, error: karyaError } = await supabaseAdmin
      .from('karya')
      .insert({
        judul: parsed.data.judul,
        deskripsi: parsed.data.deskripsi,
        kategori: parsed.data.kategori,
        harga: parsed.data.harga,
        file_hash: fileResult.fileHash,
        ipfs_link: fileResult.ipfsHash,
        cover_image_url: coverUrl,
        file_size_bytes: file.buffer.length,
        file_type: file.mimetype,
        stellar_asset_code: assetCode,
        issuer_wallet: user.wallet_address,
        status: 'draft',
      })
      .select()
      .single();

    if (karyaError || !karya) {
      console.error('[Karya] Create error:', karyaError);
      res.status(500).json({ error: 'Failed to create work' });
      return;
    }

    if (collaborators.length > 0) {
      await supabaseAdmin.from('collaborators').insert(
        collaborators.map((c) => ({
          karya_id: karya.id,
          wallet_address: c.wallet_address,
          nama: c.nama,
          role: c.role,
          persentase: c.persentase,
        }))
      );
    }

    res.status(201).json({ karya });
  } catch (error) {
    console.error('[Karya] Create error:', error);
    res.status(500).json({ error: 'Failed to create work' });
  }
});

// POST /api/v1/karya/:id/publish — Publish karya & mint on Stellar
router.post('/:id/publish', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    if (karya.status !== 'draft') {
      res.status(400).json({ error: KARYA_ERRORS.ALREADY_PUBLISHED.message });
      return;
    }

    // Step 1: Build unsigned mint transaction (for Freighter signing) or auto-mint
    let stellarTxHash: string | null = null;
    const requiresSigning = req.body.requiresSigning === true;

    try {
      if (requiresSigning) {
        // Return unsigned XDR for frontend to sign with Freighter
        const xdr = await buildMintTransaction(
          karya.issuer_wallet,
          karya.stellar_asset_code,
          karya.id
        );

        res.json({
          xdr,
          requiresSigning: true,
          karya_id: karya.id,
          asset_code: karya.stellar_asset_code,
          message: 'Please sign the transaction with your Freighter wallet',
        });
        return;
      } else {
        // Auto-mint: submit signed transaction
        const signedXdr = req.body.signed_xdr;
        if (signedXdr) {
          // Submit externally signed transaction
          const stellar = await import('@stellar/stellar-sdk');
          const { getServer, getNetworkPassphrase } = await import('../lib/stellar');
          const server = getServer();
          const transaction = stellar.TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase());
          const result = await server.submitTransaction(transaction);
          stellarTxHash = result.hash;
        }
      }
    } catch (mintError) {
      console.warn('[Karya] Mint error (non-fatal):', mintError);
      // Karya tetap di-publish meskipun mint gagal (bisa di-retry)
    }

    // Step 2: Update status to published
    const updatePayload: any = {
      status: 'published',
      published_at: new Date().toISOString(),
    };
    if (stellarTxHash) {
      updatePayload.stellar_tx_hash = stellarTxHash;
    }

    const { error: updateError } = await supabaseAdmin
      .from('karya')
      .update(updatePayload)
      .eq('id', id);

    if (updateError) {
      console.error('[Karya] Publish update error:', updateError);
      res.status(500).json({ error: 'Failed to publish work' });
      return;
    }

    res.json({
      karya: {
        id: karya.id,
        status: 'published',
        published_at: new Date().toISOString(),
        stellar_asset_code: karya.stellar_asset_code,
        stellar_tx_hash: stellarTxHash,
      },
      explorer_url: stellarTxHash
        ? `https://stellar.expert/testnet/tx/${stellarTxHash}`
        : null,
    });
  } catch (error) {
    console.error('[Karya] Publish error:', error);
    res.status(500).json({ error: 'Failed to publish work' });
  }
});

// PUT /api/v1/karya/:id — Update karya (draft only)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = updateKaryaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { id } = req.params;

    const { data: karya, error: fetchError } = await supabaseAdmin
      .from('karya')
      .select('issuer_wallet, status')
      .eq('id', id)
      .single();

    if (fetchError || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    if (karya.status !== 'draft') {
      res.status(400).json({ error: KARYA_ERRORS.NOT_DRAFT.message });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from('karya')
      .update(parsed.data)
      .eq('id', id);

    if (updateError) {
      res.status(500).json({ error: 'Failed to update work' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] Update error:', error);
    res.status(500).json({ error: 'Failed to update work' });
  }
});

// DELETE /api/v1/karya/:id — Archive karya
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const { data: karya } = await supabaseAdmin
      .from('karya')
      .select('issuer_wallet')
      .eq('id', id)
      .single();

    if (!karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (karya.issuer_wallet !== user?.wallet_address) {
      res.status(403).json({ error: KARYA_ERRORS.NOT_AUTHORIZED.message });
      return;
    }

    await supabaseAdmin
      .from('karya')
      .update({ status: 'archived' })
      .eq('id', id);

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] Archive error:', error);
    res.status(500).json({ error: 'Failed to archive work' });
  }
});

// POST /api/v1/karya/:id/view — Record view
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;
    const viewerWallet = req.body.viewer_wallet || null;

    await supabaseAdmin.from('karya_views').insert({
      karya_id: id,
      viewer_wallet: viewerWallet,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Karya] View error:', error);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// GET /api/v1/karya/my/list — Get current user's karya list (MUST be before /:id)
router.get('/my/list', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    let query = supabaseAdmin
      .from('karya')
      .select('*', { count: 'exact' })
      .eq('issuer_wallet', user?.wallet_address);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: karya, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      res.status(500).json({ error: 'Failed to fetch works' });
      return;
    }

    res.json({
      karya: karya || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('[Karya] My list error:', error);
    res.status(500).json({ error: 'Failed to fetch works' });
  }
});

// GET /api/v1/karya/:id — Get karya detail with proof
router.get('/:id', async (req: Request, res: Response) => {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { id } = req.params;

    const { data: karya, error } = await supabaseAdmin
      .from('karya')
      .select('*, users!issuer_wallet(nama, wallet_address), collaborators(*)')
      .eq('id', id)
      .single();

    if (error || !karya) {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    if (karya.status === 'draft') {
      res.status(404).json({ error: KARYA_ERRORS.KARYA_NOT_FOUND.message });
      return;
    }

    // Verify proof of authorship if minted
    let proof = null;
    if (karya.stellar_tx_hash) {
      proof = await verifyAuthorship(karya.stellar_tx_hash, karya.issuer_wallet);
    }

    // Build file URL
    const fileUrl = karya.ipfs_link ? getGatewayUrl(karya.ipfs_link) : null;

    res.json({
      karya: {
        ...karya,
        issuer_name: karya.users?.nama,
        issuer_wallet_display: karya.users?.wallet_address,
        users: undefined,
        file_url: fileUrl,
        proof,
      },
    });
  } catch (error) {
    console.error('[Karya] Detail error:', error);
    res.status(500).json({ error: 'Failed to get work' });
  }
});

export default router;

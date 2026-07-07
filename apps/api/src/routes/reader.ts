import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import {
  getReaderDashboard,
  getPurchaseList,
  getDownloadUrl,
  ReaderError,
} from '../services/reader';

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

// GET /api/v1/reader/dashboard — Reader dashboard overview
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await getReaderDashboard(walletAddress);
    res.json(result);
  } catch (error) {
    console.error('[Reader] Dashboard error:', error);
    if (error instanceof ReaderError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch reader dashboard' });
  }
});

// GET /api/v1/reader/purchases — Get all purchases with pagination
router.get('/purchases', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const kategori = req.query.kategori as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await getPurchaseList(walletAddress, { kategori, page, limit });
    res.json(result);
  } catch (error) {
    console.error('[Reader] Purchases error:', error);
    if (error instanceof ReaderError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST /api/v1/reader/access/:karyaId — Generate fresh access URL
router.post('/access/:karyaId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const walletAddress = await getWalletAddress(req.user.sub);
    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const { karyaId } = req.params;
    const result = await getDownloadUrl(walletAddress, karyaId);
    res.json(result);
  } catch (error) {
    console.error('[Reader] Access error:', error);
    if (error instanceof ReaderError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to generate access URL' });
  }
});

export default router;

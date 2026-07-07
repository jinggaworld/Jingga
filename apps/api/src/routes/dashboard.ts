import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import {
  getDashboardStats,
  getRecentTransactions,
  getKaryaList,
  getTransactionHistory,
  getRevenueBreakdown,
  archiveKarya,
  DashboardError,
  DASHBOARD_ERRORS,
} from '../services/dashboard';

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

// GET /api/v1/dashboard — Dashboard overview
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
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

    const [stats, recentTransactions, recentKarya] = await Promise.all([
      getDashboardStats(walletAddress),
      getRecentTransactions(walletAddress, 5),
      getKaryaList(walletAddress, { page: 1, limit: 5 }),
    ]);

    res.json({
      stats,
      recentTransactions,
      recentKarya: recentKarya.karya,
    });
  } catch (error) {
    console.error('[Dashboard] Overview error:', error);
    if (error instanceof DashboardError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/v1/dashboard/karya — Get writer's karya list
router.get('/karya', requireAuth, async (req: AuthRequest, res: Response) => {
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

    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await getKaryaList(walletAddress, { status, page, limit });
    res.json(result);
  } catch (error) {
    console.error('[Dashboard] Karya list error:', error);
    if (error instanceof DashboardError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch karya list' });
  }
});

// GET /api/v1/dashboard/transactions — Get transaction history
router.get('/transactions', requireAuth, async (req: AuthRequest, res: Response) => {
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

    const karya_id = req.query.karya_id as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await getTransactionHistory(walletAddress, { karya_id, page, limit });
    res.json(result);
  } catch (error) {
    console.error('[Dashboard] Transaction history error:', error);
    if (error instanceof DashboardError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

// GET /api/v1/dashboard/revenue — Get revenue breakdown
router.get('/revenue', requireAuth, async (req: AuthRequest, res: Response) => {
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

    const result = await getRevenueBreakdown(walletAddress);
    res.json(result);
  } catch (error) {
    console.error('[Dashboard] Revenue breakdown error:', error);
    if (error instanceof DashboardError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch revenue breakdown' });
  }
});

// POST /api/v1/dashboard/archive/:id — Archive karya
router.post('/archive/:id', requireAuth, async (req: AuthRequest, res: Response) => {
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

    const { id } = req.params;

    // Confirm dialog (client-side sends confirmation)
    const { confirm } = req.body;
    if (!confirm) {
      res.status(400).json({ error: 'Confirmation required. Send { confirm: true }' });
      return;
    }

    const result = await archiveKarya(id, walletAddress);
    res.json(result);
  } catch (error) {
    console.error('[Dashboard] Archive error:', error);
    if (error instanceof DashboardError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to archive karya' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import {
  getUserBadges,
  getBadgeSummary,
  getWalletBadges,
  getAllBadgeDefinitions,
  assignOnboardingBadges,
  BadgeError,
} from '../services/badges';

const router: ReturnType<typeof Router> = Router();

// Helper to get user ID from wallet
async function getUserId(walletAddress: string): Promise<string | null> {
  if (!supabaseAdmin) return null;
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single();
  return user?.id || null;
}

// ============================================================
// GET /api/v1/badges/me — Get current user's badges
// ============================================================
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const badges = await getUserBadges(req.user.sub);
    const summary = await getBadgeSummary(req.user.sub);

    res.json({ badges, summary });
  } catch (error) {
    console.error('[Badges] My badges error:', error);
    if (error instanceof BadgeError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// ============================================================
// GET /api/v1/badges/wallet/:wallet — Get badges for a wallet
// ============================================================
router.get('/wallet/:wallet', async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;
    const badges = await getWalletBadges(wallet);

    res.json({ wallet, badges, count: badges.length });
  } catch (error) {
    console.error('[Badges] Wallet badges error:', error);
    if (error instanceof BadgeError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to fetch wallet badges' });
  }
});

// ============================================================
// GET /api/v1/badges/definitions — Get all badge definitions
// ============================================================
router.get('/definitions', async (_req: Request, res: Response) => {
  try {
    const definitions = await getAllBadgeDefinitions();
    res.json({ definitions, count: definitions.length });
  } catch (error) {
    console.error('[Badges] Definitions error:', error);
    res.status(500).json({ error: 'Failed to fetch badge definitions' });
  }
});

// ============================================================
// POST /api/v1/badges/onboard — Assign onboarding badges (for email reg)
// ============================================================
router.post('/onboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !supabaseAdmin) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authMethod = req.body.auth_method || 'wallet';
    await assignOnboardingBadges(req.user.sub, authMethod);

    res.json({ success: true });
  } catch (error) {
    console.error('[Badges] Onboard error:', error);
    if (error instanceof BadgeError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to assign onboarding badges' });
  }
});

export default router;

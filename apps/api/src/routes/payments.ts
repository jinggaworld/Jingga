import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  initiatePayment,
  confirmPayment,
  hasPurchased,
  getPurchaseHistory,
  PaymentError,
  PAYMENT_ERRORS,
} from '../services/payment';
import {
  initiateClaimableBalance,
  submitClaimableBalance,
  initiateClaim,
  submitClaim,
  getClaimableBalanceStatus,
  ClaimableBalanceError,
  CLAIMABLE_ERRORS,
} from '../services/claimableBalance';
import { supabaseAdmin } from '../lib/supabase';
import {
  getPathPaymentQuote,
  initiatePathPayment,
  confirmPathPayment,
  getExchangeRates,
  PathPaymentError,
  PATH_PAYMENT_ERRORS,
} from '../services/pathPayment';

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/payments/initiate — Generate unsigned payment XDR
router.post('/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karya_id } = req.body;
    if (!karya_id) {
      res.status(400).json({ error: 'karya_id is required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await initiatePayment(user.wallet_address, karya_id);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Initiate error:', error);
    if (error instanceof PaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// POST /api/v1/payments/confirm — Submit signed transaction and grant access
router.post('/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { signed_xdr, karya_id } = req.body;
    if (!signed_xdr || !karya_id) {
      res.status(400).json({ error: 'signed_xdr and karya_id are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await confirmPayment(signed_xdr, karya_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Confirm error:', error);
    if (error instanceof PaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// GET /api/v1/payments/check/:karyaId — Check if user has purchased karya
router.get('/check/:karyaId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karyaId } = req.params;

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await hasPurchased(user.wallet_address, karyaId);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Check error:', error);
    res.status(500).json({ error: 'Failed to check purchase status' });
  }
});

// GET /api/v1/payments/history — Get purchase history for current user
router.get('/history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Get buyer's wallet address
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const history = await getPurchaseHistory(user.wallet_address);
    res.json({ purchases: history });
  } catch (error) {
    console.error('[Payments] History error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

// POST /api/v1/payments/claimable/initiate — Generate XDR for claimable balance
router.post('/claimable/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karya_id } = req.body;
    if (!karya_id) {
      res.status(400).json({ error: 'karya_id is required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await initiateClaimableBalance(karya_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Claimable initiate error:', error);
    if (error instanceof ClaimableBalanceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate claimable balance' });
  }
});

// POST /api/v1/payments/claimable/create — Submit signed claimable balance
router.post('/claimable/create', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { signed_xdr, karya_id } = req.body;
    if (!signed_xdr || !karya_id) {
      res.status(400).json({ error: 'signed_xdr and karya_id are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await submitClaimableBalance(signed_xdr, karya_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Claimable create error:', error);
    if (error instanceof ClaimableBalanceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to create claimable balance' });
  }
});

// POST /api/v1/payments/claimable/initiate-claim — Generate XDR for claiming
router.post('/claimable/initiate-claim', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { balance_id } = req.body;
    if (!balance_id) {
      res.status(400).json({ error: 'balance_id is required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await initiateClaim(balance_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Claimable initiate-claim error:', error);
    if (error instanceof ClaimableBalanceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate claim' });
  }
});

// POST /api/v1/payments/claimable/claim — Submit signed claim
router.post('/claimable/claim', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { balance_id, signed_xdr } = req.body;
    if (!balance_id || !signed_xdr) {
      res.status(400).json({ error: 'balance_id and signed_xdr are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await submitClaim(signed_xdr, balance_id, user.wallet_address);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Claimable claim error:', error);
    if (error instanceof ClaimableBalanceError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to claim balance' });
  }
});

// GET /api/v1/payments/claimable/:balanceId — Get balance status
router.get('/claimable/:balanceId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { balanceId } = req.params;

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const status = await getClaimableBalanceStatus(balanceId, user.wallet_address);
    if (!status) {
      res.status(404).json({ error: 'Balance not found' });
      return;
    }

    res.json(status);
  } catch (error) {
    console.error('[Payments] Claimable status error:', error);
    res.status(500).json({ error: 'Failed to get balance status' });
  }
});

// ============================================================
// Path Payment (Cross-currency via Stellar DEX)
// ============================================================

// GET /api/v1/payments/rates — Get current exchange rates
router.get('/rates', async (_req: Request, res: Response) => {
  try {
    const rates = await getExchangeRates();
    res.json({ rates, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('[Payments] Rates error:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// POST /api/v1/payments/path/quote — Get a path payment quote
router.post('/path/quote', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { source_asset, source_amount } = req.body;
    if (!source_asset || !source_amount) {
      res.status(400).json({ error: 'source_asset and source_amount are required' });
      return;
    }

    const quote = await getPathPaymentQuote(source_asset, source_amount);
    res.json({ quote });
  } catch (error) {
    console.error('[Payments] Path quote error:', error);
    if (error instanceof PathPaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to get quote' });
  }
});

// POST /api/v1/payments/path/initiate — Build unsigned XDR for path payment
router.post('/path/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { karya_id, source_asset, source_amount } = req.body;
    if (!karya_id || !source_asset || !source_amount) {
      res.status(400).json({ error: 'karya_id, source_asset, and source_amount are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await initiatePathPayment(user.wallet_address, karya_id, source_asset, source_amount);
    res.json(result);
  } catch (error) {
    console.error('[Payments] Path initiate error:', error);
    if (error instanceof PathPaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to initiate path payment' });
  }
});

// POST /api/v1/payments/path/confirm — Submit signed path payment
router.post('/path/confirm', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: PAYMENT_ERRORS.USER_NOT_AUTHENTICATED.message });
      return;
    }

    const { signed_xdr, karya_id, source_asset } = req.body;
    if (!signed_xdr || !karya_id) {
      res.status(400).json({ error: 'signed_xdr and karya_id are required' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('wallet_address')
      .eq('id', req.user.sub)
      .single();

    if (!user?.wallet_address) {
      res.status(400).json({ error: 'Wallet address not found' });
      return;
    }

    const result = await confirmPathPayment(signed_xdr, karya_id, user.wallet_address, source_asset || 'USDC');
    res.json(result);
  } catch (error) {
    console.error('[Payments] Path confirm error:', error);
    if (error instanceof PathPaymentError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    res.status(500).json({ error: 'Failed to confirm path payment' });
  }
});

export default router;

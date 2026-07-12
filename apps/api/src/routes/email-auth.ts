import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { generateKeypair, encryptPrivateKey, hashPassword, verifyPassword } from '../lib/crypto';
import { signJWT } from '../middleware/auth';
import { fundTestnetAccount } from '../lib/stellar';
import { registerSchema, loginSchema } from '../schemas/auth';

const router: ReturnType<typeof Router> = Router();

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, nama, password } = parsed.data;

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Check email uniqueness
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Generate Stellar keypair
    const keypair = generateKeypair();
    const publicKey = keypair.publicKey();
    const secretKey = keypair.secret();

    // Encrypt private key
    const { encrypted, iv, authTag } = encryptPrivateKey(secretKey);

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        email,
        nama,
        wallet_address: publicKey,
        role: 'keduanya',
        auth_type: 'email',
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (userError || !user) {
      console.error('[Auth] User creation error:', userError);
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    // Create custodial wallet
    const { error: walletError } = await supabaseAdmin
      .from('custodial_wallets')
      .insert({
        user_id: user.id,
        public_key: publicKey,
        encrypted_private_key: encrypted,
        encryption_iv: `${iv}:${authTag}`,
        is_funded: false,
      });

    if (walletError) {
      console.error('[Auth] Wallet creation error:', walletError);
    }

    // Fund wallet via Friendbot (non-blocking - don't fail registration if this fails)
    try {
      await fundTestnetAccount(publicKey);
      console.log('[Auth] Wallet funded via Friendbot:', publicKey);
      await supabaseAdmin
        .from('custodial_wallets')
        .update({ is_funded: true })
        .eq('user_id', user.id);
    } catch (fundError) {
      console.warn('[Auth] Friendbot funding failed (wallet can be funded later):', fundError);
      // Non-fatal: wallet can be funded when user first needs to transact
    }

    // Generate JWT
    const token = signJWT({
      sub: user.id,
      wallet_address: publicKey,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        nama: user.nama,
        email: user.email,
        role: user.role,
        auth_type: 'email',
        created_at: user.created_at,
      },
      wallet: {
        publicKey,
        isFunded: false,
      },
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    if (!supabaseAdmin) {
      res.status(500).json({ error: 'Database not configured' });
      return;
    }

    // Find user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Verify password
    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses wallet authentication' });
      return;
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Get wallet info
    const { data: wallet } = await supabaseAdmin
      .from('custodial_wallets')
      .select('public_key, is_funded')
      .eq('user_id', user.id)
      .single();

    // Generate JWT
    const walletAddress = wallet?.public_key || user.wallet_address;
    const token = signJWT({
      sub: user.id,
      wallet_address: walletAddress,
    });

    res.json({
      token,
      user: {
        id: user.id,
        wallet_address: walletAddress,
        nama: user.nama,
        email: user.email,
        role: user.role,
        auth_type: 'email',
        created_at: user.created_at,
      },
      wallet: {
        publicKey: walletAddress,
        isFunded: wallet?.is_funded || false,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;

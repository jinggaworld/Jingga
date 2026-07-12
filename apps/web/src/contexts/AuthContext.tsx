'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isFreighterInstalled,
  getPublicKey,
  signMessage,
  requestAccess,
  truncateAddress,
} from '@/lib/freighter';
import { API_BASE, apiRequest } from '@/lib/api';

interface User {
  id: string;
  wallet_address: string;
  nama: string;
  email?: string;
  role: string;
  auth_type?: string;
  created_at: string;
}

interface WalletInfo {
  publicKey: string;
  isFunded: boolean;
  isCustodial: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  wallet: WalletInfo | null;
  isConnected: boolean;
  isConnecting: boolean;
  isRestoring: boolean;
  isFreighterAvailable: boolean;
  authMethod: 'freighter' | 'email' | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  connectFreighter: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, nama: string, password: string) => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'jingga_auth_token';
const WALLET_KEY = 'jingga_wallet_address';
const AUTH_METHOD_KEY = 'jingga_auth_method';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isFreighterAvailable, setIsFreighterAvailable] = useState(false);
  const [authMethod, setAuthMethod] = useState<'freighter' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check Freighter on mount + periodically (extension may load after page)
  useEffect(() => {
    isFreighterInstalled().then(setIsFreighterAvailable);
    const interval = setInterval(() => {
      isFreighterInstalled().then(setIsFreighterAvailable);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedWallet = localStorage.getItem(WALLET_KEY);
    const savedMethod = localStorage.getItem(AUTH_METHOD_KEY) as 'freighter' | 'email' | null;
    if (savedToken && savedWallet) {
      setToken(savedToken);
      setWalletAddress(savedWallet);
      setAuthMethod(savedMethod);
      // Verify token
      fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setUser(data.user);
          else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(WALLET_KEY);
            localStorage.removeItem(AUTH_METHOD_KEY);
            setToken(null);
            setWalletAddress(null);
            setAuthMethod(null);
          }
        })
        .catch(() => {
          // Network error — keep saved session, user stays logged in
          console.warn('[Auth] Could not verify session, using cached data');
        })
        .finally(() => {
          setIsRestoring(false);
        });
    } else {
      setIsRestoring(false);
    }
  }, []);

  const connectFreighter = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Request access first (required by Freighter v2)
      await requestAccess();
      const publicKey = await getPublicKey();

      // Get challenge from backend
      const challengeRes = await fetch(`${API_BASE}/api/v1/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey }),
      });

      if (!challengeRes.ok) throw new Error('Failed to get authentication challenge');

      const { challenge, nonce } = await challengeRes.json();

      // Try to sign the challenge with Freighter wallet
      // signMessage returns null if not available (graceful fallback)
      const signedMessage = await signMessage(challenge);

      // Build verify payload — include signedMessage only if available
      const verifyPayload: Record<string, string> = { publicKey, nonce };
      if (signedMessage) {
        verifyPayload.signedMessage = signedMessage;
      }

      // Verify with backend
      const verifyRes = await fetch(`${API_BASE}/api/v1/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyPayload),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json();
        throw new Error(errData.error || 'Authentication failed');
      }

      const { token: newToken, user: userData } = await verifyRes.json();

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(WALLET_KEY, publicKey);
      localStorage.setItem(AUTH_METHOD_KEY, 'freighter');
      setToken(newToken);
      setWalletAddress(publicKey);
      setUser(userData);
      setWallet({ publicKey, isFunded: true, isCustodial: false });
      setAuthMethod('freighter');

      // Auto-assign onboarding badges (non-blocking)
      apiRequest('/api/v1/badges/onboard', {
        method: 'POST',
        body: JSON.stringify({ auth_method: 'freighter' }),
      }).catch(() => {});
    } catch (err: any) {
      console.error('[Auth] Freighter connect error:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, nama: string, password: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nama, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Registration failed');
      }

      const { token: newToken, user: userData, wallet: walletData } = await res.json();

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(WALLET_KEY, walletData.publicKey);
      localStorage.setItem(AUTH_METHOD_KEY, 'email');
      setToken(newToken);
      setWalletAddress(walletData.publicKey);
      setUser(userData);
      setWallet({ ...walletData, isCustodial: true });
      setAuthMethod('email');

      // Auto-assign onboarding badges (non-blocking)
      apiRequest('/api/v1/badges/onboard', {
        method: 'POST',
        body: JSON.stringify({ auth_method: 'email' }),
      }).catch(() => {});
    } catch (err: any) {
      console.error('[Auth] Register error:', err);
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Login failed');
      }

      const { token: newToken, user: userData, wallet: walletData } = await res.json();

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(WALLET_KEY, walletData.publicKey);
      localStorage.setItem(AUTH_METHOD_KEY, 'email');
      setToken(newToken);
      setWalletAddress(walletData.publicKey);
      setUser(userData);
      setWallet({ ...walletData, isCustodial: true });
      setAuthMethod('email');

      // Auto-assign onboarding badges for returning user (non-blocking, will be no-op if already assigned)
      apiRequest('/api/v1/badges/onboard', {
        method: 'POST',
        body: JSON.stringify({ auth_method: 'email' }),
      }).catch(() => {});
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(WALLET_KEY);
    localStorage.removeItem(AUTH_METHOD_KEY);
    setToken(null);
    setWalletAddress(null);
    setUser(null);
    setWallet(null);
    setAuthMethod(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        walletAddress,
        wallet,
        isRestoring,
        isConnected: !!token && !!user,
        isConnecting,
        isFreighterAvailable,
        authMethod,
        error,
        connectFreighter,
        loginWithEmail,
        registerWithEmail,
        disconnect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export { truncateAddress };

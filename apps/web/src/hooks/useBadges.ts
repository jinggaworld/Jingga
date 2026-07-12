'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest, API_BASE } from '@/lib/api';

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon_name: string;
  category: string;
  tier: number;
  is_hidden: boolean;
}

export interface UserBadgeEntry {
  id: string;
  badge_code: string;
  awarded_at: string;
  progress: number | null;
  metadata: any;
  definition: BadgeDefinition;
}

export interface BadgeSummary {
  total_badges: number;
  by_category: Record<string, number>;
  highest_tier: number;
  recent_badges: UserBadgeEntry[];
}

interface BadgesResponse {
  badges: UserBadgeEntry[];
  summary: BadgeSummary;
}

interface WalletBadgesResponse {
  wallet: string;
  badges: UserBadgeEntry[];
  count: number;
}

export function useMyBadges() {
  const [badges, setBadges] = useState<UserBadgeEntry[]>([]);
  const [summary, setSummary] = useState<BadgeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiRequest<BadgesResponse>('/api/v1/badges/me');
      setBadges(result.badges);
      setSummary(result.summary);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return { badges, summary, loading, error, refetch: fetchBadges };
}

export function useWalletBadges(walletAddress: string | null) {
  const [badges, setBadges] = useState<UserBadgeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setBadges([]);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/api/v1/badges/wallet/${walletAddress}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: WalletBadgesResponse | null) => setBadges(data?.badges || []))
      .catch(() => setBadges([]))
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return { badges, loading };
}

// Assign onboarding badges (call after email registration)
export async function assignOnboardingBadges(authMethod: string): Promise<void> {
  await apiRequest('/api/v1/badges/onboard', {
    method: 'POST',
    body: JSON.stringify({ auth_method: authMethod }),
  });
}

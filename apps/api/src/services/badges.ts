import { supabaseAdmin } from '../lib/supabase';

export class BadgeError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number = 500) {
    super(message);
    this.name = 'BadgeError';
    this.code = code;
    this.status = status;
  }
}

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  icon_name: string;
  category: string;
  tier: number;
  is_hidden: boolean;
}

export interface UserBadge {
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
  recent_badges: UserBadge[];
}

// ============================================================
// Get all badge definitions
// ============================================================
export async function getAllBadgeDefinitions(): Promise<BadgeDefinition[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('badge_definitions')
    .select('*')
    .order('tier', { ascending: true })
    .order('category', { ascending: true });

  if (error) {
    console.error('[Badges] Fetch definitions error:', error);
    return [];
  }

  return (data || []).map((b: any) => ({
    code: b.code,
    name: b.name,
    description: b.description,
    icon_name: b.icon_name,
    category: b.category,
    tier: b.tier,
    is_hidden: b.is_hidden,
  }));
}

// ============================================================
// Get user badges (with definitions joined)
// ============================================================
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from('user_badges')
    .select(`
      id,
      badge_code,
      awarded_at,
      progress,
      metadata,
      badge_definitions!inner(
        code,
        name,
        description,
        icon_name,
        category,
        tier,
        is_hidden
      )
    `)
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) {
    console.error('[Badges] Fetch user badges error:', error);
    return [];
  }

  return (data || []).map((b: any) => ({
    id: b.id,
    badge_code: b.badge_code,
    awarded_at: b.awarded_at,
    progress: b.progress,
    metadata: b.metadata,
    definition: {
      code: b.badge_definitions.code,
      name: b.badge_definitions.name,
      description: b.badge_definitions.description,
      icon_name: b.badge_definitions.icon_name,
      category: b.badge_definitions.category,
      tier: b.badge_definitions.tier,
      is_hidden: b.badge_definitions.is_hidden,
    },
  }));
}

// ============================================================
// Get badges for a wallet address (public view)
// ============================================================
export async function getWalletBadges(walletAddress: string): Promise<UserBadge[]> {
  if (!supabaseAdmin) return [];

  // Get user by wallet
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single();

  if (!user) return [];

  return getUserBadges(user.id);
}

// ============================================================
// Get badge summary (stats)
// ============================================================
export async function getBadgeSummary(userId: string): Promise<BadgeSummary> {
  const badges = await getUserBadges(userId);

  const byCategory: Record<string, number> = {};
  let highestTier = 0;

  badges.forEach((b) => {
    const cat = b.definition.category;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    if (b.definition.tier > highestTier) {
      highestTier = b.definition.tier;
    }
  });

  return {
    total_badges: badges.length,
    by_category: byCategory,
    highest_tier: highestTier,
    recent_badges: badges.slice(0, 5),
  };
}

// ============================================================
// Manually assign a badge (for admin or onboarding)
// ============================================================
export async function assignBadge(
  userId: string,
  badgeCode: string,
  metadata: any = {}
): Promise<boolean> {
  if (!supabaseAdmin) return false;

  // Check if badge exists
  const { data: badgeDef } = await supabaseAdmin
    .from('badge_definitions')
    .select('code')
    .eq('code', badgeCode)
    .single();

  if (!badgeDef) {
    throw new BadgeError(`Badge definition '${badgeCode}' not found`, 'BADGE_NOT_FOUND', 404);
  }

  // Check if already assigned
  const { data: existing } = await supabaseAdmin
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_code', badgeCode)
    .single();

  if (existing) return true; // Already has it

  const { error } = await supabaseAdmin
    .from('user_badges')
    .insert({
      user_id: userId,
      badge_code: badgeCode,
      metadata,
    });

  if (error) {
    console.error('[Badges] Assign error:', error);
    return false;
  }

  return true;
}

// ============================================================
// Assign onboarding badges (called after user creation)
// ============================================================
export async function assignOnboardingBadges(userId: string, authMethod: string): Promise<void> {
  // Hackathon 2026 badge
  await assignBadge(userId, 'hackathon_2026', { source: 'onboarding' });

  // Early Adopter badge
  await assignBadge(userId, 'early_adopter', { source: 'onboarding' });

  // Stellar Native badge for Freighter users
  if (authMethod === 'freighter') {
    await assignBadge(userId, 'stellar_native', { source: 'onboarding' });
  }

  // Verified badge for email users
  if (authMethod === 'email') {
    await assignBadge(userId, 'verified', { source: 'onboarding' });
  }
}

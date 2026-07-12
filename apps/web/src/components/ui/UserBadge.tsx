'use client';

import React, { useState } from 'react';

// ============================================================
// Badge Icon SVGs (Discord-style)
// ============================================================
const BADGE_ICONS: Record<string, React.ReactNode> = {
  feather: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M14 2L6 10l-2 4 4-2 8-8a2.828 2.828 0 00-4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  pen: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M13.5 2.5l4 4L7 17H3v-4l10.5-10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  crown: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M2 15h16L16 5l-4 4-2-6-2 6-4-4L2 15z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M6 17h8M10 17V9M10 9a5 5 0 005-5H5a5 5 0 005 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M15 4a3 3 0 013 3c0 1.5-1 2.5-3 3M5 4a3 3 0 00-3 3c0 1.5 1 2.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 2L2 8l8 10 8-10-8-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M10 6v8M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  gem: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 2l4 4-4 12-4-12 4-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M6 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  book: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M4 3h12v14H4a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M8 7h4M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  books: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M4 3h3v14H4V3zM9 3h3v14H9V3zM14 5h2v12h-2V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M2 17c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="14" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M11 17c0-2.5 1.5-4 3-4s3 1.5 3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  license: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M7 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  exchange: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M6 5h10M16 5l-3-3M16 5l-3 3M14 15H4M4 15l3-3M4 15l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 2l7 3v5a7 7 0 01-7 7 7 7 0 01-7-7V5l7-3z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M10 1l2.5 7H19l-6 4.5L15 18l-5-4-5 4 2-5.5L1 8h6.5L10 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  rocket: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M5 15c-2-2-3-6 0-9l5-4c0 0 5 1 7 3s3 7 3 7l-4 5c-3 3-7 2-9 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M11 9a2 2 0 11-4 0 2 2 0 014 0z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  ),
  zap: (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <path d="M11 1L4 11h6l-1 8 7-10h-6l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
};

// Fallback for unknown icons
function FallbackIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-full h-full">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <text x="10" y="14" textAnchor="middle" stroke="currentColor" fontSize="12" fill="currentColor">★</text>
    </svg>
  );
}

// ============================================================
// Tier colors (like Discord's badge tiers)
// ============================================================
const TIER_COLORS: Record<number, { bg: string; text: string; border: string; glow: string }> = {
  1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', glow: 'shadow-amber-200' },      // Bronze
  2: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-400', glow: 'shadow-slate-300' },      // Silver
  3: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-400', glow: 'shadow-yellow-200' },   // Gold
  4: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-400', glow: 'shadow-cyan-200' },           // Platinum
  5: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-400', glow: 'shadow-purple-200' },   // Diamond
};

// ============================================================
// Category colors
// ============================================================
const CATEGORY_COLORS: Record<string, string> = {
  achievement: 'text-amber-500',
  contribution: 'text-blue-500',
  status: 'text-emerald-500',
  milestone: 'text-purple-500',
};

// ============================================================
// Props
// ============================================================
interface UserBadgeProps {
  code: string;
  name: string;
  description: string;
  icon_name?: string;
  category?: string;
  tier?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

// ============================================================
// Component
// ============================================================
export function UserBadge({
  code,
  name,
  description,
  icon_name = 'star',
  category = 'achievement',
  tier = 1,
  size = 'md',
  showTooltip = true,
  className = '',
}: UserBadgeProps) {
  const [showTip, setShowTip] = useState(false);

  const icon = BADGE_ICONS[icon_name] || <FallbackIcon />;
  const colors = TIER_COLORS[tier] || TIER_COLORS[1];
  const catColor = CATEGORY_COLORS[category] || 'text-ink-muted';

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      {/* Badge Circle — Discord-style */}
      <div
        className={[
          sizeClasses[size],
          'rounded-full flex items-center justify-center',
          'border-2',
          'transition-transform duration-150 hover:scale-110',
          colors.border,
          colors.text,
          'bg-canvas',
        ].join(' ')}
        style={{ boxShadow: `0 0 0 1px ${colors.bg}` }}
      >
        <span className="p-[3px]">
          {icon}
        </span>
      </div>

      {/* Tooltip — Discord-style on hover */}
      {showTooltip && showTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100] pointer-events-none">
          <div className="bg-inverse-canvas border border-inverse-surface-1 rounded-none px-md py-sm min-w-[180px] shadow-lg">
            <div className="flex items-center gap-sm mb-xs">
              <span className={[sizeClasses.sm, 'flex-shrink-0', catColor].join(' ')}>
                {icon}
              </span>
              <span className="text-body-sm font-medium text-inverse-ink">{name}</span>
            </div>
            <p className="text-caption text-inverse-ink-muted">{description}</p>
            <div className="flex items-center gap-xs mt-xs">
              <span className={[
                'text-caption font-medium capitalize',
                tier >= 3 ? 'text-yellow-400' : tier >= 2 ? 'text-slate-300' : 'text-amber-400'
              ].join(' ')}>
                Tier {tier}
              </span>
              <span className="text-caption text-inverse-ink-muted">·</span>
              <span className="text-caption text-inverse-ink-muted capitalize">{category}</span>
            </div>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-inverse-canvas border-r border-b border-inverse-surface-1 -mt-1 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Badge Showcase — Display all badges for a user
// ============================================================
interface BadgeShowcaseProps {
  badges: Array<{
    badge_code: string;
    definition: {
      code: string;
      name: string;
      description: string;
      icon_name: string;
      category: string;
      tier: number;
    };
  }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BadgeShowcase({ badges, max = 6, size = 'sm', className = '' }: BadgeShowcaseProps) {
  if (!badges || badges.length === 0) return null;

  const displayBadges = badges.slice(0, max);
  const remaining = badges.length - max;

  return (
    <div className={['flex items-center gap-1 flex-wrap', className].join(' ')}>
      {displayBadges.map((badge) => (
        <UserBadge
          key={badge.badge_code}
          code={badge.definition.code}
          name={badge.definition.name}
          description={badge.definition.description}
          icon_name={badge.definition.icon_name}
          category={badge.definition.category}
          tier={badge.definition.tier}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className="text-caption text-ink-subtle ml-1">
          +{remaining}
        </span>
      )}
    </div>
  );
}

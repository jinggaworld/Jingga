'use client';

import React from 'react';
import { type MarketplaceKarya } from '@/hooks/useMarketplace';
import { Badge } from '@/components/ui/Badge';

interface KaryaCardProps {
  karya: MarketplaceKarya;
}

const kategoriLabels: Record<string, string> = {
  fiksi: 'Fiction',
  paper: 'Paper',
  puisi: 'Poetry',
  'non-fiksi': 'Non-Fiction',
};

export function KaryaCard({ karya }: KaryaCardProps) {
  return (
    <a
      href={`/karya/${karya.id}`}
      className="group block bg-canvas border border-hairline rounded-none overflow-hidden hover:border-ink-subtle transition-colors"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] bg-surface-1 overflow-hidden">
        {karya.cover_image_url ? (
          <img
            src={karya.cover_image_url}
            alt={karya.judul}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-2">
            <span className="text-display-md text-ink-subtle/30 font-light">
              {karya.judul.charAt(0)}
            </span>
          </div>
        )}

        {/* Category Badge */}
        <div className="absolute top-sm left-sm">
          <Badge variant="info">{kategoriLabels[karya.kategori] || karya.kategori}</Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-md">
        <h3 className="text-card-title text-ink mb-xs line-clamp-2">{karya.judul}</h3>
        <p className="text-body-sm text-ink-muted mb-sm">{karya.issuer_name}</p>

        <div className="flex items-center justify-between">
          <span className="text-body-emphasis text-primary">{karya.harga} XLM</span>
          {karya.total_sales > 0 && (
            <span className="text-caption text-ink-subtle">{karya.total_sales} sold</span>
          )}
        </div>
      </div>
    </a>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { BadgeShowcase } from '@/components/ui/UserBadge';
import { useWalletBadges } from '@/hooks/useBadges';

interface KaryaInfoProps {
  judul: string;
  issuer_name: string;
  kategori: string;
  harga: number;
  total_sales: number;
  issuerWallet: string;
}

const kategoriLabels: Record<string, string> = {
  fiksi: 'Fiction',
  paper: 'Paper',
  puisi: 'Poetry',
  'non-fiksi': 'Non-Fiction',
};

export function KaryaInfo({ judul, issuer_name, kategori, harga, total_sales, issuerWallet }: KaryaInfoProps) {
  const { badges } = useWalletBadges(issuerWallet);

  return (
    <div>
      <Badge variant="info" className="mb-sm">{kategoriLabels[kategori] || kategori}</Badge>
      <h1 className="text-headline text-ink mb-sm">{judul}</h1>
      <div className="flex items-center gap-sm mb-md">
        <p className="text-body text-ink-muted">by {issuer_name}</p>
        {badges.length > 0 && (
          <BadgeShowcase badges={badges} max={4} size="sm" />
        )}
      </div>

      <div className="flex items-baseline gap-sm mb-lg">
        <span className="text-display-md text-primary font-light">{harga} XLM</span>
      </div>

      {total_sales > 0 && (
        <p className="text-body-sm text-ink-subtle mb-lg">
          {total_sales} {total_sales === 1 ? 'sale' : 'sales'}
        </p>
      )}
    </div>
  );
}

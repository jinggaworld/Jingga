'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface KaryaInfoProps {
  judul: string;
  issuer_name: string;
  kategori: string;
  harga: number;
  total_sales: number;
}

const kategoriLabels: Record<string, string> = {
  fiksi: 'Fiction',
  paper: 'Paper',
  puisi: 'Poetry',
  'non-fiksi': 'Non-Fiction',
};

export function KaryaInfo({ judul, issuer_name, kategori, harga, total_sales }: KaryaInfoProps) {
  return (
    <div>
      <Badge variant="info" className="mb-sm">{kategoriLabels[kategori] || kategori}</Badge>
      <h1 className="text-headline text-ink mb-sm">{judul}</h1>
      <p className="text-body text-ink-muted mb-md">by {issuer_name}</p>

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

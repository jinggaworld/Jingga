'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RecentPurchase } from '@/hooks/useReader';
import { getAccessUrl } from '@/hooks/useReader';

interface PurchasedKaryaCardProps {
  purchase: RecentPurchase;
}

export default function PurchasedKaryaCard({ purchase }: PurchasedKaryaCardProps) {
  const [accessing, setAccessing] = useState(false);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetAccess = async () => {
    try {
      setAccessing(true);
      setError(null);
      const result = await getAccessUrl(purchase.karya_id);
      setAccessUrl(result.accessUrl);

    } catch (err: any) {
      setError(err.message || 'Gagal mendapatkan akses');
    } finally {
      setAccessing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover */}
      <div className="aspect-[3/4] relative">
        {purchase.cover_image_url ? (
          <img
            src={purchase.cover_image_url}
            alt={purchase.judul}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-4xl">📖</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/karya/${purchase.karya_id}`}
            className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2"
          >
            {purchase.judul}
          </Link>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200 flex-shrink-0">
            {purchase.kategori}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-3">{purchase.issuer_name}</p>

        <div className="text-sm text-gray-400 mb-3">
          Dibeli: {new Date(purchase.purchased_at).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>

        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}

        {accessUrl ? (
          <a
            href={accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            ✓ File Terbuka
          </a>
        ) : (
          <button
            onClick={handleGetAccess}
            disabled={accessing}
            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {accessing ? 'Membuka...' : '📥 Download / Baca'}
          </button>
        )}
      </div>
    </div>
  );
}

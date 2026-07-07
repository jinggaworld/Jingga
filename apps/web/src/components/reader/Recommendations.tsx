'use client';

import Link from 'next/link';
import type { Recommendation } from '@/hooks/useReader';

interface RecommendationsProps {
  recommendations: Recommendation[];
  favoriteCategory: string | null;
  loading: boolean;
}

export default function Recommendations({ recommendations, favoriteCategory, loading }: RecommendationsProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-shrink-0 w-48">
            <div className="aspect-[3/4] bg-gray-100 rounded-lg animate-pulse mb-2" />
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-1" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">✨</div>
        <p className="text-gray-500">
          {favoriteCategory
            ? `Beli karya "${favoriteCategory}" lainnya untuk melihat rekomendasi`
            : 'Beli karya pertama untuk mendapatkan rekomendasi'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {favoriteCategory && (
        <p className="text-sm text-gray-500 mb-4">
          Berdasarkan preferensi Anda dalam genre <span className="font-medium text-gray-700">{favoriteCategory}</span>
        </p>
      )}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {recommendations.map(rec => (
          <Link
            key={rec.id}
            href={`/karya/${rec.id}`}
            className="flex-shrink-0 w-44 group"
          >
            <div className="aspect-[3/4] rounded-lg overflow-hidden mb-2 bg-gray-100">
              {rec.cover_image_url ? (
                <img
                  src={rec.cover_image_url}
                  alt={rec.judul}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <span className="text-3xl">📖</span>
                </div>
              )}
            </div>
            <h4 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
              {rec.judul}
            </h4>
            <p className="text-xs text-gray-500 mt-1">{rec.issuer_name}</p>
            <p className="text-sm font-semibold text-primary-600 mt-1">{rec.harga} XLM</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

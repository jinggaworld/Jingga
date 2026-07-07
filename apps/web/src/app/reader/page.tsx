'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ReaderStatsSection from '@/components/reader/ReaderStats';
import PurchasedKaryaCard from '@/components/reader/PurchasedKaryaCard';
import PurchaseHistory from '@/components/reader/PurchaseHistory';
import Recommendations from '@/components/reader/Recommendations';
import {
  useReaderDashboard,
  usePurchaseList,
} from '@/hooks/useReader';

const KATEGORI_FILTERS = ['all', 'fiksi', 'paper', 'puisi', 'non-fiksi'] as const;

export default function ReaderPage() {
  const { user, isConnected } = useAuth();

  // Dashboard overview
  const { data: overview, loading: overviewLoading, refetch } = useReaderDashboard();

  // Purchase list
  const [kategori, setKategori] = useState<string>('all');
  const { data: purchaseData, loading: purchaseLoading } = usePurchaseList(kategori);

  // Auth gate
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Diperlukan</h1>
          <p className="text-gray-500 mb-6">Silakan login untuk mengakses koleksi Anda</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Koleksi Saya</h1>
          <p className="text-gray-500 mt-1">
            Karya-karya yang sudah Anda beli
          </p>
        </div>

        {/* Stats */}
        {overview?.stats && (
          <div className="mb-8">
            <ReaderStatsSection stats={overview.stats} />
          </div>
        )}

        {overviewLoading && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Purchased Karya */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Karya Saya</h2>
          </div>

          {/* Kategori tabs */}
          <div className="flex gap-2 mb-4">
            {KATEGORI_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setKategori(cat)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  kategori === cat
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {purchaseLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden">
                  <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-8 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : purchaseData && purchaseData.purchases.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {purchaseData.purchases.map((purchase, idx) => (
                <PurchasedKaryaCard
                  key={`${purchase.karya_id}-${idx}`}
                  purchase={purchase}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="text-4xl mb-4">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada karya</h3>
              <p className="text-gray-500 mb-4">Mulai jelajahi marketplace untuk menemukan karya menarik!</p>
              <Link
                href="/marketplace"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Jelajahi Marketplace
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Purchase History */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Riwayat Pembelian</h2>
            </div>
            <div className="p-6">
              <PurchaseHistory
                purchases={purchaseData?.purchases || overview?.recentPurchases || []}
                loading={purchaseLoading && overviewLoading}
              />
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Rekomendasi untuk Anda</h2>
            </div>
            <div className="p-6">
              <Recommendations
                recommendations={overview?.recommendations || []}
                favoriteCategory={overview?.stats?.favoriteCategory || null}
                loading={overviewLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

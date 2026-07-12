'use client';

import type { PurchaseListItem, RecentPurchase } from '@/hooks/useReader';

type PurchaseItem = PurchaseListItem | (RecentPurchase & { harga?: number; explorer_url?: string | null });

interface PurchaseHistoryProps {
  purchases: PurchaseItem[];
  loading: boolean;
}

export default function PurchaseHistory({ purchases, loading }: PurchaseHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No purchases yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
            <th className="pb-3 font-medium">Work</th>
            <th className="pb-3 font-medium">Author</th>
            <th className="pb-3 font-medium text-right">Price</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium text-right">TX</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {purchases.map((purchase, idx) => (
            <tr key={`${purchase.karya_id}-${idx}`} className="hover:bg-gray-50 transition-colors">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  {purchase.cover_image_url ? (
                    <img
                      src={purchase.cover_image_url}
                      alt={purchase.judul}
                      className="w-8 h-8 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                      W
                    </div>
                  )}
                  <div className="font-medium text-gray-900 text-sm">{purchase.judul}</div>
                </div>
              </td>
              <td className="py-3 text-sm text-gray-500">{purchase.issuer_name}</td>
              <td className="py-3 text-right">
                <span className="text-sm font-medium text-gray-900">
                  {purchase.jumlah.toFixed(2)} XLM
                </span>
              </td>
              <td className="py-3">
                <span className="text-sm text-gray-500">
                  {new Date(purchase.purchased_at).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </td>
              <td className="py-3 text-right">
                {purchase.explorer_url ? (
                  <a
                    href={purchase.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 font-mono"
                  >
                    {purchase.tx_hash.slice(0, 8)}...
                  </a>
                ) : (
                  <span className="text-xs text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

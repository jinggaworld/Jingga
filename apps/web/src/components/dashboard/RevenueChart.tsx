'use client';

import type { RevenueItem } from '@/hooks/useDashboard';

interface RevenueChartProps {
  revenue: RevenueItem[];
  totalRevenue: number;
  loading: boolean;
}

export default function RevenueChart({ revenue, totalRevenue, loading }: RevenueChartProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (revenue.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">📊</div>
        <p className="text-gray-500">Belum ada revenue</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...revenue.map(r => r.total_revenue));

  return (
    <div className="space-y-4">
      {revenue.map((item) => {
        const barWidth = maxRevenue > 0 ? (item.total_revenue / maxRevenue) * 100 : 0;
        return (
          <div key={item.karya_id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {item.cover_image_url ? (
                  <img
                    src={item.cover_image_url}
                    alt={item.judul}
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                    {item.judul.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-gray-900 truncate">{item.judul}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className="text-gray-600 font-mono">
                  {item.total_revenue.toFixed(2)} XLM
                </span>
                <span className="text-xs text-gray-400 w-8 text-right">
                  {item.percentage_of_total}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-500">Total Revenue</span>
        <span className="font-bold text-gray-900">{totalRevenue.toFixed(2)} XLM</span>
      </div>
    </div>
  );
}

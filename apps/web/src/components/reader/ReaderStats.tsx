'use client';

import type { ReaderStats as ReaderStatsType } from '@/hooks/useReader';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

interface ReaderStatsProps {
  stats: ReaderStatsType;
}

export default function ReaderStatsSection({ stats }: ReaderStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        icon="📚"
        label="Total Dibeli"
        value={stats.totalPurchased}
      />
      <StatCard
        icon="💰"
        label="Total Dibelanjakan"
        value={`${stats.totalSpent.toFixed(2)} XLM`}
      />
      <StatCard
        icon="🏷️"
        label="Kategori Favorit"
        value={stats.favoriteCategory || '—'}
      />
    </div>
  );
}

'use client';

import type { DashboardStats } from '@/hooks/useDashboard';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
}

function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-sm text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

interface DashboardStatsProps {
  stats: DashboardStats;
}

export default function DashboardStatsSection({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon="📚"
        label="Total Karya"
        value={stats.totalKarya}
        sub={`${stats.totalPublished} published`}
      />
      <StatCard
        icon="💰"
        label="Total Penjualan"
        value={stats.totalSales}
      />
      <StatCard
        icon="🪙"
        label="Total Pendapatan"
        value={`${stats.totalRevenue.toFixed(2)} XLM`}
      />
      <StatCard
        icon="👁️"
        label="Total Views"
        value={stats.totalViews.toLocaleString()}
      />
    </div>
  );
}

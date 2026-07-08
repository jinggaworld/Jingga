'use client';

import { useState } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import Link from 'next/link';
import DashboardStatsSection from '@/components/dashboard/DashboardStats';
import KaryaTable from '@/components/dashboard/KaryaTable';
import TransactionTable from '@/components/dashboard/TransactionTable';
import RevenueChart from '@/components/dashboard/RevenueChart';
import {
  useDashboardOverview,
  useDashboardKarya,
  useDashboardTransactions,
  useDashboardRevenue,
} from '@/hooks/useDashboard';

const KARYA_STATUS_FILTERS = ['all', 'published', 'draft', 'archived'] as const;

export default function DashboardPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();
  const router = useRouter();

  // Dashboard overview
  const { data: overview, loading: overviewLoading, refetch: refetchOverview } = useDashboardOverview();

  // Karya list
  const [karyaStatus, setKaryaStatus] = useState<string>('all');
  const { data: karyaData, loading: karyaLoading, refetch: refetchKarya } = useDashboardKarya(karyaStatus);

  // Transaction history
  const { data: txData, loading: txLoading } = useDashboardTransactions();

  // Revenue breakdown
  const { data: revenueData, loading: revenueLoading } = useDashboardRevenue();

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 p-8 rounded-xl max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hubungkan Wallet</h1>
          <p className="text-gray-500 mb-6">Hubungkan wallet Stellar Anda untuk mengakses dashboard penulis</p>
          {isFreighterAvailable ? (
            <button
              onClick={connectFreighter}
              className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium mb-3"
            >
              Connect Freighter Wallet
            </button>
          ) : (
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-block px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium mb-3"
            >
              Install Freighter Extension
            </a>
          )}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-400">atau</span></div>
          </div>
          <Link
            href="/login"
            className="block w-full px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Login dengan Email
          </Link>
          {authError && <p className="text-sm text-red-600 mt-4">{authError}</p>}
        </div>
      </div>
    );
  }

  const stats = overview?.stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Selamat datang kembali, {user?.nama || 'Penulis'} {walletAddress && <span className="font-mono text-xs text-gray-400 ml-2">({truncateAddress(walletAddress, 6)})</span>}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="mb-8">
            <DashboardStatsSection stats={stats} />
          </div>
        )}

        {overviewLoading && !stats && (
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Karya Section */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Karya Saya</h2>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                <span>+</span> Upload Baru
              </Link>
            </div>
            {/* Status tabs */}
            <div className="flex gap-2">
              {KARYA_STATUS_FILTERS.map(status => (
                <button
                  key={status}
                  onClick={() => setKaryaStatus(status)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    karyaStatus === status
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === 'all' && overview?.stats && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({overview.stats.totalKarya})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6">
            <KaryaTable
              karya={karyaData?.karya || []}
              loading={karyaLoading}
              onRefetch={() => {
                refetchKarya();
                refetchOverview();
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Riwayat Transaksi</h2>
                {txData && txData.transactions.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {txData.summary.totalTransactions} total
                  </span>
                )}
              </div>
            </div>
            <div className="p-6">
              <TransactionTable
                transactions={txData?.transactions || overview?.recentTransactions || []}
                loading={txLoading && overviewLoading}
              />
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Revenue Breakdown</h2>
            </div>
            <div className="p-6">
              <RevenueChart
                revenue={revenueData?.revenue || []}
                totalRevenue={revenueData?.totalRevenue || 0}
                loading={revenueLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

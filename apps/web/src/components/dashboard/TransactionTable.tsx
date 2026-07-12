'use client';

import type { Transaction } from '@/hooks/useDashboard';

interface TransactionTableProps {
  transactions: Transaction[];
  loading: boolean;
}

export default function TransactionTable({ transactions, loading }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
            <th className="pb-3 font-medium">Work</th>
            <th className="pb-3 font-medium">Buyer</th>
            <th className="pb-3 font-medium text-right">Amount</th>
            <th className="pb-3 font-medium">Date</th>
            <th className="pb-3 font-medium text-center">Status</th>
            <th className="pb-3 font-medium text-right">TX</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map(tx => (
            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3">
                <div className="font-medium text-gray-900 text-sm">{tx.karya_judul}</div>
              </td>
              <td className="py-3">
                <span className="text-sm text-gray-500 font-mono">
                  {tx.buyer_wallet.slice(0, 6)}...{tx.buyer_wallet.slice(-4)}
                </span>
              </td>
              <td className="py-3 text-right">
                <span className="text-sm font-medium text-gray-900">
                  {tx.jumlah.toFixed(2)} XLM
                </span>
              </td>
              <td className="py-3">
                <span className="text-sm text-gray-500">
                  {new Date(tx.created_at).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </td>
              <td className="py-3 text-center">
                <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                  ✓
                </span>
              </td>
              <td className="py-3 text-right">
                {tx.explorer_url ? (
                  <a
                    href={tx.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 font-mono"
                  >
                    {tx.tx_hash.slice(0, 8)}...
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

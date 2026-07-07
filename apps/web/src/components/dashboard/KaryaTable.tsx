'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { KaryaListItem } from '@/hooks/useDashboard';
import { archiveKarya } from '@/hooks/useDashboard';

interface KaryaTableProps {
  karya: KaryaListItem[];
  loading: boolean;
  onRefetch: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-green-100 text-green-700 border-green-200',
    draft: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    archived: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

export default function KaryaTable({ karya, loading, onRefetch }: KaryaTableProps) {
  const [archiving, setArchiving] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const handleArchive = async (id: string) => {
    try {
      setArchiving(id);
      await archiveKarya(id);
      onRefetch();
    } catch (err: any) {
      alert(err.message || 'Gagal mengarsipkan karya');
    } finally {
      setArchiving(null);
      setShowConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (karya.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada karya</h3>
        <p className="text-gray-500 mb-4">Mulai upload karya pertama Anda sekarang!</p>
        <Link
          href="/upload"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Upload Karya Baru
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
            <th className="pb-3 font-medium">Karya</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium text-right">Sales</th>
            <th className="pb-3 font-medium text-right">Revenue</th>
            <th className="pb-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {karya.map(item => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3">
                <div className="flex items-center gap-3">
                  {item.cover_image_url ? (
                    <img
                      src={item.cover_image_url}
                      alt={item.judul}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-600 font-bold text-sm">
                      {item.judul.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{item.judul}</div>
                    <div className="text-xs text-gray-400">{item.kategori}</div>
                  </div>
                </div>
              </td>
              <td className="py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="py-3 text-right text-gray-600">
                {item.total_sales || 0}
              </td>
              <td className="py-3 text-right text-gray-600">
                {(item.total_revenue || 0).toFixed(2)} XLM
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/karya/${item.id}`}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                    title="View"
                  >
                    👁️
                  </Link>
                  {item.status === 'draft' && (
                    <Link
                      href={`/upload?edit=${item.id}`}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      title="Edit"
                    >
                      ✏️
                    </Link>
                  )}
                  {item.status !== 'archived' && (
                    <div className="relative">
                      {showConfirm === item.id ? (
                        <div className="absolute right-0 top-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
                          <p className="text-xs text-gray-600 mb-2">Arsipkan karya ini?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleArchive(item.id)}
                              disabled={archiving === item.id}
                              className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                              {archiving === item.id ? '...' : 'Ya'}
                            </button>
                            <button
                              onClick={() => setShowConfirm(null)}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowConfirm(item.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                          title="Archive"
                        >
                          📦
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

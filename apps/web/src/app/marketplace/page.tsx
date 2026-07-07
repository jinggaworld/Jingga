'use client';

import React from 'react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { KaryaCard } from '@/components/marketplace/KaryaCard';
import { SearchBar } from '@/components/marketplace/SearchBar';
import { CategoryFilter } from '@/components/marketplace/CategoryFilter';
import { SortSelect } from '@/components/marketplace/SortSelect';
import { Pagination } from '@/components/marketplace/Pagination';
import { EmptyState } from '@/components/marketplace/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

export default function MarketplacePage() {
  const { data, loading, search, kategori, sort, page, updateParams } = useMarketplace();

  return (
    <main className="min-h-screen bg-surface-1">
      <div className="mx-auto max-w-[1584px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Marketplace</h1>
          <p className="text-body-lg text-ink-muted">
            Discover works from independent writers across Southeast Asia.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-canvas border border-hairline rounded-none p-md mb-xl">
          <div className="flex flex-col gap-md">
            <SearchBar
              value={search}
              onChange={(v) => updateParams({ search: v })}
              placeholder="Search works by title or description..."
            />

            <div className="flex items-center justify-between flex-wrap gap-md">
              <CategoryFilter
                value={kategori}
                onChange={(v) => updateParams({ kategori: v })}
              />

              <div className="flex items-center gap-md">
                <SortSelect
                  value={sort}
                  onChange={(v) => updateParams({ sort: v })}
                />
                {data && (
                  <span className="text-body-sm text-ink-muted">
                    {data.pagination.total} works
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-section">
            <Spinner size="lg" />
          </div>
        )}

        {/* Results */}
        {!loading && data && (
          <>
            {data.karya.length === 0 ? (
              <EmptyState
                message="No works found"
                actionLabel="Upload the first work"
                onAction={() => window.location.href = '/upload'}
              />
            ) : (
              <>
                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
                  {data.karya.map((karya) => (
                    <KaryaCard key={karya.id} karya={karya} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  onPageChange={(p) => updateParams({ page: String(p) })}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

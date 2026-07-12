'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { API_BASE } from '@/lib/api';

interface CrossRefMetadata {
  doi: string;
  title: string;
  authors: string[];
  publishedDate: string;
  journal: string;
  abstract: string;
  citationCount: number;
  url: string;
}

interface DOILookupProps {
  onMetadataFilled: (metadata: {
    judul?: string;
    deskripsi?: string;
    authors?: string;
    doi?: string;
  }) => void;
  currentTitle?: string;
  kategori?: string;
}

export function DOILookup({ onMetadataFilled, currentTitle, kategori }: DOILookupProps) {
  const [doi, setDoi] = useState('');
  const [searchTitle, setSearchTitle] = useState(currentTitle || '');
  const [loading, setLoading] = useState<'idle' | 'doi' | 'title'>('idle');
  const [result, setResult] = useState<CrossRefMetadata | null>(null);
  const [error, setError] = useState('');

  // Only show for paper/article category
  if (kategori && kategori !== 'paper') return null;

  const handleLookupDOI = async () => {
    if (!doi.trim()) return;
    setLoading('doi');
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/academic/crossref/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doi: doi.trim() }),
      });

      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();

      if (!data.found || !data.metadata) {
        setError('DOI not found. Please check the DOI and try again.');
        return;
      }

      setResult(data.metadata);
    } catch (err: any) {
      setError(err.message || 'Failed to lookup DOI');
    } finally {
      setLoading('idle');
    }
  };

  const handleSearchTitle = async () => {
    if (!searchTitle.trim()) return;
    setLoading('title');
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/academic/crossref/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchTitle.trim(), limit: 1 }),
      });

      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();

      if (!data.results || data.results.length === 0) {
        setError('No results found. Try a different title.');
        return;
      }

      setResult(data.results[0]);
    } catch (err: any) {
      setError(err.message || 'Failed to search');
    } finally {
      setLoading('idle');
    }
  };

  const handleUseMetadata = () => {
    if (!result) return;
    onMetadataFilled({
      judul: result.title,
      deskripsi: result.abstract || result.title,
      authors: result.authors.join(', '),
      doi: result.doi,
    });
  };

  return (
    <div className="bg-surface-1 border border-hairline p-md">
      <p className="text-caption text-ink-muted uppercase tracking-wider mb-sm">
        Academic Paper Metadata (optional)
      </p>

      {/* DOI Lookup */}
      <div className="flex gap-xs mb-sm">
        <input
          type="text"
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          placeholder="DOI: 10.1000/example"
          className="flex-1 px-sm py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary"
          onKeyDown={(e) => e.key === 'Enter' && handleLookupDOI()}
        />
        <button
          onClick={handleLookupDOI}
          disabled={loading === 'doi' || !doi.trim()}
          className="px-md py-xs bg-primary text-on-primary text-button hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {loading === 'doi' ? <Spinner size="sm" /> : 'Lookup'}
        </button>
      </div>

      <div className="flex items-center gap-sm text-caption text-ink-subtle mb-sm">
        <span className="flex-1 border-t border-hairline" />
        <span>or</span>
        <span className="flex-1 border-t border-hairline" />
      </div>

      {/* Title Search */}
      <div className="flex gap-xs mb-sm">
        <input
          type="text"
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          placeholder="Search by title..."
          className="flex-1 px-sm py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary"
          onKeyDown={(e) => e.key === 'Enter' && handleSearchTitle()}
        />
        <button
          onClick={handleSearchTitle}
          disabled={loading === 'title' || !searchTitle.trim()}
          className="px-md py-xs bg-surface-2 text-ink text-button hover:bg-hairline transition-colors disabled:opacity-50"
        >
          {loading === 'title' ? <Spinner size="sm" /> : 'Search'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-body-sm text-semantic-error mb-sm">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className="bg-canvas border border-hairline p-sm">
          <p className="text-body-sm font-medium text-ink mb-xs line-clamp-2">{result.title}</p>
          <p className="text-caption text-ink-muted mb-xs">
            {result.authors.slice(0, 3).join(', ')}{result.authors.length > 3 ? ' et al.' : ''}
            {' | '}{result.journal}{result.publishedDate ? ` (${result.publishedDate})` : ''}
          </p>
          <p className="text-caption text-ink-subtle mb-sm">
            Citations: {result.citationCount} | DOI: {result.doi}
          </p>
          {result.abstract && (
            <p className="text-caption text-ink-subtle mb-sm line-clamp-3">{result.abstract}</p>
          )}
          <button
            onClick={handleUseMetadata}
            className="px-md py-xs bg-primary text-on-primary text-button hover:bg-primary-hover transition-colors"
          >
            Use This Metadata
          </button>
        </div>
      )}
    </div>
  );
}

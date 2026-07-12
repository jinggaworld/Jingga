'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { API_BASE } from '@/lib/api';

interface PlagiarismMatch {
  title: string;
  authors: string[];
  similarityScore: number;
  previewLink?: string;
  source: 'google_books' | 'crossref';
}

interface PlagiarismCheckResult {
  query: string;
  totalMatches: number;
  matches: PlagiarismMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  recommendation: string;
  checkedAt: string;
}

interface PlagiarismCheckProps {
  title: string;
  description?: string;
  onCheckComplete?: (result: PlagiarismCheckResult) => void;
}

export function PlagiarismCheck({ title, description, onCheckComplete }: PlagiarismCheckProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlagiarismCheckResult | null>(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('jingga_auth_token');
      const res = await fetch(`${API_BASE}/api/v1/academic/plagiarism-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description || '',
        }),
      });

      if (!res.ok) throw new Error('Check failed');

      const data = await res.json();
      setResult(data.result);
      onCheckComplete?.(data.result);
    } catch (err: any) {
      setError(err.message || 'Failed to check plagiarism');
    } finally {
      setLoading(false);
    }
  };

  const riskBadgeVariant: Record<string, 'success' | 'warning' | 'error'> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
  };

  const riskLabels: Record<string, string> = {
    low: 'Low Risk: Work appears original',
    medium: 'Medium Risk: Consider adding citations',
    high: 'High Risk: Significant similarity detected',
  };

  return (
    <div className="bg-surface-1 border border-hairline p-md">
      <p className="text-caption text-ink-muted uppercase tracking-wider mb-sm">
        Originality Check
      </p>
      <p className="text-body-sm text-ink-muted mb-md">
        Check against Google Books and CrossRef for potential duplicates
      </p>

      <button
        onClick={handleCheck}
        disabled={loading || !title.trim()}
        className="px-lg py-sm bg-primary text-on-primary text-button hover:bg-primary-hover transition-colors disabled:opacity-50 mb-md"
      >
        {loading ? (
          <span className="flex items-center gap-sm">
            <Spinner size="sm" /> Checking...
          </span>
        ) : (
          'Run Check'
        )}
      </button>

      {error && (
        <p className="text-body-sm text-semantic-error mb-sm">{error}</p>
      )}

      {result && (
        <div className="bg-canvas border border-hairline p-sm">
          <div className="flex items-center gap-sm mb-sm">
            <Badge variant={riskBadgeVariant[result.riskLevel] || 'info'}>
              {result.riskLevel === 'low' ? '✓' : result.riskLevel === 'medium' ? '⚠' : '✗'} {result.riskLevel.toUpperCase()}
            </Badge>
            <span className="text-body-sm text-ink">{riskLabels[result.riskLevel]}</span>
          </div>

          <p className="text-caption text-ink-muted mb-sm">{result.recommendation}</p>

          {result.matches.length > 0 && (
            <div className="space-y-xs">
              <p className="text-caption text-ink-muted">Found {result.totalMatches} match(es):</p>
              {result.matches.map((match, i) => (
                <div key={i} className="flex items-center justify-between px-sm py-xs bg-surface-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm text-ink truncate">{match.title}</p>
                    <p className="text-caption text-ink-subtle">
                      {match.authors.slice(0, 2).join(', ')} | {match.source}
                    </p>
                  </div>
                  <div className="ml-sm flex items-center gap-sm">
                    <span
                      className={`text-body-sm font-mono ${
                        match.similarityScore > 80
                          ? 'text-semantic-error'
                          : match.similarityScore > 50
                          ? 'text-semantic-warning'
                          : 'text-semantic-success'
                      }`}
                    >
                      {match.similarityScore}%
                    </span>
                    {match.previewLink && (
                      <a
                        href={match.previewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-caption hover:underline"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-caption text-ink-subtle mt-sm">
            Checked at: {new Date(result.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

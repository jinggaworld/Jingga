'use client';

import React from 'react';

interface KaryaDetailsProps {
  file_type: string | null;
  file_size_bytes: number | null;
  stellar_asset_code: string;
  published_at: string | null;
  created_at: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileType(mime: string | null): string {
  if (!mime) return 'Unknown';
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'text/plain') return 'TXT';
  if (mime.includes('wordprocessingml')) return 'DOCX';
  return mime;
}

export function KaryaDetails({ file_type, file_size_bytes, stellar_asset_code, published_at, created_at }: KaryaDetailsProps) {
  const rows = [
    { label: 'File Type', value: formatFileType(file_type) },
    { label: 'File Size', value: formatFileSize(file_size_bytes) },
    { label: 'Published', value: published_at ? new Date(published_at).toLocaleDateString() : 'Not yet' },
    { label: 'Asset Code', value: stellar_asset_code },
  ];

  return (
    <div className="bg-surface-1 border border-hairline p-lg rounded-none">
      <h3 className="text-card-title text-ink mb-md">Details</h3>
      <div className="space-y-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-body-sm">
            <span className="text-ink-muted">{row.label}</span>
            <span className="text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

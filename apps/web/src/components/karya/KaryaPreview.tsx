'use client';

import React, { useState } from 'react';

interface KaryaPreviewProps {
  fileUrl: string | null;
  fileType: string | null;
  judul: string;
}

function formatFileType(mime: string | null): string {
  if (!mime) return 'unknown';
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'text/plain') return 'TXT';
  if (mime.includes('wordprocessingml')) return 'DOCX';
  if (mime.startsWith('image/')) return 'Image';
  return mime;
}

export function KaryaPreview({ fileUrl, fileType, judul }: KaryaPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const isPdf = fileType === 'application/pdf';
  const isText = fileType === 'text/plain' || fileType?.includes('text');
  const isImage = fileType?.startsWith('image/');
  const canPreview = isPdf || isText || isImage;

  const handleTogglePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    if (!fileUrl) return;

    setShowPreview(true);

    // For text files, fetch and display content
    if (isText) {
      setLoadingPreview(true);
      try {
        const res = await fetch(fileUrl);
        if (res.ok) {
          const text = await res.text();
          // Limit preview to first 5000 chars
          setTextContent(text.slice(0, 5000) + (text.length > 5000 ? '\n\n... [preview truncated]' : ''));
        }
      } catch {
        setTextContent('Failed to load preview');
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  if (!fileUrl) {
    return null;
  }

  return (
    <div className="border border-hairline">
      <button
        onClick={handleTogglePreview}
        className="w-full flex items-center justify-between px-lg py-md bg-surface-1 hover:bg-surface-2 transition-colors text-left"
      >
        <div className="flex items-center gap-md">
          <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <div>
            <span className="text-body-sm font-medium text-ink">Preview ({formatFileType(fileType)})</span>
            <p className="text-caption text-ink-muted">
              {canPreview ? 'Preview this work before purchasing' : 'Open file in new tab'}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-ink-muted transition-transform ${showPreview ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showPreview && (
        <div className="border-t border-hairline">
          {loadingPreview ? (
            <div className="flex items-center justify-center p-xl">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isPdf ? (
            <iframe
              src={fileUrl}
              className="w-full h-[600px] bg-surface-1"
              title={`Preview: ${judul}`}
            />
          ) : isText && textContent ? (
            <pre className="p-lg text-body-sm text-ink whitespace-pre-wrap font-sans max-h-[600px] overflow-y-auto bg-surface-1">
              {textContent}
            </pre>
          ) : isImage ? (
            <div className="p-lg flex justify-center bg-surface-1">
              <img
                src={fileUrl}
                alt={`Preview: ${judul}`}
                className="max-w-full max-h-[600px] object-contain"
              />
            </div>
          ) : (
            <div className="p-lg text-center">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-sm"
              >
                Open file in new tab
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

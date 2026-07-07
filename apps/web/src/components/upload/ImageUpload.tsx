'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ImageUploadProps {
  onUpload: (file: File) => Promise<string>;
  label?: string;
}

export function ImageUpload({ onUpload, label = 'Cover Image' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-sm">
      <label className="text-body-sm text-ink-muted">{label}</label>

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={[
          'relative cursor-pointer border border-hairline rounded-none overflow-hidden',
          preview ? 'aspect-[3/4] max-w-[200px]' : 'h-32 bg-surface-1 flex items-center justify-center',
          'hover:border-ink-subtle transition-colors',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        {preview ? (
          <>
            <img src={preview} alt="Cover preview" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-subtle mx-auto mb-xs">
                  <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                  <path d="M3 16l5-5 4 4 3-3 6 6" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <p className="text-caption text-ink-subtle">Click to upload</p>
              </>
            )}
          </div>
        )}
      </div>

      {preview && (
        <Button variant="ghost" size="sm" onClick={() => { setPreview(null); inputRef.current?.click(); }}>
          Change
        </Button>
      )}

      {error && <p className="text-caption text-semantic-error">{error}</p>}
      <p className="text-caption text-ink-subtle">JPEG, PNG, or WebP — Max 5MB</p>
    </div>
  );
}

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface FileUploadZoneProps {
  accept?: string;
  maxSizeMB?: number;
  onUpload: (file: File) => Promise<void>;
  label?: string;
  description?: string;
}

export function FileUploadZone({
  accept = '.pdf,.docx,.txt',
  maxSizeMB = 50,
  onUpload,
  label = 'Upload File',
  description = 'Drag & drop your file here, or click to browse',
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ name: string; hash: string } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files?.length) {
        await processFile(files[0]);
      }
    },
    []
  );

  const processFile = async (file: File) => {
    setError('');
    setSuccess(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size exceeds ${maxSizeMB}MB limit.`);
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus('Calculating hash...');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 20, 80));
      }, 300);

      setStatus('Uploading to IPFS...');
      await onUpload(file);

      clearInterval(progressInterval);
      setProgress(100);
      setStatus('Upload complete!');
      setSuccess({ name: file.name, hash: '' });
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={[
        'relative cursor-pointer border-2 border-dashed rounded-none p-xl text-center transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-hairline bg-surface-1 hover:border-ink-subtle',
        uploading && 'pointer-events-none opacity-70',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        className="hidden"
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-md">
          <Spinner size="lg" />
          <p className="text-body text-ink-muted">{status}</p>
          <div className="w-full max-w-xs bg-surface-2 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : success ? (
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 rounded-full bg-semantic-success/10 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-semantic-success">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-body text-ink">{success.name}</p>
          <p className="text-caption text-ink-subtle">File uploaded successfully</p>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSuccess(null); }}>
            Upload Another
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-md">
          <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ink-subtle">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-body text-ink">{label}</p>
          <p className="text-body-sm text-ink-muted">{description}</p>
          <p className="text-caption text-ink-subtle">
            Supports PDF, DOCX, TXT — Max {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && (
        <p className="text-body-sm text-semantic-error mt-md">{error}</p>
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { Layout } from '@/components/layout/Layout';
import { DOILookup } from '@/components/academic/DOILookup';
import { PlagiarismCheck } from '@/components/academic/PlagiarismCheck';
import { Badge } from '@/components/ui/Badge';
import { apiRequest } from '@/lib/api';

interface UploadForm {
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: string;
}

export default function UploadPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<UploadForm>({
    judul: '',
    deskripsi: '',
    kategori: 'fiksi',
    harga: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Collaborator state */
  const [collaborators, setCollaborators] = useState<Array<{
    wallet_address: string;
    nama: string;
    role: string;
    persentase: number;
  }>>([]);

  const collaboratorRoles = ['penulis', 'editor', 'ilustrator', 'kolaborator'];
  const collaboratorRoleLabels: Record<string, string> = {
    penulis: 'Writer',
    editor: 'Editor',
    ilustrator: 'Illustrator',
    kolaborator: 'Collaborator',
  };

  const addCollaborator = () => {
    setCollaborators([...collaborators, {
      wallet_address: '',
      nama: '',
      role: 'kolaborator',
      persentase: 0,
    }]);
  };

  const updateCollaborator = (index: number, field: string, value: string | number) => {
    const updated = [...collaborators];
    (updated[index] as any)[field] = value;
    setCollaborators(updated);
  };

  const removeCollaborator = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  const totalPercentage = collaborators.reduce((sum, c) => sum + (c.persentase || 0), 0);
  const isPercentageValid = totalPercentage <= 100;

  /* Academic integration state */
  const [paperAuthors, setPaperAuthors] = useState('');
  const [paperDoi, setPaperDoi] = useState('');
  const [plagiarismResult, setPlagiarismResult] = useState<any>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'cover') => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (type === 'file') setFile(selected);
      else setCover(selected);
    }
    e.target.value = '';
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Title is required' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('judul', form.judul);
      formData.append('deskripsi', form.deskripsi);
      formData.append('kategori', form.kategori);
      formData.append('harga', form.harga);
      formData.append('file', file);
      if (cover) formData.append('cover', cover);
      if (collaborators.length > 0) {
        formData.append('collaborators', JSON.stringify(collaborators));
      }

      const token = localStorage.getItem('jingga_auth_token');
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/v1/karya`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }

      const { karya } = await res.json();

      /* Step 2: Publish karya */
      let publishResult = null;
      try {
        const publishRes = await fetch(`${API_BASE}/api/v1/karya/${karya.id}/publish`, {
          method: 'POST',
          headers: token ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          } : { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            confirmOriginal: true,
            confirmTerms: true,
          }),
        });

        if (publishRes.ok) {
          publishResult = await publishRes.json();
        }
      } catch (publishErr) {
        console.warn('[Upload] Publish error (non-fatal):', publishErr);
      }

      const successMsg = publishResult
        ? 'Work uploaded and published successfully!'
        : 'Work uploaded as draft. Publish from Dashboard.';

      setMessage({ type: 'success', text: successMsg });
      setForm({ judul: '', deskripsi: '', kategori: 'fiksi', harga: '' });
      setFile(null);
      setCover(null);
      setCollaborators([]);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }, [form, file, cover]);

  /* Auth gate */
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-pulse text-ink-subtle">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-lg">
          <div className="bg-canvas border border-hairline p-xl max-w-md text-center">
            <h1 className="text-headline text-ink mb-md">Connect Wallet</h1>
            <p className="text-body text-ink-muted mb-lg">
              Connect your Stellar wallet to upload works
            </p>
            {isFreighterAvailable ? (
              <button
                onClick={connectFreighter}
                className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors mb-md"
              >
                Connect Freighter Wallet
              </button>
            ) : (
              <a
                href="https://www.freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-block bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline mb-md"
              >
                Install Freighter Extension
              </a>
            )}
            {authError && <p className="text-body-sm text-semantic-error mt-md">{authError}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[800px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Upload Work</h1>
          <p className="text-body text-ink-muted mb-md">
            Upload your work directly to Jingga
          </p>
          <div className="bg-surface-1 border border-hairline p-md">
            <p className="text-body-sm text-ink-muted">
              <strong>Prefer to write directly?</strong>{' '}
              <a href="/editor" className="text-primary hover:underline">Use our Editor</a> to write, edit, and publish: all in one page.
            </p>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-lg p-md border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-canvas border border-hairline p-lg">
          <div className="space-y-lg">
            {/* File Upload */}
            <div>
              <label className="block text-body-sm text-ink-muted mb-xs">Work File *</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-hairline p-lg text-center cursor-pointer hover:border-primary transition-colors"
              >
                {file ? (
                  <div>
                    <p className="text-body text-ink">{file.name}</p>
                    <p className="text-caption text-ink-subtle">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-body text-ink-muted">Click to select a file</p>
                    <p className="text-caption text-ink-subtle">PDF, DOCX, TXT (max 50MB)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={(e) => handleFileSelect(e, 'file')}
                className="hidden"
              />
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-body-sm text-ink-muted mb-xs">Cover Image (optional)</label>
              <div
                onClick={() => coverInputRef.current?.click()}
                className="border-2 border-dashed border-hairline p-md text-center cursor-pointer hover:border-primary transition-colors"
              >
                {cover ? (
                  <div className="flex items-center gap-sm justify-center">
                    <img
                      src={URL.createObjectURL(cover)}
                      alt="Cover preview"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <p className="text-body-sm text-ink">{cover.name}</p>
                  </div>
                ) : (
                  <p className="text-body-sm text-ink-muted">Click to select a cover image</p>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'cover')}
                className="hidden"
              />
            </div>

            {/* DOI Lookup for Paper category */}
            {form.kategori === 'paper' && (
              <div className="mb-lg">
                <DOILookup
                  onMetadataFilled={(meta) => {
                    if (meta.judul) setForm((f) => ({ ...f, judul: meta.judul || '' }));
                    if (meta.deskripsi) setForm((f) => ({ ...f, deskripsi: meta.deskripsi || '' }));
                    if (meta.authors) setPaperAuthors(meta.authors);
                    if (meta.doi) setPaperDoi(meta.doi);
                  }}
                  currentTitle={form.judul}
                  kategori={form.kategori}
                />
              </div>
            )}

            {/* Paper authors (shown for paper category) */}
            {form.kategori === 'paper' && (
              <div className="md:col-span-2">
                <label className="block text-body-sm text-ink-muted mb-xs">Authors (comma-separated)</label>
                <input
                  type="text"
                  value={paperAuthors}
                  onChange={(e) => setPaperAuthors(e.target.value)}
                  placeholder="e.g. John Doe, Jane Smith"
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="md:col-span-2">
                <label className="block text-body-sm text-ink-muted mb-xs">Title *</label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm({ ...form, judul: e.target.value })}
                  placeholder="Enter your work title"
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-body-sm text-ink-muted mb-xs">Description</label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="Brief description of your work"
                  rows={3}
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-body-sm text-ink-muted mb-xs">Category</label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                >
                  <option value="fiksi">Fiksi</option>
                  <option value="non-fiksi">Non-Fiksi</option>
                  <option value="paper">Paper / Artikel</option>
                  <option value="puisi">Puisi</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm text-ink-muted mb-xs">Price (XLM) *</label>
                <input
                  type="number"
                  value={form.harga}
                  onChange={(e) => setForm({ ...form, harga: e.target.value })}
                  placeholder="10"
                  min="0"
                  step="0.1"
                  className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Collaborators */}
            <div className="border-t border-hairline pt-lg">
              <div className="flex items-center justify-between mb-md">
                <div>
                  <h3 className="text-card-title text-ink mb-xs">Collaborators</h3>
                  <p className="text-body-sm text-ink-muted">
                    Add co-authors, editors, or illustrators to share revenue automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addCollaborator}
                  className="bg-primary text-on-primary text-button py-xs px-md hover:bg-primary-hover transition-colors"
                >
                  + Add
                </button>
              </div>

              {collaborators.length > 0 && (
                <div className="space-y-md mb-md">
                  {collaborators.map((collab, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-sm items-end border border-hairline p-md"
                    >
                      <div>
                        <label className="block text-caption text-ink-muted mb-xs">Wallet *</label>
                        <input
                          type="text"
                          value={collab.wallet_address}
                          onChange={(e) => updateCollaborator(i, 'wallet_address', e.target.value)}
                          placeholder="G..."
                          className="w-full px-xs py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-caption text-ink-muted mb-xs">Name</label>
                        <input
                          type="text"
                          value={collab.nama}
                          onChange={(e) => updateCollaborator(i, 'nama', e.target.value)}
                          placeholder="e.g. John"
                          className="w-full px-xs py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-caption text-ink-muted mb-xs">Role</label>
                        <select
                          value={collab.role}
                          onChange={(e) => updateCollaborator(i, 'role', e.target.value)}
                          className="w-full px-xs py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary"
                        >
                          {collaboratorRoles.map((r) => (
                            <option key={r} value={r}>{collaboratorRoleLabels[r]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 lg:col-span-1 grid grid-cols-[1fr_auto] gap-sm items-end">
                        <div>
                          <label className="block text-caption text-ink-muted mb-xs">%</label>
                          <input
                            type="number"
                            value={collab.persentase || ''}
                            onChange={(e) => updateCollaborator(i, 'persentase', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                            placeholder="0"
                            min="0"
                            max="100"
                            className="w-full px-xs py-xs border border-hairline bg-canvas text-ink text-body-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCollaborator(i)}
                          className="text-semantic-error hover:text-semantic-error/80 transition-colors pb-xs"
                          title="Remove collaborator"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Percentage indicator */}
              {collaborators.length > 0 && (
                <div className="flex items-center gap-sm text-body-sm">
                  <span className="text-ink-muted">Total: {totalPercentage}%</span>
                  {!isPercentageValid && (
                    <span className="text-semantic-error font-medium">
                      Exceeds 100%!
                    </span>
                  )}
                  {isPercentageValid && totalPercentage > 0 && (
                    <span className="text-semantic-success">
                      Creator keeps {100 - totalPercentage}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Plagiarism Check (optional, for paper category) */}
            {form.kategori === 'paper' && form.judul && (
              <div className="md:col-span-2">
                <PlagiarismCheck
                  title={form.judul}
                  description={form.deskripsi}
                  onCheckComplete={setPlagiarismResult}
                />
              </div>
            )}

            {/* Risk Level Warning */}
            {plagiarismResult?.riskLevel === 'high' && (
              <div className="md:col-span-2 border border-semantic-error p-md bg-semantic-error/5">
                <div className="flex items-center gap-sm mb-xs">
                  <svg className="w-5 h-5 text-semantic-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-body-sm font-medium text-semantic-error">
                    High risk of duplication detected!
                  </span>
                </div>
                <p className="text-body-sm text-ink-muted">{plagiarismResult.recommendation}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-md">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload & Publish'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

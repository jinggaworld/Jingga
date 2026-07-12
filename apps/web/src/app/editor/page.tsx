'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useAuth, truncateAddress } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import JinggaEditor from '@/components/editor/JinggaEditor';
import { apiRequest } from '@/lib/api';

interface DraftData {
  id?: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  harga: string;
  content: string;
}

export default function EditorPage() {
  const { user, walletAddress, isConnected, isConnecting: authLoading, isFreighterAvailable, connectFreighter, error: authError } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<DraftData>({
    judul: '',
    deskripsi: '',
    kategori: 'fiksi',
    harga: '',
    content: '',
  });
  const searchParams = useSearchParams();

  // Collaboration room: use ?room= query param or generate a unique session ID
  const roomId = React.useMemo(() => {
    const fromUrl = searchParams.get('room');
    if (fromUrl) return fromUrl;
    // Generate a unique session ID (persists for this browser tab)
    return 'session-' + (crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10));
  }, [searchParams]);

  // Collaboration (real-time co-editing via Yjs)
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [collabStatus, setCollabStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Initialize Y.Doc + WebSocket provider once
  useEffect(() => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || `ws://localhost:3001/collab`;
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(WS_URL, roomId, ydoc, {
      connect: true,
    });

    provider.on('status', (event: { status: string }) => {
      setCollabStatus(event.status as 'connecting' | 'connected' | 'disconnected');
    });

    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, [walletAddress, roomId]);

  // User color derived from wallet address for consistent cursor color
  const userColor = React.useMemo(() => {
    if (!walletAddress) return '#0f62fe';
    const colors = ['#0f62fe', '#24a148', '#da1e28', '#f1c21b', '#8a3ffc', '#009d9a', '#ee538b', '#1192e8'];
    const hash = walletAddress.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, [walletAddress]);

  const collaborationConfig = ydocRef.current && providerRef.current && walletAddress
    ? {
        ydoc: ydocRef.current,
        provider: providerRef.current,
        user: {
          name: truncateAddress(walletAddress, 6),
          color: userColor,
        },
      }
    : undefined;

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEditorChange = useCallback((_html: string, _json: unknown) => {
    // Content is managed by the editor internally
    // We capture it on save/publish
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Title is required' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // Get content from editor
      const editorEl = document.querySelector('.ProseMirror');
      const content = editorEl?.innerHTML || form.content;

      const payload = {
        judul: form.judul,
        deskripsi: form.deskripsi,
        kategori: form.kategori,
        content,
        status: 'draft',
      };

      if (savedDraftId) {
        await apiRequest(`/api/v1/karya/${savedDraftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        const result = await apiRequest<{ id: string }>('/api/v1/karya', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSavedDraftId(result.id);
      }

      setMessage({ type: 'success', text: 'Draft saved successfully!' });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save draft' });
    } finally {
      setSaving(false);
    }
  }, [form, savedDraftId]);

  const handlePublish = useCallback(async () => {
    if (!form.judul.trim()) {
      setMessage({ type: 'error', text: 'Title is required' });
      return;
    }
    if (!form.harga || parseFloat(form.harga) <= 0) {
      setMessage({ type: 'error', text: 'Price must be greater than 0 XLM' });
      return;
    }

    setPublishing(true);
    setMessage(null);

    try {
      const editorEl = document.querySelector('.ProseMirror');
      const content = editorEl?.innerHTML || form.content;

      const payload = {
        judul: form.judul,
        deskripsi: form.deskripsi,
        kategori: form.kategori,
        harga: parseFloat(form.harga),
        content,
        status: 'published',
      };

      if (savedDraftId) {
        // Update existing draft then publish
        await apiRequest(`/api/v1/karya/${savedDraftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        await apiRequest(`/api/v1/karya/${savedDraftId}/publish`, {
          method: 'POST',
        });
      } else {
        // Create and publish in one go
        await apiRequest('/api/v1/karya', {
          method: 'POST',
          body: JSON.stringify({ ...payload, status: 'published' }),
        });
      }

      setMessage({ type: 'success', text: 'Work published to Marketplace successfully!' });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to publish work' });
    } finally {
      setPublishing(false);
    }
  }, [form, savedDraftId, router]);

  // Auth gate
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
              Connect your Stellar wallet to start writing and publishing
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
            <div className="relative my-md">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-hairline"></div></div>
              <div className="relative flex justify-center text-sm"><span className="bg-canvas px-sm text-ink-subtle">or</span></div>
            </div>
            <a
              href="/login"
              className="block w-full border border-hairline text-ink text-button py-sm px-md rounded-none hover:bg-surface-1 transition-colors"
            >
              Login with Email
            </a>
            {authError && <p className="text-body-sm text-semantic-error mt-md">{authError}</p>}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-[1200px] py-xl px-lg">
        {/* Header */}
        <div className="mb-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-display-md text-ink mb-sm">Editor</h1>
              <p className="text-body text-ink-muted">
                Write, edit, and publish your work directly to the Marketplace
                {walletAddress && (
                  <span className="font-mono text-caption text-ink-subtle ml-xs">
                    ({truncateAddress(walletAddress, 6)})
                  </span>
                )}
              </p>
              {/* Room ID — click to copy shareable link */}
              <p className="text-body-sm text-ink-subtle mt-xs flex items-center gap-xs">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Room: <code className="font-mono text-xs bg-surface-1 px-xs py-xxs border border-hairline">{roomId}</code>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/editor?room=${roomId}`;
                    navigator.clipboard.writeText(url);
                    setMessage({ type: 'success', text: 'Room link copied!' });
                  }}
                  className="text-primary hover:underline text-caption"
                  title="Copy room link to clipboard"
                >
                  Copy link
                </button>
              </p>
            </div>
            {/* Collaboration indicator */}
            <div className="flex items-center gap-xs text-body-sm">
              <span className={`w-2 h-2 rounded-full ${
                collabStatus === 'connected' ? 'bg-semantic-success' :
                collabStatus === 'connecting' ? 'bg-semantic-warning' :
                'bg-semantic-error'
              }`} />
              <span className="text-ink-muted">
                {collabStatus === 'connected' ? 'Live' :
                 collabStatus === 'connecting' ? 'Connecting...' :
                 'Offline'}
              </span>
            </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-lg">
          {/* Editor */}
          <div>
            <JinggaEditor
              initialContent={form.content}
              onChange={handleEditorChange}
              placeholder="Start writing your work here... Supports rich text, images, headings, and more."
              collaboration={collaborationConfig}
            />
          </div>

          {/* Sidebar - Metadata */}
          <div className="space-y-lg">
            {/* Karya Details */}
            <div className="bg-canvas border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-md">Work Details</h3>

              <div className="space-y-md">
                <div>
                  <label className="block text-body-sm text-ink-muted mb-xs">Title *</label>
                  <input
                    type="text"
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="Enter your work title"
                    className="w-full px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
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
                  />
                  <p className="text-caption text-ink-subtle mt-xs">Reader access price</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-canvas border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-md">Actions</h3>

              <div className="space-y-sm">
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || publishing}
                  className="w-full bg-surface-1 text-ink text-button py-sm px-md rounded-none hover:bg-surface-2 transition-colors border border-hairline disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  onClick={handlePublish}
                  disabled={saving || publishing}
                  className="w-full bg-primary text-on-primary text-button py-sm px-md rounded-none hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {publishing ? 'Publishing...' : 'Publish to Marketplace'}
                </button>
              </div>

              <div className="mt-md pt-md border-t border-hairline">
                <p className="text-caption text-ink-subtle">
                  Publishing will make your work available on the Marketplace for readers to purchase.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-surface-1 border border-hairline p-lg">
              <h3 className="text-card-title text-ink mb-sm">Tips</h3>
              <ul className="space-y-xs text-body-sm text-ink-muted">
                <li>Use headings for clear structure</li>
                <li>Upload images for illustrations</li>
                <li>Save draft before publishing</li>
                <li>Price in XLM (Stellar)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

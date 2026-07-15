'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================
// Types
// ============================================================

interface CachedRoom {
  id: string;
  name: string;
  lastAccessed: number;
}

const STORAGE_KEY = 'jingga_recent_rooms';
const MAX_CACHED_ROOMS = 10;

// ============================================================
// Helpers
// ============================================================

function getCachedRooms(): CachedRoom[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addCachedRoom(roomId: string, roomName?: string) {
  const rooms = getCachedRooms().filter((r) => r.id !== roomId);
  rooms.unshift({
    id: roomId,
    name: roomName || roomId,
    lastAccessed: Date.now(),
  });
  if (rooms.length > MAX_CACHED_ROOMS) rooms.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function generateSessionId(): string {
  return 'session-' + (crypto.randomUUID?.() || Math.random().toString(36).slice(2, 10));
}

/**
 * Extract a clean room ID from various input formats:
 * - Plain ID: "session-abc123"
 * - Full URL: "http://localhost:3000/editor?room=session-abc123"
 * - Path only: "/editor?room=session-abc123"
 * - Just query: "?room=session-abc123"
 * Returns null if no room ID can be extracted.
 */
function extractRoomId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    // If it looks like a full URL (with origin), parse it
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const room = url.searchParams.get('room');
      if (room) return room;
    }

    // If someone types just "room=xxx" without ? prefix
    if (trimmed.startsWith('room=')) {
      return trimmed.slice(5);
    }

    // If it looks like a path + query (starts with / or ?), extract from query
    if (trimmed.startsWith('/') || trimmed.startsWith('?')) {
      // Normalize: prepend a fake origin to make URL parsing work
      const fakeUrl = new URL(`http://x${trimmed.startsWith('/') ? '' : '/'}${trimmed}`);
      const room = fakeUrl.searchParams.get('room');
      if (room) return room;
    }
  } catch {
    // URL parsing failed — try regex fallback
    const match = trimmed.match(/[?&]room=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  // Plain session ID — return as-is
  return trimmed;
}

// ============================================================
// Component
// ============================================================

export default function JoinPage() {
  const router = useRouter();
  const { walletAddress } = useAuth();

  const [sessionId, setSessionId] = useState('');
  const [recentRooms, setRecentRooms] = useState<CachedRoom[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load recent rooms from localStorage
  useEffect(() => {
    setRecentRooms(getCachedRooms());
  }, []);

  const handleCreateRoom = () => {
    const newId = generateSessionId();
    addCachedRoom(newId, `Room ${newId.slice(0, 8)}`);
    router.push(`/editor?room=${newId}`);
  };

  const handleJoinRoom = () => {
    const raw = sessionId.trim();
    if (!raw) {
      setError('Please enter a session ID or paste a room link');
      return;
    }

    // Extract clean room ID from any input format
    const extracted = extractRoomId(raw);
    if (!extracted) {
      setError('Could not extract a valid session ID from that input');
      return;
    }

    setError(null);
    setSessionId(''); // Clear input after joining
    addCachedRoom(extracted, extracted.length > 20 ? extracted.slice(0, 20) + '...' : extracted);
    router.push(`/editor?room=${encodeURIComponent(extracted)}`);
  };

  const handleJoinRecent = (room: CachedRoom) => {
    addCachedRoom(room.id, room.name);
    router.push(`/editor?room=${encodeURIComponent(room.id)}`);
  };

  const handleClearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentRooms([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-[640px] py-xxl px-lg">
        {/* Header */}
        <div className="text-center mb-xl">
          <h1 className="text-display-md text-ink mb-sm">Join Collaboration Room</h1>
          <p className="text-body text-ink-muted">
            Create a new room or join an existing one to collaborate in real-time.
          </p>
          {walletAddress && (
            <p className="text-body-sm text-ink-subtle mt-xs">
              Connected as <span className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </p>
          )}
        </div>

        {/* Join / Create */}
        <div className="bg-canvas border border-hairline p-xl mb-xl">
          {/* Session ID Input */}
          <div className="mb-lg">
            <label className="block text-body-sm text-ink-muted mb-xs font-medium">
              Session ID
            </label>
            <div className="flex gap-sm">
              <input
                type="text"
                value={sessionId}
                onChange={(e) => {
                  setSessionId(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Paste a room link or session ID to join..."
                className="flex-1 px-sm py-xs border border-hairline bg-canvas text-ink text-body focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleJoinRoom}
                disabled={!sessionId.trim()}
                className="px-lg py-xs bg-primary text-on-primary text-button hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Join Room
              </button>
            </div>
            {error && (
              <p className="text-body-sm text-semantic-error mt-xs">{error}</p>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-lg">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-canvas px-sm text-body-sm text-ink-subtle">or</span>
            </div>
          </div>

          {/* Create New Room */}
          <button
            onClick={handleCreateRoom}
            className="w-full py-md border-2 border-dashed border-hairline-strong text-ink text-body font-medium hover:bg-surface-1 hover:border-primary transition-colors"
          >
            + Create New Room
          </button>

          <p className="text-caption text-ink-subtle text-center mt-md">
            A new session ID will be generated. Share it with collaborators so they can join.
          </p>
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div className="bg-canvas border border-hairline p-xl">
            <div className="flex items-center justify-between mb-md">
              <h2 className="text-card-title text-ink">Recent Rooms</h2>
              <button
                onClick={handleClearHistory}
                className="text-body-sm text-semantic-error hover:underline"
              >
                Clear history
              </button>
            </div>

            <div className="space-y-sm">
              {recentRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleJoinRecent(room)}
                  className="w-full flex items-center gap-md p-md border border-hairline hover:bg-surface-1 hover:border-primary transition-all text-left group"
                >
                  {/* Room icon */}
                  <div className="w-10 h-10 bg-surface-1 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <svg className="w-5 h-5 text-ink-muted group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </div>

                  {/* Room info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-ink font-medium truncate">
                      {room.name}
                    </p>
                    <p className="text-caption text-ink-subtle">
                      {room.id === room.name ? '' : room.id}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="text-caption text-ink-subtle flex-shrink-0">
                    {formatRelativeTime(room.lastAccessed)}
                  </div>

                  {/* Arrow */}
                  <svg className="w-4 h-4 text-ink-subtle flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentRooms.length === 0 && (
          <div className="text-center py-xl">
            <div className="w-16 h-16 bg-surface-1 flex items-center justify-center mx-auto mb-lg">
              <svg className="w-8 h-8 text-ink-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-card-title text-ink mb-sm">No Recent Rooms</h3>
            <p className="text-body text-ink-muted mb-lg max-w-sm mx-auto">
              Create a new room above or enter a session ID shared by a collaborator.
            </p>
            <div className="flex gap-md justify-center">
              <button
                onClick={handleCreateRoom}
                className="bg-primary text-on-primary text-button py-sm px-lg hover:bg-primary-hover transition-colors"
              >
                Create Room
              </button>
              <a
                href="/editor"
                className="border border-hairline text-ink text-button py-sm px-lg hover:bg-surface-1 transition-colors"
              >
                Open Editor Directly
              </a>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-xl bg-surface-1 border border-hairline p-lg">
          <h3 className="text-body-emphasis text-ink mb-sm">How Collaboration Works</h3>
          <ul className="space-y-xs text-body-sm text-ink-muted">
            <li className="flex items-start gap-sm">
              <span className="text-primary mt-0.5">•</span>
              Create a room &mdash; a unique session ID is generated
            </li>
            <li className="flex items-start gap-sm">
              <span className="text-primary mt-0.5">•</span>
              Share the link with your collaborators
            </li>
            <li className="flex items-start gap-sm">
              <span className="text-primary mt-0.5">•</span>
              Everyone in the same room edits the document in real-time
            </li>
            <li className="flex items-start gap-sm">
              <span className="text-primary mt-0.5">•</span>
              Each collaborator&rsquo;s cursor appears with their name and color
            </li>
            <li className="flex items-start gap-sm">
              <span className="text-primary mt-0.5">•</span>
              Your recent rooms are saved locally for quick access
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

// ============================================================
// Helper
// ============================================================

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

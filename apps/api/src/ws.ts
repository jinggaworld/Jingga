// ============================================================
// WebSocket Collaboration Server for Yjs
// Runs alongside Express on the same HTTP server.
// Uses y-websocket's setupWSConnection for Yjs sync protocol.
// ============================================================

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from '@y/websocket-server';

let wss: WebSocketServer | null = null;

/**
 * Start the Yjs WebSocket collaboration server.
 * Attaches to an existing HTTP server, or creates one if not provided.
 *
 * @param server Optional existing HTTP server (from Express)
 * @param path WebSocket path (default: /collab)
 */
export function startCollabServer(
  server?: ReturnType<typeof createServer>,
  path = '/collab',
): { wss: WebSocketServer; wsPath: string } {
  if (wss) {
    console.log('[Collab WS] Server already running');
    return { wss, wsPath: path };
  }

  wss = new WebSocketServer({
    server: server || undefined,
    path,
  });

  wss.on('connection', (conn, req) => {
    console.log('[Collab WS] New connection:', req.url);
    setupWSConnection(conn, req);
  });

  wss.on('error', (err) => {
    console.error('[Collab WS] Error:', err);
  });

  console.log(`[Collab WS] Ready on path: ${path}`);
  return { wss, wsPath: path };
}

/**
 * Get the WebSocket server instance.
 */
export function getCollabServer(): WebSocketServer | null {
  return wss;
}

/**
 * Get the WebSocket URL for the client to connect to.
 */
export function getCollabWsUrl(host = 'localhost', port = '3001', path = '/collab'): string {
  return `ws://${host}:${port}${path}`;
}

/**
 * Stop the collaboration server.
 */
export function stopCollabServer(): void {
  if (wss) {
    wss.close();
    wss = null;
    console.log('[Collab WS] Stopped');
  }
}

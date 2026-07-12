// Type declarations for y-websocket bin/utils (JS-only, no official types)
declare module 'y-websocket/bin/utils' {
  import { WebSocket } from 'ws';
  import { IncomingMessage } from 'http';

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { gc?: boolean; docName?: string },
  ): void;
}

import dotenv from 'dotenv';
import path from 'path';
import http from 'http';

// Load .env — handles both CWDs (running from root via pnpm OR directly from apps/api/)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import emailAuthRoutes from './routes/email-auth';
import uploadRoutes from './routes/upload';
import karyaRoutes from './routes/karya';
import stellarRoutes from './routes/stellar';
import marketplaceRoutes from './routes/marketplace';
import paymentRoutes from './routes/payments';
import dashboardRoutes from './routes/dashboard';
import readerRoutes from './routes/reader';
import licenseRoutes from './routes/license';
import badgeRoutes from './routes/badges';
import academicRoutes from './routes/academic';
import { startCollabServer } from './ws';

const app: express.Express = express();
const PORT = process.env.PORT || 3001;

// Middleware — CORS allowlist
const ALLOWED_ORIGINS = [
  process.env.CORS_ORIGIN,
  'http://localhost:3000',
  'https://jingga-web-pi.vercel.app',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.some((o) => origin === o)) {
      return callback(null, true);
    }
    console.warn('[CORS] Blocked origin:', origin);
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', emailAuthRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/karya', karyaRoutes);
app.use('/api/v1', stellarRoutes);
app.use('/api/v1/marketplace', marketplaceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reader', readerRoutes);
app.use('/api/v1/licenses', licenseRoutes);
app.use('/api/v1/badges', badgeRoutes);
app.use('/api/v1/academic', academicRoutes);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'jingga-api',
    timestamp: new Date().toISOString(),
    network: process.env.STELLAR_NETWORK || 'testnet',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server & start WebSocket for Yjs collaboration
const server = http.createServer(app);
startCollabServer(server);

server.listen(PORT, () => {
  console.log(`[Jingga API] Running on http://localhost:${PORT}`);
  console.log(`[Jingga API] Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`[Collab WS] ws://localhost:${PORT}/collab`);
});

export default app;

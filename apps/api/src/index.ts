import dotenv from 'dotenv';
dotenv.config();

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

const app: express.Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

app.listen(PORT, () => {
  console.log(`[Jingga API] Running on http://localhost:${PORT}`);
  console.log(`[Jingga API] Health: http://localhost:${PORT}/api/v1/health`);
});

export default app;

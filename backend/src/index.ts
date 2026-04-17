import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http from 'http';
import authRouter from './auth/router';
import dataRouter from './api/data/router';
import watchlistRouter from './api/watchlists/router';
import scannerRouter from './api/scanners/router';
import backtestRouter from './api/backtest/router';
import stocksRouter from './api/stocks/router';
import { MarketWebSocketServer } from './data/websocket/market-ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);
app.use('/api/watchlists', watchlistRouter);
app.use('/api/scanners', scannerRouter);
app.use('/api/backtest', backtestRouter);
app.use('/api/stocks', stocksRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket market data server (variable intentionally unused for side effects)
const _marketWsServer = new MarketWebSocketServer(server);
void _marketWsServer; // suppress unused variable warning

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket market data available at ws://localhost:${PORT}/ws/market`);
});
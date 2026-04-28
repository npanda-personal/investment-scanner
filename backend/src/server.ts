import http from 'http';
import { createApp } from './app';
import { appConfig } from './config/env';
import { MarketWebSocketServer } from './data/websocket/market-ws';

export const createHttpServer = (): http.Server => {
  const app = createApp();
  const server = http.createServer(app);

  new MarketWebSocketServer(server);

  return server;
};

export const startServer = (port = appConfig.port): http.Server => {
  const server = createHttpServer();

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`WebSocket market data available at ws://localhost:${port}/ws/market`);
  });

  return server;
};

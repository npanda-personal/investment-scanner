import http from 'http';
import { createApp } from './app';
import { appConfig } from './config/env';
import { startMarketDataFoundationScheduler } from './modules/market-data-foundation/market-data-foundation.scheduler';

export const createHttpServer = (): http.Server => {
  const app = createApp();
  return http.createServer(app);
};

export const startServer = (port = appConfig.port): http.Server => {
  const server = createHttpServer();

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startMarketDataFoundationScheduler();
  });

  return server;
};

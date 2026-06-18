import http from 'http';
import { createApp } from './app';
import { appConfig } from './config/env';
import { connectRedis } from './cache/redis';
import {
  startMarketDataStartupLoads,
} from './modules/market-data-foundation/market-data-foundation.scheduler';
import { startEodIngestScheduler } from './modules/market-context-intelligence/eod-ingest.scheduler';
import { startUsEodPriceScheduler } from './modules/market-context-intelligence/us-eod-price.scheduler';
import { startUsEarningsScheduler } from './modules/market-context-intelligence/us-earnings.scheduler';
import { startPipelineReaperScheduler } from './modules/pipeline-orchestration/pipeline-orchestration.scheduler';

export const createHttpServer = (): http.Server => {
  const app = createApp();
  return http.createServer(app);
};

export const startServer = (port = appConfig.port): http.Server => {
  const server = createHttpServer();

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`[cache] page-response cache ${appConfig.cacheEnabled ? 'ENABLED' : 'disabled'}`);
    connectRedis().catch((error) => {
      console.error('[cache] redis startup connect error', error);
    });
    startMarketDataStartupLoads().catch((error) => {
      console.error('[MarketDataStartup] failed to start market-data startup loads', error);
    });
    startEodIngestScheduler();
    startUsEodPriceScheduler();
    startUsEarningsScheduler();
    startPipelineReaperScheduler();
  });

  return server;
};

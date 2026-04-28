import type { Router } from 'express';
import authRouter from '../auth/router';
import backtestRouter from './backtest/router';
import realTimeScannerRouter from './real-time-scanner/router';
import scannerRunRouter from './scanner/router';
import scannerRouter from './scanners/router';
import smartMoneyRouter from './smart-money/router';
import watchlistRouter from './watchlists/router';
import {
  marketDataDataRouter,
  marketDataFoundationRouter,
  marketDataStocksRouter,
  marketDataV1Router,
} from '../modules/market-data-foundation';

export interface ApiModule {
  path: string;
  router: Router;
}

export const apiModules: ApiModule[] = [
  { path: '/api/auth', router: authRouter },
  { path: '/api/data', router: marketDataDataRouter },
  { path: '/api/v1', router: marketDataV1Router },
  { path: '/api/market-data-foundation', router: marketDataFoundationRouter },
  { path: '/api/watchlists', router: watchlistRouter },
  { path: '/api/scanners', router: scannerRouter },
  { path: '/api/scanner', router: scannerRunRouter },
  { path: '/api/real-time-scanner', router: realTimeScannerRouter },
  { path: '/api/backtest', router: backtestRouter },
  { path: '/api/stocks', router: marketDataStocksRouter },
  { path: '/api/smart-money', router: smartMoneyRouter },
];

export const registerApiModules = (router: Router, modules: ApiModule[] = apiModules): Router => {
  modules.forEach((module) => {
    router.use(module.path, module.router);
  });

  return router;
};

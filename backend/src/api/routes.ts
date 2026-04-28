import type { Router } from 'express';
import {
  marketDataFoundationRouter,
  marketDataV1Router,
} from '../modules/market-data-foundation';
import { stockResearchWorkbenchRouter } from '../modules/stock-research-workbench';
import { signalGenerationEngineRouter } from '../modules/signal-generation-engine';
import { portfolioManagementRouter } from '../modules/portfolio-management';

export interface ApiModule {
  path: string;
  router: Router;
}

export const apiModules: ApiModule[] = [
  { path: '/api/v1', router: marketDataV1Router },
  { path: '/api/v1', router: stockResearchWorkbenchRouter },
  { path: '/api/v1', router: signalGenerationEngineRouter },
  { path: '/api/v1', router: portfolioManagementRouter },
  { path: '/api/market-data-foundation', router: marketDataFoundationRouter },
];

export const registerApiModules = (router: Router, modules: ApiModule[] = apiModules): Router => {
  modules.forEach((module) => {
    router.use(module.path, module.router);
  });

  return router;
};

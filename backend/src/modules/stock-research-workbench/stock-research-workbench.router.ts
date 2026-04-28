import express from 'express';
import { StockResearchWorkbenchController } from './stock-research-workbench.controller';

export const createStockResearchWorkbenchRouter = (
  controller = new StockResearchWorkbenchController()
) => {
  const router = express.Router();

  router.get('/research/stocks/:instrumentId/overview', controller.overview);
  router.get('/research/stocks/:instrumentId/performance', controller.performance);
  router.get('/research/stocks/:instrumentId/peers', controller.peers);
  router.get('/research/stocks/:instrumentId/relative-strength', controller.relativeStrength);
  router.get('/research/stocks/:instrumentId/workbench', controller.workbench);

  return router;
};

export const stockResearchWorkbenchRouter = createStockResearchWorkbenchRouter();

export default stockResearchWorkbenchRouter;

import express from 'express';
import { PortfolioManagementController } from './portfolio-management.controller';

export const createPortfolioManagementRouter = (
  controller = new PortfolioManagementController()
) => {
  const router = express.Router();

  router.get('/portfolios', controller.listPortfolios);
  router.post('/portfolios', controller.createPortfolio);
  router.get('/portfolios/:id', controller.getPortfolio);
  router.patch('/portfolios/:id', controller.updatePortfolio);
  router.delete('/portfolios/:id', controller.deletePortfolio);
  router.post('/portfolios/:id/holdings', controller.addHolding);
  router.patch('/portfolios/:id/holdings/:holdingId', controller.updateHolding);
  router.delete('/portfolios/:id/holdings/:holdingId', controller.removeHolding);
  router.get('/portfolios/:id/summary', controller.summary);
  router.get('/portfolios/:id/allocation', controller.allocation);
  router.get('/portfolios/:id/transactions', controller.listTransactions);
  router.post('/portfolios/:id/transactions', controller.createTransaction);

  return router;
};

export const portfolioManagementRouter = createPortfolioManagementRouter();

export default portfolioManagementRouter;


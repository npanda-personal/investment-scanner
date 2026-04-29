import express from 'express';
import { AiInvestmentCopilotController } from './ai-investment-copilot.controller';

export const createAiInvestmentCopilotRouter = (
  controller = new AiInvestmentCopilotController()
) => {
  const router = express.Router();

  router.post('/copilot/stock-summary', controller.stockSummary);
  router.post('/copilot/portfolio-summary', controller.portfolioSummary);
  router.post('/copilot/watchlist-summary', controller.watchlistSummary);
  router.get('/copilot/market-brief', controller.marketBrief);
  router.get('/copilot/alert-digest', controller.alertDigest);

  return router;
};

export const aiInvestmentCopilotRouter = createAiInvestmentCopilotRouter();
export default aiInvestmentCopilotRouter;

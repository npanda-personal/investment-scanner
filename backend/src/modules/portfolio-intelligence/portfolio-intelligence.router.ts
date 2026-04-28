import express from 'express';
import { PortfolioIntelligenceController } from './portfolio-intelligence.controller';

export const createPortfolioIntelligenceRouter = (
  controller = new PortfolioIntelligenceController()
) => {
  const router = express.Router();

  router.get('/portfolios/:id/intelligence', controller.intelligence);
  router.get('/portfolios/:id/red-flags', controller.redFlags);
  router.get('/portfolios/:id/review', controller.review);

  return router;
};

export const portfolioIntelligenceRouter = createPortfolioIntelligenceRouter();

export default portfolioIntelligenceRouter;

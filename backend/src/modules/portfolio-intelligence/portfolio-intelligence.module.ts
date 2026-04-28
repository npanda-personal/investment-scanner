import { PortfolioIntelligenceController } from './portfolio-intelligence.controller';
import { portfolioIntelligenceRouter } from './portfolio-intelligence.router';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';

export const portfolioIntelligenceModule = {
  name: 'portfolio-intelligence',
  router: portfolioIntelligenceRouter,
  controller: PortfolioIntelligenceController,
  service: PortfolioIntelligenceService,
};

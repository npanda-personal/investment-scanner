import { MarketContextIntelligenceController } from './market-context-intelligence.controller';
import { MarketContextIntelligenceRepository } from './market-context-intelligence.repository';
import { marketContextIntelligenceRouter } from './market-context-intelligence.router';
import { MarketContextIntelligenceService } from './market-context-intelligence.service';

export const marketContextIntelligenceModule = {
  name: 'market-context-intelligence',
  router: marketContextIntelligenceRouter,
  controller: MarketContextIntelligenceController,
  service: MarketContextIntelligenceService,
  repository: MarketContextIntelligenceRepository,
};

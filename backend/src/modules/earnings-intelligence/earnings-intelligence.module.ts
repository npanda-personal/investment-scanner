import { EarningsIntelligenceService } from './earnings-intelligence.service';
import { createEarningsIntelligenceRouter } from './earnings-intelligence.router';

export const earningsIntelligenceModule = {
  service: new EarningsIntelligenceService(),
  router: createEarningsIntelligenceRouter(),
};


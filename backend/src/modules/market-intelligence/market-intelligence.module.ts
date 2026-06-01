import { createMarketIntelligenceRouter } from './market-intelligence.router';

export const marketIntelligenceModule = {
  routePrefix: '/api/v1',
  router: createMarketIntelligenceRouter(),
};

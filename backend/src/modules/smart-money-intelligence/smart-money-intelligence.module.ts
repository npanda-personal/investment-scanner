import { SmartMoneyIntelligenceController } from './smart-money-intelligence.controller';
import { SmartMoneyIntelligenceProvider } from './smart-money-intelligence.provider';
import { SmartMoneyIntelligenceRepository } from './smart-money-intelligence.repository';
import { smartMoneyIntelligenceRouter } from './smart-money-intelligence.router';
import { SmartMoneyIntelligenceService } from './smart-money-intelligence.service';

export const smartMoneyIntelligenceModule = {
  name: 'smart-money-intelligence',
  router: smartMoneyIntelligenceRouter,
  controller: SmartMoneyIntelligenceController,
  service: SmartMoneyIntelligenceService,
  repository: SmartMoneyIntelligenceRepository,
  provider: SmartMoneyIntelligenceProvider,
};

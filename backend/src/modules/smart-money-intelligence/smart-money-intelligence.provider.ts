import type { InsiderOwnershipSummary } from './smart-money-intelligence.types';

export class SmartMoneyIntelligenceProvider {
  async fetchInsiderOwnership(_symbol: string): Promise<InsiderOwnershipSummary> {
    return {
      insiderBuyCount: null,
      insiderSellCount: null,
      netInsiderActivity: null,
      institutionalOwnershipPercent: null,
      ownershipDataStatus: 'MISSING',
      source: 'not-configured',
      explanation: 'Free insider and institutional ownership provider is not configured for the MVP.',
    };
  }
}

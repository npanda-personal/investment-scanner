export type CopilotDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';

export interface CopilotSummaryResponse {
  title: string;
  summary: string;
  keyTakeaways: string[];
  bullishFactors: string[];
  bearishFactors: string[];
  riskFactors: string[];
  dataGaps: string[];
  suggestedNextReviews: string[];
  sourceModules: string[];
  generatedAt: string;
  dataStatus: CopilotDataStatus;
}

export interface StockSummaryRequest {
  instrumentId: string;
}

export interface PortfolioSummaryRequest {
  portfolioId: string;
}

export interface WatchlistSummaryRequest {
  watchlistId: string;
}

export interface CopilotDependencies {
  stockResearchService: any;
  signalService: any;
  smartMoneyService: any;
  marketContextService: any;
  portfolioManagementService: any;
  portfolioIntelligenceService: any;
  watchlistManagementService: any;
  alertsMonitoringService: any;
  subscriptionService?: any;
}

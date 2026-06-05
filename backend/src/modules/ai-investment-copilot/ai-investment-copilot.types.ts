export type CopilotDataStatus = 'COMPLETE' | 'PARTIAL' | 'MISSING' | 'ERROR';

export interface CopilotSummaryResponse {
  title: string;
  summary: string;
  keyTakeaways: string[];
  bullishFactors: string[];
  bearishFactors: string[];
  riskFactors: string[];
  dataGaps: string[];
  /**
   * Cross-module direction conflicts detected for this instrument.
   * Present and non-empty only when genuine contradictions exist among
   * signal direction, today-review state, strategy decision, and
   * market/portfolio posture. Omitted (or empty) when signals are aligned.
   * For research support only — reconcile before acting.
   */
  conflicts?: string[];
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
  /**
   * Optional strategy-decision-engine service.
   * When omitted the production default is lazy-required (cycle-safe).
   * Pass null explicitly to disable strategy-decision enrichment.
   */
  strategyDecisionService?: any | null;
  /**
   * Optional trade-plan-risk-engine service.
   * When omitted the production default is lazy-required (cycle-safe).
   * Pass null explicitly to disable trade-plan enrichment.
   */
  tradePlanService?: any | null;
  /**
   * Optional today-trade-review service.
   * When omitted the production default is lazy-required (cycle-safe).
   * Pass null explicitly to disable today-review enrichment.
   */
  todayReviewService?: any | null;
}

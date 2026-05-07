export type PlanStatus = 'VALID' | 'WATCH' | 'BLOCKED' | 'INSUFFICIENT_DATA';
export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDEFINED';
export type Quality = 'STRONG' | 'ACCEPTABLE' | 'WEAK' | 'FALLBACK' | 'UNKNOWN';
export type PaperReadinessStatus = 'READY_FOR_PAPER_REVIEW' | 'WATCH_ONLY' | 'BLOCKED' | 'INSUFFICIENT_DATA';

export interface EntryZone {
  type: string;
  referencePrice: number;
  preferredEntryMin: number;
  preferredEntryMax: number;
  quality?: Quality;
  rationale: string;
}

export interface StopLoss {
  price: number;
  percentBelowEntry: number;
  method: string;
  quality?: Quality;
  rationale: string;
}

export interface Target {
  price: number;
  expectedReturnPercent: number;
  method: string;
  quality?: Quality;
  rationale: string;
}

export interface PositionSizing {
  portfolioId: string | null;
  capitalBase: number;
  riskPercent: number;
  maxRiskAmount: number;
  suggestedQuantity: number;
  estimatedPositionValue: number;
  positionValuePercent: number;
  notes: string[];
}

export interface PortfolioImpact {
  sectorExposureAfterTrade: number | null;
  singlePositionExposureAfterTrade: number | null;
  warnings: string[];
}

export interface TradePlanResultDto {
  id?: string;
  instrumentId: string;
  symbol: string;
  strategy: string;
  strategyVersion: string;
  strategyDecisionId?: string | null;
  portfolioId?: string | null;
  planStatus: PlanStatus;
  riskGrade: RiskGrade;
  entryZone: EntryZone | null;
  stopLoss: StopLoss | null;
  target: Target | null;
  rewardRiskRatio: number;
  positionSizing: PositionSizing | null;
  portfolioImpact: PortfolioImpact | null;
  invalidationRules: string[];
  warnings: string[];
  blockers: string[];
  dataGaps: string[];
  paperReadinessStatus?: PaperReadinessStatus;
  paperReadinessReasons?: string[];
  paperReadinessBlockers?: string[];
  generatedAt: string;
  modelVersion: string;
}

export interface GenerateTradePlanRequest {
  instrumentId: string;
  symbol: string;
  strategyDecisionId?: string;
  portfolioId?: string;
  region?: string;
  assetType?: string;
  riskPercent?: number;
  capitalBase?: number;
  targetRewardRisk?: number;
}

export interface BatchGenerateTradePlanRequest {
  batchSize?: number;
  offset?: number;
  region?: string;
  assetType?: string;
  strategyCode?: string;
}

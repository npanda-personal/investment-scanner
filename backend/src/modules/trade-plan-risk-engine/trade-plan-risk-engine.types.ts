export type PlanStatus = 'VALID' | 'WATCH' | 'BLOCKED' | 'INSUFFICIENT_DATA';
export type RiskGrade = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDEFINED';

export interface EntryZone {
  type: 'BREAKOUT' | 'PULLBACK' | 'CURRENT_PRICE' | 'UNKNOWN';
  referencePrice: number;
  preferredEntryMin: number;
  preferredEntryMax: number;
  rationale: string;
}

export interface StopLoss {
  price: number;
  percentBelowEntry: number;
  method: 'SMA50' | 'ATR' | 'RECENT_SWING_LOW' | 'FIXED_PERCENT' | 'UNKNOWN';
  rationale: string;
}

export interface Target {
  price: number;
  expectedReturnPercent: number;
  method: 'REWARD_RISK_MULTIPLE' | 'RECENT_HIGH' | 'STRATEGY_DEFAULT' | 'UNKNOWN';
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
  generatedAt: string;
  generatedDate?: string;
  modelVersion: string;
}

export interface GenerateTradePlanRequest {
  instrumentId: string;
  symbol: string;
  strategyDecisionId?: string;
  portfolioId?: string;
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

export interface TradePlanListQuery {
  region?: string;
  assetType?: string;
  strategyCode?: string;
  planStatus?: string;
  riskGrade?: string;
  minRewardRisk?: number;
  portfolioId?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface TradePlanModelRules {
  defaultRiskPercent: number;
  minRiskPercent: number;
  maxRiskPercent: number;
  defaultRewardRiskTarget: number;
  maxSinglePositionExposurePercent: number;
  maxSectorExposurePercent: number;
}

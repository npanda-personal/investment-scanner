import type { MarketScope } from '@/contexts/MarketScopeContext';

export type SnapshotAvailability = 'READY' | 'EMPTY' | 'BACKEND_UNAVAILABLE' | 'ERROR';
export type MarketPulseState = 'Healthy' | 'Tradable But Selective' | 'Fragile' | 'Risky' | 'Stale' | 'Partial';

export interface SnapshotEnvelope<T> {
  availability: SnapshotAvailability;
  scope: MarketScope;
  snapshot: T | null;
  message: string;
  warnings: string[];
}

export interface FreshnessSnapshot {
  label: string;
  dataThroughDate?: string | null;
  generatedAt?: string | null;
  status?: string | null;
}

export interface ReasonTag {
  label: string;
  tone?: 'default' | 'positive' | 'warning' | 'negative';
}

export interface RiskTag {
  label: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface MarketPulseIndexRow {
  symbol: string;
  label: string;
  value: number | null;
  changePercent: number | null;
  freshness?: string | null;
}

export interface MarketPulseSnapshot {
  snapshotDate: string;
  dataThroughDate: string;
  generatedAt: string;
  status: string;
  marketHealthScore: number | null;
  marketHealthLabel: MarketPulseState | string;
  topIndices: MarketPulseIndexRow[];
  strongSectors: string[];
  weakSectors: string[];
  breadthSummary: string;
  deliverySummary: string;
  candidateCount: number | null;
  warnings: string[];
}

export interface StockInterestSnapshot {
  snapshotDate: string;
  generatedAt: string;
  score: number | null;
  symbol: string;
  company: string;
  sector: string | null;
  category: string;
  direction: string;
  reasonTags: string[];
  riskTags: string[];
  freshness?: string | null;
  returns?: string | null;
}

export interface EarningsIntelligenceSnapshot {
  snapshotDate: string;
  symbol: string;
  resultDate: string | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: string | null;
  consistencyScore: number | null;
  accelerationScore: number | null;
  reasonTags: string[];
  riskTags: string[];
  freshness?: string | null;
}

export interface CompounderSnapshot {
  snapshotDate: string;
  symbol: string;
  compounderScore: number | null;
  growthScore: number | null;
  qualityScore: number | null;
  trendScore: number | null;
  reasonTags: string[];
  riskTags: string[];
  freshness?: string | null;
}

export interface TraderSetupSnapshot {
  snapshotDate: string;
  symbol: string;
  setupType: string;
  setupScore: number | null;
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | string;
  reasonTags: string[];
  riskTags: string[];
  freshness?: string | null;
}

export interface RiskRadarSnapshot {
  snapshotDate: string;
  symbol: string;
  riskScore: number | null;
  riskCategory: string;
  reasonTags: string[];
  freshness?: string | null;
}

export interface InstrumentContextSnapshot {
  snapshotDate: string;
  symbol: string;
  marketState: string;
  sectorState: string;
  relativeStrength: string;
  earningsStatus: string;
  compounderStatus: string;
  setupStatus: string;
  riskStatus: string;
  freshness: FreshnessSnapshot;
}

export type MarketReadModelKey =
  | 'marketPulse'
  | 'stockInterest'
  | 'earningsIntelligence'
  | 'compounderRadar'
  | 'traderSetupRadar'
  | 'riskRadar'
  | 'instrumentContext';

export interface MarketIntelligenceFixtureMap {
  marketPulse?: MarketPulseSnapshot;
  stockInterest?: StockInterestSnapshot[];
  earningsIntelligence?: EarningsIntelligenceSnapshot[];
  compounderRadar?: CompounderSnapshot[];
  traderSetupRadar?: TraderSetupSnapshot[];
  riskRadar?: RiskRadarSnapshot[];
  instrumentContext?: InstrumentContextSnapshot;
}

declare global {
  interface Window {
    __marketIntelligenceReadModelFixtures?: MarketIntelligenceFixtureMap;
  }
}

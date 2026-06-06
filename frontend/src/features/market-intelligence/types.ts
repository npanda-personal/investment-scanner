import type { MarketScope } from '@/contexts/MarketScopeContext';

export type SnapshotAvailability = 'READY' | 'EMPTY' | 'PARTIAL' | 'STALE' | 'BACKEND_UNAVAILABLE' | 'ERROR';
export type MarketPulseState = 'Healthy' | 'Tradable But Selective' | 'Fragile' | 'Risky' | 'Stale' | 'Partial';

export interface SnapshotEnvelope<T> {
  availability: SnapshotAvailability;
  scope: MarketScope;
  snapshot: T | null;
  message: string;
  warnings: string[];
  status?: string | null;
  freshness?: string | null;
  snapshotDate?: string | null;
  dataThroughDate?: string | null;
  generatedAt?: string | null;
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

export interface MarketPulseVixSummary {
  latest: number | null;
  low5d: number | null;
  high5d: number | null;
  asOf: string | null;
  posture: 'CALM' | 'ELEVATED' | 'HIGH' | 'UNAVAILABLE';
}

export interface MarketPulseAdvanceDeclineSummary {
  advances: number;
  declines: number;
  ratio: number | null;
  asOf: string | null;
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
  sourceSummary?: {
    status?: string | null;
    dataThroughDate?: string | null;
    latestCompletedTradingDate?: string | null;
  } | null;
  /** NR-22: India VIX summary. */
  vixSummary?: MarketPulseVixSummary | null;
  /** NR-23: Advance/Decline headline counts. */
  advanceDecline?: MarketPulseAdvanceDeclineSummary | null;
  /** NR-21: Prior-day market health score. */
  priorHealthScore?: number | null;
  /** NR-21: Last 5 daily health scores oldest-first for sparkline. */
  healthScoreHistory?: number[] | null;
}

export interface SectorIntelligenceSnapshot {
  snapshotDate: string;
  dataThroughDate: string;
  sector: string;
  classification: 'STRONG' | 'IMPROVING' | 'NEUTRAL' | 'WEAK' | string;
  sectorScore: number | null;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
  trendScore: number | null;
  reasonTags: string[];
  warnings: string[];
}

export interface StockInterestSnapshot {
  snapshotDate: string;
  dataThroughDate?: string | null;
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
  warnings?: string[];
}

export interface EarningsIntelligenceSnapshot {
  snapshotDate: string;
  dataThroughDate?: string | null;
  generatedAt?: string | null;
  symbol: string;
  resultDate: string | null;
  resultDateSource: string;
  resultDateLabel?: 'Official' | 'Estimated' | null;
  periodEndDate?: string | null;
  validatedAt?: string | null;
  daysToResult?: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  marginTrend: number | null;
  consistencyScore: number | null;
  accelerationScore: number | null;
  categories: string[];
  reasonTags: string[];
  riskTags: string[];
  warnings?: string[];
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

export interface InstrumentContextField<T = string | null> {
  value: T;
  source: string;
  asOf: string | null;
  absent: boolean;
}

export interface InstrumentContextSnapshot {
  instrumentId: string;
  symbol: string;
  sector: string | null;
  assembledAt: string;

  marketRegime: InstrumentContextField<{
    regime: string;
    score: number;
    explanation: string;
  } | null>;

  sectorStrength: InstrumentContextField<{
    sector: string;
    classification: string;
    sectorScore: number | null;
    return1W: number | null;
    return1M: number | null;
    return3M: number | null;
  } | null>;

  relativeStrength: InstrumentContextField<{
    stockReturn63d: number | null;
    benchmarkReturn63d: number | null;
    relativeReturn63d: number | null;
    rsPercentile: number | null;
  } | null>;

  smartMoney: InstrumentContextField<{
    status: string;
    score: number;
    confidence: string;
  } | null>;

  fnoBan: InstrumentContextField<{
    banned: boolean;
    banDate: string | null;
  } | null>;

  latestSignal: InstrumentContextField<{
    direction: string;
    score: number;
    confidence: string;
    generatedDate: string | null;
  } | null>;
}

export interface SectorConstituentRow {
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  marketCap: number | null;
  latestPrice: number | null;
  latestPriceTimestamp: string | null;
  return1W: number | null;
  return1M: number | null;
  signalDirection: string | null;
  signalScore: number | null;
  relativeStrength: number | null;
}

export interface SectorConstituentsEnvelope {
  availability: 'READY' | 'EMPTY' | 'INVALID_PARAMS' | 'ERROR';
  sector: string;
  region: string;
  assetType: string;
  constituents: SectorConstituentRow[];
  count: number;
  message: string;
  warnings: string[];
}

export type RotationQuadrant = 'LEADING' | 'IMPROVING' | 'WEAKENING' | 'LAGGING';

export interface SectorRotationRow extends SectorIntelligenceSnapshot {
  rotationQuadrant: RotationQuadrant;
}

export interface SectorRotationEnvelope {
  availability: 'READY' | 'EMPTY' | 'ERROR';
  scope: { region: string; assetType: string };
  snapshotDate: string | null;
  dataThroughDate: string | null;
  generatedAt: string;
  sectors: SectorRotationRow[];
  quadrantCounts: Record<RotationQuadrant, number>;
  message: string;
  warnings: string[];
}

export type MarketReadModelKey =
  | 'marketPulse'
  | 'sectorIntelligence'
  | 'stockInterest'
  | 'earningsIntelligence'
  | 'compounderRadar'
  | 'traderSetupRadar'
  | 'riskRadar'
  | 'instrumentContext';

// ─── Index Constituents (NR-103) ────────────────────────────────────────────

export type SupportedIndex = 'NIFTY_50' | 'NIFTY_BANK';

export interface IndexConstituentRow {
  instrumentId: string | null;
  symbol: string;
  companyName: string | null;
  sector: string | null;
  marketCap: number | null;
  latestPrice: number | null;
  latestPriceTimestamp: string | null;
  change1D: number | null;
  signalDirection: string | null;
  signalScore: number | null;
}

export interface IndexBreadthSummary {
  total: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  noSignalCount: number;
  headline: string;
}

export type IndexConstituentsAvailability = 'READY' | 'PARTIAL' | 'EMPTY' | 'INVALID_PARAMS' | 'ERROR';

export interface IndexConstituentsEnvelope {
  availability: IndexConstituentsAvailability;
  index: string;
  indexLabel: string;
  membershipSource: 'CURATED_STATIC';
  membershipAsOf: string;
  constituents: IndexConstituentRow[];
  count: number;
  breadth: IndexBreadthSummary;
  message: string;
  warnings: string[];
}

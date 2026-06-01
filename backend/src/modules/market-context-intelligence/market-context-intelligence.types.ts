import type { MarketDataStatus } from '../market-data-foundation';

export type MarketRegime = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
export type LeadershipStatus = 'LEADING' | 'IMPROVING' | 'WEAKENING' | 'LAGGING';
export type MacroStatus = 'SUPPORTIVE' | 'MIXED' | 'HEADWIND' | 'UNKNOWN';
export type MarketContextRange = '1M' | '3M' | '6M';
export type SectorIntelligenceClassification = 'STRONG' | 'IMPROVING' | 'NEUTRAL' | 'WEAK';

export interface ContextInstrument {
  instrumentId: string;
  symbol: string;
  sector: string | null;
  country: string | null;
  latest: number | null;
  previous: number | null;
  prices: number[];
  signalDirection?: string | null;
  signalScore?: number | null;
}

export interface MarketRegimeSummary {
  regime: MarketRegime;
  score: number;
  explanation: string;
  updatedAt: string;
  dataStatus: MarketDataStatus;
}

export interface SectorRotationItem {
  sector: string;
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  relativeStrengthScore: number;
  instrumentCount: number;
  bullishSignalCount: number;
  bearishSignalCount: number;
  leadershipStatus: LeadershipStatus;
}

export interface SectorIndexPricePoint {
  timestamp: Date;
  close: number;
  adjustedClose: number | null;
}

export interface SectorIndexInput {
  instrumentId: string;
  symbol: string;
  displayName: string;
  sourceSymbol: string | null;
  latestPrice: number | null;
  latestTimestamp: Date | null;
  prices: SectorIndexPricePoint[];
}

export interface SectorSnapshotDto {
  snapshotDate: string;
  dataThroughDate: string;
  sector: string;
  classification: SectorIntelligenceClassification;
  sectorScore: number;
  return1W: number | null;
  return1M: number | null;
  return3M: number | null;
  trendScore: number;
  reasonTags: string[];
  warnings: string[];
}

export interface SectorIntelligenceRefreshRequest {
  region?: string;
  assetType?: string;
  dataThroughDate?: string | Date | null;
}

export interface SectorIntelligenceRefreshResult {
  status: 'COMPLETED' | 'PARTIAL' | 'SKIPPED' | 'FAILED';
  scope: {
    region: string;
    assetType: string;
  };
  snapshotDate: string | null;
  dataThroughDate: string | null;
  totalCount: number;
  processedCount: number;
  savedCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  sectors: SectorSnapshotDto[];
}

export interface SectorIntelligenceSnapshotEnvelope {
  status: 'ready' | 'missing';
  scope: {
    region: string;
    assetType: string;
  };
  snapshotDate: string | null;
  dataThroughDate: string | null;
  generatedAt: string;
  materialized: true;
  sourceLabels: {
    sectorIndexes: string;
    prices: string;
  };
  warnings: string[];
  sectors: SectorSnapshotDto[];
}

export interface MarketBreadth {
  percentAboveSma50: number | null;
  percentAboveSma200: number | null;
  sma50SampleCount?: number;
  sma200SampleCount?: number;
  advanceDeclineRatio: number | null;
  newHigh52WeekCount: number;
  newLow52WeekCount: number;
  bullishSignalCount: number;
  bearishSignalCount: number;
  instrumentCount: number;
  dataStatus: MarketDataStatus;
}

export interface PersistedMarketBreadth extends MarketBreadth {
  officialAdvanceCount: number | null;
  officialDeclineCount: number | null;
  officialUnchangedCount: number | null;
}

export interface PersistedMarketBreadthEnvelope {
  status: 'ready' | 'missing';
  scope: { region: string };
  asOf: string | null;
  materialized: false;
  breadth: PersistedMarketBreadth | null;
  sourceLabels: {
    savedBreadth: string;
    officialAdvancesDeclines: string;
  };
  gaps: string[];
}

export interface CountryStrengthItem {
  country: string;
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  relativeStrengthScore: number;
  instrumentCount: number;
  bullishSignalCount: number;
}

export interface MacroSnapshot {
  interestRateProxy: number | null;
  inflationProxy: number | null;
  usdStrengthProxy: number | null;
  commodityProxy: number | null;
  macroStatus: MacroStatus;
  dataStatus: MarketDataStatus;
  explanation: string;
}

export interface MarketContextSummary {
  regime: MarketRegimeSummary;
  topSectors: SectorRotationItem[];
  weakSectors: SectorRotationItem[];
  breadth: MarketBreadth;
  countryStrength: CountryStrengthItem[];
  macro: MacroSnapshot;
  explanation: string[];
  updatedAt: string;
  dataStatus: MarketDataStatus;
}

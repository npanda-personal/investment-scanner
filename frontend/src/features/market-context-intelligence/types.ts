export type CapBand = 'LARGE' | 'MID' | 'SMALL' | 'UNKNOWN';

export interface CapBandBreadth {
  band: CapBand;
  label: string;
  percentAboveSma50: number | null;
  percentAboveSma200: number | null;
  advancers: number;
  decliners: number;
  instrumentCount: number;
}

export type MarketRegime = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
export type LeadershipStatus = 'LEADING' | 'IMPROVING' | 'WEAKENING' | 'LAGGING';
export type MacroStatus = 'SUPPORTIVE' | 'MIXED' | 'HEADWIND' | 'UNKNOWN';
export type DataStatus = 'COMPLETE' | 'PARTIAL' | 'DELAYED' | 'MISSING' | 'ERROR';

export interface MarketRegimeSummary {
  regime: MarketRegime;
  score: number;
  explanation: string;
  updatedAt: string;
  dataStatus: DataStatus;
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
  dataStatus: DataStatus;
}
export interface PersistedMarketBreadth extends MarketBreadth {
  officialAdvanceCount: number | null;
  officialDeclineCount: number | null;
  officialUnchangedCount: number | null;
}
export interface PersistedMarketBreadthResponse {
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
  dataStatus: DataStatus;
  explanation: string;
}
export interface MarketContextSummary {
  regime: MarketRegimeSummary;
  topSectors: SectorRotationItem[];
  weakSectors: SectorRotationItem[];
  breadth: MarketBreadth;
  breadthByCapBand: CapBandBreadth[];
  countryStrength: CountryStrengthItem[];
  macro: MacroSnapshot;
  explanation: string[];
  updatedAt: string;
  dataStatus: DataStatus;
}

// ─── NR-104: Breadth Internals time series ───────────────────────────────────

export interface BreadthInternalsPoint {
  date: string;
  percentAboveSma50: number | null;
  percentAboveSma200: number | null;
  advanceDeclineRatio: number | null;
  newHighCount: number | null;
  newLowCount: number | null;
  newHighLowNet: number | null;
  regimeScore: number | null;
  regime: string | null;
}

export interface BreadthInternalsDelta {
  field: string;
  current: number | null;
  nDaysAgo: number | null;
  delta: number | null;
}

export interface BreadthDivergenceNote {
  detected: boolean;
  description: string | null;
}

export interface BreadthInternalsEnvelope {
  status: 'ready' | 'limited' | 'missing';
  scope: { region: string };
  requestedDays: number;
  limitedHistory: boolean;
  limitedHistoryNote: string | null;
  series: BreadthInternalsPoint[];
  deltas: BreadthInternalsDelta[];
  divergence: BreadthDivergenceNote;
  assembledAt: string;
}

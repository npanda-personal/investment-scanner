import type { MarketScope } from '@/contexts/MarketScopeContext';
import type { MarketContextSummary, PersistedMarketBreadthResponse, PersistedMarketContextSummaryResponse } from '@/features/market-context-intelligence';
import type { MarketDataUniverseHealth, V1InstrumentsResponse } from '@/features/market-data-foundation';
import type { MarketMoverRange, MarketMoversSummary } from '@/features/daily-overview-dashboard/types';
import type { TodayReviewResponse } from '@/features/today-trade-review/types';

export interface SnapshotResource<T> {
  value: T | null;
  status: 'ready' | 'missing';
  error: string | null;
  source: string;
  sourceUrl?: string;
  asOf: string | null;
}

export interface MarketIntelligenceSnapshot {
  scope: MarketScope;
  fetchedAt: string;
  marketContext: SnapshotResource<MarketContextSummary>;
  persistedMarketContext: SnapshotResource<PersistedMarketContextSummaryResponse>;
  persistedBreadth: SnapshotResource<PersistedMarketBreadthResponse>;
  todayReview: SnapshotResource<TodayReviewResponse>;
  marketMovers: SnapshotResource<MarketMoversSummary>;
  universeHealth: SnapshotResource<MarketDataUniverseHealth>;
  indices: SnapshotResource<V1InstrumentsResponse>;
  fnoUnderlyings: SnapshotResource<V1InstrumentsResponse>;
  mapInstruments: SnapshotResource<V1InstrumentsResponse>;
}

export type MarketEnvironmentState = 'SUPPORTIVE' | 'NARROW' | 'RISKY' | 'BLOCKED' | 'UNAVAILABLE';

export interface MarketMapTile {
  instrumentId: string;
  symbol: string;
  displaySymbol: string;
  companyName: string;
  sector: string | null;
  derivativesEligible: boolean | null;
  dataStatus: string | null;
  returnPercent: number | null;
  latestDate: string | null;
  priceBasis?: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
}

export interface MarketMapGroup {
  key: string;
  label: string;
  tileCount: number;
  avgReturnPercent: number | null;
}

export interface MarketMapSummary {
  status: 'ready' | 'missing';
  scope: MarketScope;
  asOf: string | null;
  range: MarketMoverRange;
  materialized: false;
  sourceLabels: {
    catalog: string;
    prices: string;
  };
  warnings: string[];
  gaps: string[];
  groups: MarketMapGroup[];
  tiles: MarketMapTile[];
}

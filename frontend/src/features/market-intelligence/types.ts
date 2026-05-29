import type { MarketScope } from '@/contexts/MarketScopeContext';
import type { MarketContextSummary } from '@/features/market-context-intelligence/types';
import type { MarketDataUniverseHealth, V1InstrumentsResponse } from '@/features/market-data-foundation';
import type { MarketMoversSummary } from '@/features/daily-overview-dashboard/types';
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
  todayReview: SnapshotResource<TodayReviewResponse>;
  marketMovers: SnapshotResource<MarketMoversSummary>;
  universeHealth: SnapshotResource<MarketDataUniverseHealth>;
  indices: SnapshotResource<V1InstrumentsResponse>;
  fnoUnderlyings: SnapshotResource<V1InstrumentsResponse>;
  mapInstruments: SnapshotResource<V1InstrumentsResponse>;
}

export type MarketEnvironmentState = 'SUPPORTIVE' | 'NARROW' | 'RISKY' | 'BLOCKED' | 'UNAVAILABLE';

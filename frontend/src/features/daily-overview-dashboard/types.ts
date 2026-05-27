import type { MarketScope } from '@/contexts/MarketScopeContext';
import type { MarketContextSummary } from '@/features/market-context-intelligence/types';
import type { TodayReviewCandidate, TodayReviewResponse } from '@/features/today-trade-review/types';

export interface DashboardSectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  dashboardFetchedAt: string | null;
}

export interface DailyOverviewCriticalSections {
  todayReview: DashboardSectionState<TodayReviewResponse>;
  marketMovers: DashboardSectionState<MarketMoversSummary>;
}

export interface DailyOverviewDeferredSections {
  marketContext: DashboardSectionState<MarketContextSummary>;
}

export type CalibrationEvidenceSummaryDisplayState = 'USABLE' | 'LIMITED' | 'UNAVAILABLE' | 'WAITING';

export interface DailyOverviewDashboardState {
  scope: MarketScope;
  critical: DailyOverviewCriticalSections;
  deferred: DailyOverviewDeferredSections;
  criticalLoading: boolean;
  deferredLoading: boolean;
  refreshing: boolean;
  latestDashboardFetchedAt: string | null;
  latestSourceTimestamp: string | null;
  loadMarketMoversRange: (range: MarketMoverRange) => Promise<void>;
}

export type DailyPulseState = 'REVIEW_SUPPORTED' | 'REVIEW_LIMITED' | 'REVIEW_BLOCKED' | 'MIXED_EVIDENCE' | 'UNAVAILABLE';

export type CandidateGroupKey = 'bullishReview' | 'bearishReview' | 'exitRiskReview';

export interface CandidateGroupSummary {
  key: CandidateGroupKey;
  label: string;
  count: number | null;
  rows: Array<{
    id: string;
    symbol: string;
    reasonSummary: string;
    subLabel: string;
    targetRoute: string;
  }>;
}

export interface DashboardDrilldownRoute {
  label: string;
  to: string;
  context: string | null;
}

export type MarketMoverRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';

export interface MarketMoverRow {
  instrumentId: string;
  symbol: string;
  companyName: string;
  sector: string | null;
  latestDate: string;
  latestClose: number;
  baseDate: string;
  baseClose: number;
  returnPercent: number;
  priceBasis?: 'ADJUSTED_CLOSE' | 'CLOSE_FALLBACK';
  latestSource?: string | null;
  baseSource?: string | null;
  actualLookbackDays?: number;
  historyBarsInWindow?: number;
  averageRecentTurnover?: number | null;
}

export interface MarketMoverRangeSummary {
  range: MarketMoverRange;
  gainers: MarketMoverRow[];
  losers: MarketMoverRow[];
  warnings: string[];
}

export interface MarketMoversSummary {
  scope: {
    region: string;
    assetType: string;
  };
  generatedAt: string;
  ranges: MarketMoverRangeSummary[];
}

export type TodayReviewCandidateGroupSet = {
  bullishReview: TodayReviewCandidate[];
  bearishReview: TodayReviewCandidate[];
  exitRiskReview: TodayReviewCandidate[];
  watchOnly: TodayReviewCandidate[];
  blocked: TodayReviewCandidate[];
  insufficientData: TodayReviewCandidate[];
  unproven: TodayReviewCandidate[];
};

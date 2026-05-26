import type { MarketScope } from '@/contexts/MarketScopeContext';
import type { DataQualityReviewReadinessSummary, DataQualitySummary } from '@/features/data-quality-engine/types';
import type { MarketContextSummary } from '@/features/market-context-intelligence/types';
import type { PipelineStatusSnapshot } from '@/features/pipeline-ops/types';
import type { ResearchOverview } from '@/features/research-hub/api/researchHubApi';
import type { SignalGenerationRunAudit } from '@/features/signal-generation-engine/types';
import type { TodayReviewCandidate, TodayReviewResponse } from '@/features/today-trade-review/types';

export interface DashboardSectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  dashboardFetchedAt: string | null;
}

export interface DailyOverviewCriticalSections {
  todayReview: DashboardSectionState<TodayReviewResponse>;
  researchOverview: DashboardSectionState<ResearchOverview>;
  reviewReadiness: DashboardSectionState<DataQualityReviewReadinessSummary>;
}

export interface DailyOverviewDeferredSections {
  marketContext: DashboardSectionState<MarketContextSummary>;
  dataQualitySummary: DashboardSectionState<DataQualitySummary>;
  latestSignalRun: DashboardSectionState<SignalGenerationRunAudit>;
  pipelineStatus: DashboardSectionState<PipelineStatusSnapshot>;
}

export interface DailyOverviewDashboardState {
  scope: MarketScope;
  critical: DailyOverviewCriticalSections;
  deferred: DailyOverviewDeferredSections;
  criticalLoading: boolean;
  deferredLoading: boolean;
  refreshing: boolean;
  latestDashboardFetchedAt: string | null;
  latestSourceTimestamp: string | null;
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

export type TodayReviewCandidateGroupSet = {
  bullishReview: TodayReviewCandidate[];
  bearishReview: TodayReviewCandidate[];
  exitRiskReview: TodayReviewCandidate[];
  watchOnly: TodayReviewCandidate[];
  blocked: TodayReviewCandidate[];
  insufficientData: TodayReviewCandidate[];
  unproven: TodayReviewCandidate[];
};

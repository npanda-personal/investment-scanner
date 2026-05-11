import type { DataQualityEvaluation } from '@/features/data-quality-engine/types';
import type { TradePlanResultDto } from '@/features/trade-plan-risk-engine/types';

export type TodayReviewRunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
export type TodayReviewTrustStatus = 'OK' | 'PARTIAL' | 'STALE' | 'FAILED';
export type TodayReviewCandidateState =
  | 'LONG_REVIEW'
  | 'SHORT_REVIEW'
  | 'EXIT_RISK_REVIEW'
  | 'WATCH_ONLY'
  | 'BLOCKED'
  | 'AVOID'
  | 'INSUFFICIENT_DATA'
  | 'UNPROVEN';
export type TodayReviewDirection = 'LONG' | 'SHORT' | 'EXIT_RISK' | 'WATCH' | 'BLOCKED' | 'AVOID';
export type TodayReviewGrade = 'A' | 'B' | 'C' | 'D' | 'UNPROVEN';

export interface TodayReviewCandidate {
  id: string;
  runId: string;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  direction: TodayReviewDirection;
  state: TodayReviewCandidateState;
  setupType: string | null;
  strategyCode: string;
  strategyVersion: string | null;
  rank: number;
  grade: TodayReviewGrade;
  confidenceScore: number;
  reasonSummary: string;
  blockers: string[];
  watchReasons: string[];
  dataQualitySnapshot: DataQualityEvaluation | Record<string, any> | null;
  marketContextSnapshot: Record<string, any> | null;
  strategyProofSnapshot: Record<string, any> | null;
  tradePlanSnapshot: TradePlanResultDto | Record<string, any> | null;
  sourceSignalSnapshot: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TodayReviewRun {
  id: string;
  runDate: string;
  region: string;
  assetType: string;
  status: TodayReviewRunStatus;
  trustStatus: TodayReviewTrustStatus;
  dataThroughDate: string | null;
  startedAt: string;
  finishedAt: string | null;
  warnings: string[];
  candidateCounts: Record<string, number>;
  sourceSnapshot: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  candidates: TodayReviewCandidate[];
}

export interface TodayReviewGroups {
  longReview: TodayReviewCandidate[];
  shortReview: TodayReviewCandidate[];
  exitRiskReview: TodayReviewCandidate[];
  watchOnly: TodayReviewCandidate[];
  blocked: TodayReviewCandidate[];
  avoid: TodayReviewCandidate[];
  insufficientData: TodayReviewCandidate[];
  unproven: TodayReviewCandidate[];
}

export interface TodayReviewResponse {
  run: TodayReviewRun | null;
  groups: TodayReviewGroups;
  scope: {
    region: string;
    assetType: string;
  };
}

export interface TodayReviewRunsResponse {
  items: TodayReviewRun[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
}

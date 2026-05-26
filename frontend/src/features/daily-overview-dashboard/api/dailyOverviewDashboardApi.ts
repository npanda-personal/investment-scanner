import axios from 'axios';
import { fetchDataQualityReviewReadiness, fetchDataQualitySummary } from '@/features/data-quality-engine/api/dataQualityEngineService';
import { fetchMarketContextSummary } from '@/features/market-context-intelligence/api/marketContextIntelligenceService';
import { fetchPipelineStatus } from '@/features/pipeline-ops/api/pipelineOpsService';
import { fetchResearchOverview } from '@/features/research-hub/api/researchHubApi';
import { fetchCalibrationModel, fetchTopCalibratedSignals } from '@/features/signal-calibration-engine/api/signalCalibrationEngineService';
import { fetchLatestSignalRun } from '@/features/signal-generation-engine/api/signalGenerationEngineService';
import type { DataQualityReviewReadinessSummary, DataQualitySummary } from '@/features/data-quality-engine/types';
import type { MarketContextSummary } from '@/features/market-context-intelligence/types';
import type { PipelineStatusSnapshot } from '@/features/pipeline-ops/types';
import type { ResearchOverview } from '@/features/research-hub/api/researchHubApi';
import type { CalibrationPageSummary } from '@/features/signal-calibration-engine/types';
import type { SignalGenerationRunAudit } from '@/features/signal-generation-engine/types';
import type { TodayReviewResponse } from '@/features/today-trade-review/types';

export interface DailyOverviewScopeParams {
  region: string;
  assetType: string;
}

export async function fetchDailyOverviewTodayReview(params: DailyOverviewScopeParams): Promise<TodayReviewResponse> {
  const response = await axios.get<TodayReviewResponse>('/api/v1/today-review/latest', { params });
  return response.data;
}

export async function fetchDailyOverviewResearchOverview(params: DailyOverviewScopeParams): Promise<ResearchOverview> {
  return fetchResearchOverview(params);
}

export async function fetchDailyOverviewReviewReadiness(params: DailyOverviewScopeParams): Promise<DataQualityReviewReadinessSummary> {
  return fetchDataQualityReviewReadiness(params);
}

export async function fetchDailyOverviewMarketContext(params: DailyOverviewScopeParams): Promise<MarketContextSummary> {
  return fetchMarketContextSummary({ region: params.region });
}

export async function fetchDailyOverviewDataQualitySummary(params: DailyOverviewScopeParams): Promise<DataQualitySummary> {
  return fetchDataQualitySummary(params);
}

export async function fetchDailyOverviewLatestSignalRun(params: DailyOverviewScopeParams): Promise<SignalGenerationRunAudit | null> {
  return fetchLatestSignalRun(params);
}

export async function fetchDailyOverviewPipelineStatus(params: DailyOverviewScopeParams): Promise<PipelineStatusSnapshot> {
  return fetchPipelineStatus({
    region: params.region,
    assetType: params.assetType,
    timeframe: '1d',
    pipelineKey: 'market-intelligence',
    limit: 100,
  });
}

export async function fetchDailyOverviewCalibrationSummary(params: DailyOverviewScopeParams & { horizon: string }): Promise<CalibrationPageSummary> {
  const response = await fetchTopCalibratedSignals({
    region: params.region,
    assetType: params.assetType,
    horizon: params.horizon,
    limit: 25,
    offset: 0,
    sortBy: 'generatedAt',
    sortDirection: 'desc',
  });

  if (!response.pageSummary) {
    throw new Error('Calibration evidence summary is unavailable for this scope and horizon.');
  }

  return response.pageSummary;
}

export async function fetchDailyOverviewCalibrationDefaultHorizon() {
  const model = await fetchCalibrationModel();
  return model.defaultHorizon || '20D';
}

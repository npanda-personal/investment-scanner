import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  fetchDailyOverviewDataQualitySummary,
  fetchDailyOverviewLatestSignalRun,
  fetchDailyOverviewMarketContext,
  fetchDailyOverviewPipelineStatus,
  fetchDailyOverviewResearchOverview,
  fetchDailyOverviewReviewReadiness,
  fetchDailyOverviewTodayReview,
} from '../api/dailyOverviewDashboardApi';
import type { DashboardSectionState, DailyOverviewDashboardState } from '../types';

function emptySection<T>(): DashboardSectionState<T> {
  return {
    data: null,
    loading: false,
    error: null,
    dashboardFetchedAt: null,
  };
}

function toErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null) {
    const withResponse = error as { response?: { data?: { error?: string } }; message?: string };
    if (typeof withResponse.response?.data?.error === 'string') return withResponse.response.data.error;
    if (typeof withResponse.message === 'string') return withResponse.message;
  }
  return fallback;
}

export function useDailyOverviewDashboard(): DailyOverviewDashboardState & { refresh: () => Promise<void> } {
  const { scope } = useMarketScope();
  const requestRef = useRef(0);

  const [criticalLoading, setCriticalLoading] = useState(true);
  const [deferredLoading, setDeferredLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [todayReview, setTodayReview] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewTodayReview>>>>(() => emptySection());
  const [researchOverview, setResearchOverview] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewResearchOverview>>>>(() => emptySection());
  const [reviewReadiness, setReviewReadiness] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewReviewReadiness>>>>(() => emptySection());
  const [marketContext, setMarketContext] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewMarketContext>>>>(() => emptySection());
  const [dataQualitySummary, setDataQualitySummary] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewDataQualitySummary>>>>(() => emptySection());
  const [latestSignalRun, setLatestSignalRun] = useState<DashboardSectionState<NonNullable<Awaited<ReturnType<typeof fetchDailyOverviewLatestSignalRun>>>>>(() => emptySection());
  const [pipelineStatus, setPipelineStatus] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewPipelineStatus>>>>(() => emptySection());

  const runLoad = useCallback(async (mode: 'initial' | 'refresh') => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (mode === 'refresh') setRefreshing(true);
    setCriticalLoading(true);
    setDeferredLoading(true);

    setTodayReview((current) => ({ ...current, loading: true, error: null }));
    setResearchOverview((current) => ({ ...current, loading: true, error: null }));
    setReviewReadiness((current) => ({ ...current, loading: true, error: null }));

    const scopeParams = { region: scope.region, assetType: scope.assetType };

    const [todayReviewResult, researchResult, readinessResult] = await Promise.allSettled([
      fetchDailyOverviewTodayReview(scopeParams),
      fetchDailyOverviewResearchOverview(scopeParams),
      fetchDailyOverviewReviewReadiness(scopeParams),
    ]);

    if (requestRef.current !== requestId) return;

    const dashboardFetchedAt = new Date().toISOString();
    setTodayReview((current) => {
      if (todayReviewResult.status === 'fulfilled') {
        return { data: todayReviewResult.value, loading: false, error: null, dashboardFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(todayReviewResult.reason, 'Failed to load Today Review summary.') };
    });
    setResearchOverview((current) => {
      if (researchResult.status === 'fulfilled') {
        return { data: researchResult.value, loading: false, error: null, dashboardFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(researchResult.reason, 'Failed to load Research overview summary.') };
    });
    setReviewReadiness((current) => {
      if (readinessResult.status === 'fulfilled') {
        return { data: readinessResult.value, loading: false, error: null, dashboardFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(readinessResult.reason, 'Failed to load review-readiness summary.') };
    });
    setCriticalLoading(false);

    setMarketContext((current) => ({ ...current, loading: true, error: null }));
    setDataQualitySummary((current) => ({ ...current, loading: true, error: null }));
    setLatestSignalRun((current) => ({ ...current, loading: true, error: null }));
    setPipelineStatus((current) => ({ ...current, loading: true, error: null }));

    const [marketContextResult, dataQualityResult, latestSignalRunResult, pipelineStatusResult] = await Promise.allSettled([
      fetchDailyOverviewMarketContext(scopeParams),
      fetchDailyOverviewDataQualitySummary(scopeParams),
      fetchDailyOverviewLatestSignalRun(scopeParams),
      fetchDailyOverviewPipelineStatus(scopeParams),
    ]);

    if (requestRef.current !== requestId) return;

    const deferredFetchedAt = new Date().toISOString();
    setMarketContext((current) => {
      if (marketContextResult.status === 'fulfilled') {
        return { data: marketContextResult.value, loading: false, error: null, dashboardFetchedAt: deferredFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(marketContextResult.reason, 'Failed to load market context summary.') };
    });
    setDataQualitySummary((current) => {
      if (dataQualityResult.status === 'fulfilled') {
        return { data: dataQualityResult.value, loading: false, error: null, dashboardFetchedAt: deferredFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(dataQualityResult.reason, 'Failed to load Data Quality summary.') };
    });
    setLatestSignalRun((current) => {
      if (latestSignalRunResult.status === 'fulfilled') {
        return { data: latestSignalRunResult.value, loading: false, error: null, dashboardFetchedAt: deferredFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(latestSignalRunResult.reason, 'Failed to load latest signal-generation run.') };
    });
    setPipelineStatus((current) => {
      if (pipelineStatusResult.status === 'fulfilled') {
        return { data: pipelineStatusResult.value, loading: false, error: null, dashboardFetchedAt: deferredFetchedAt };
      }
      return { ...current, loading: false, error: toErrorMessage(pipelineStatusResult.reason, 'Failed to load Pipeline status summary.') };
    });

    setDeferredLoading(false);
    setRefreshing(false);
  }, [scope.assetType, scope.region]);

  useEffect(() => {
    setTodayReview(emptySection());
    setResearchOverview(emptySection());
    setReviewReadiness(emptySection());
    setMarketContext(emptySection());
    setDataQualitySummary(emptySection());
    setLatestSignalRun(emptySection());
    setPipelineStatus(emptySection());
    setCriticalLoading(true);
    setDeferredLoading(true);
    setRefreshing(false);
    void runLoad('initial');
  }, [runLoad]);

  const latestDashboardFetchedAt = useMemo(() => {
    return latestTimestamp([
      todayReview.dashboardFetchedAt,
      researchOverview.dashboardFetchedAt,
      reviewReadiness.dashboardFetchedAt,
      marketContext.dashboardFetchedAt,
      dataQualitySummary.dashboardFetchedAt,
      latestSignalRun.dashboardFetchedAt,
      pipelineStatus.dashboardFetchedAt,
    ]);
  }, [
    dataQualitySummary.dashboardFetchedAt,
    latestSignalRun.dashboardFetchedAt,
    marketContext.dashboardFetchedAt,
    pipelineStatus.dashboardFetchedAt,
    researchOverview.dashboardFetchedAt,
    reviewReadiness.dashboardFetchedAt,
    todayReview.dashboardFetchedAt,
  ]);

  const latestSourceTimestamp = useMemo(() => {
    return latestTimestamp([
      todayReview.data?.run?.updatedAt,
      todayReview.data?.run?.finishedAt,
      todayReview.data?.run?.dataThroughDate,
      researchOverview.data?.generatedAt,
      marketContext.data?.updatedAt,
      marketContext.data?.regime?.updatedAt,
      dataQualitySummary.data?.latestEvaluationAt,
      latestSignalRun.data?.completedAt,
      latestSignalRun.data?.startedAt,
      pipelineStatus.data?.generatedAt,
      pipelineStatus.data?.activeRun?.updatedAt,
      pipelineStatus.data?.lastRun?.updatedAt,
    ]);
  }, [
    dataQualitySummary.data?.latestEvaluationAt,
    latestSignalRun.data?.completedAt,
    latestSignalRun.data?.startedAt,
    marketContext.data?.regime?.updatedAt,
    marketContext.data?.updatedAt,
    pipelineStatus.data?.activeRun?.updatedAt,
    pipelineStatus.data?.generatedAt,
    pipelineStatus.data?.lastRun?.updatedAt,
    researchOverview.data?.generatedAt,
    todayReview.data?.run?.dataThroughDate,
    todayReview.data?.run?.finishedAt,
    todayReview.data?.run?.updatedAt,
  ]);

  return {
    scope,
    critical: {
      todayReview,
      researchOverview,
      reviewReadiness,
    },
    deferred: {
      marketContext,
      dataQualitySummary,
      latestSignalRun,
      pipelineStatus,
    },
    criticalLoading,
    deferredLoading,
    refreshing,
    latestDashboardFetchedAt,
    latestSourceTimestamp,
    refresh: () => runLoad('refresh'),
  };
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .map((value) => normalizeTimestamp(value))
    .filter((value): value is string => Boolean(value));

  if (timestamps.length === 0) return null;
  return timestamps.reduce((latest, next) => (new Date(next).getTime() > new Date(latest).getTime() ? next : latest));
}

function normalizeTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : null;
}

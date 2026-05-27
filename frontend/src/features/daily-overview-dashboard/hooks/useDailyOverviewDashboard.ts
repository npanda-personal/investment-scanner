import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  fetchDailyOverviewCalibrationDefaultHorizon,
  fetchDailyOverviewCalibrationSummary,
  fetchDailyOverviewDataQualitySummary,
  fetchDailyOverviewLatestSignalRun,
  fetchDailyOverviewMarketContext,
  fetchDailyOverviewPipelineStatus,
  fetchDailyOverviewResearchOverview,
  fetchDailyOverviewReviewReadiness,
  fetchDailyOverviewTodayReview,
} from '../api/dailyOverviewDashboardApi';
import type { DashboardSectionState, DailyOverviewDashboardState } from '../types';
import type { CalibrationPageSummary } from '@/features/signal-calibration-engine/types';

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
  const calibrationRequestRef = useRef(0);
  const hasResolvedCalibrationDefaultHorizon = useRef(false);

  const [criticalLoading, setCriticalLoading] = useState(true);
  const [deferredLoading, setDeferredLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calibrationHorizon, setCalibrationHorizonState] = useState('20D');

  const [todayReview, setTodayReview] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewTodayReview>>>>(() => emptySection());
  const [researchOverview, setResearchOverview] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewResearchOverview>>>>(() => emptySection());
  const [reviewReadiness, setReviewReadiness] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewReviewReadiness>>>>(() => emptySection());
  const [marketContext, setMarketContext] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewMarketContext>>>>(() => emptySection());
  const [dataQualitySummary, setDataQualitySummary] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewDataQualitySummary>>>>(() => emptySection());
  const [latestSignalRun, setLatestSignalRun] = useState<DashboardSectionState<NonNullable<Awaited<ReturnType<typeof fetchDailyOverviewLatestSignalRun>>>>>(() => emptySection());
  const [pipelineStatus, setPipelineStatus] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewPipelineStatus>>>>(() => emptySection());
  const [calibrationSummary, setCalibrationSummary] = useState<DashboardSectionState<CalibrationPageSummary>>(() => emptySection());

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

    void fetchDailyOverviewTodayReview(scopeParams)
      .then((value) => {
        if (requestRef.current !== requestId) return;
        setTodayReview({ data: value, loading: false, error: null, dashboardFetchedAt: new Date().toISOString() });
      })
      .catch((error) => {
        if (requestRef.current !== requestId) return;
        setTodayReview((current) => ({ ...current, loading: false, error: toErrorMessage(error, 'Failed to load Today Review summary.') }));
      });
    void fetchDailyOverviewResearchOverview(scopeParams)
      .then((value) => {
        if (requestRef.current !== requestId) return;
        setResearchOverview({ data: value, loading: false, error: null, dashboardFetchedAt: new Date().toISOString() });
      })
      .catch((error) => {
        if (requestRef.current !== requestId) return;
        setResearchOverview((current) => ({ ...current, loading: false, error: toErrorMessage(error, 'Failed to load Research overview summary.') }));
      });
    void fetchDailyOverviewReviewReadiness(scopeParams)
      .then((value) => {
        if (requestRef.current !== requestId) return;
        setReviewReadiness({ data: value, loading: false, error: null, dashboardFetchedAt: new Date().toISOString() });
      })
      .catch((error) => {
        if (requestRef.current !== requestId) return;
        setReviewReadiness((current) => ({ ...current, loading: false, error: toErrorMessage(error, 'Failed to load review-readiness summary.') }));
      });
    setCriticalLoading(false);

    setMarketContext((current) => ({ ...current, loading: true, error: null }));
    setDataQualitySummary((current) => ({ ...current, loading: true, error: null }));
    setLatestSignalRun((current) => ({ ...current, loading: true, error: null }));
    setPipelineStatus((current) => ({ ...current, loading: true, error: null }));
    setCalibrationSummary((current) => ({ ...current, loading: true, error: null }));

    let effectiveCalibrationHorizon = calibrationHorizon;
    if (!hasResolvedCalibrationDefaultHorizon.current) {
      try {
        const defaultHorizon = await fetchDailyOverviewCalibrationDefaultHorizon();
        hasResolvedCalibrationDefaultHorizon.current = true;
        effectiveCalibrationHorizon = defaultHorizon;
        setCalibrationHorizonState(defaultHorizon);
      } catch {
        hasResolvedCalibrationDefaultHorizon.current = true;
      }
    }

    const calibrationRequestId = calibrationRequestRef.current + 1;
    calibrationRequestRef.current = calibrationRequestId;

    const [marketContextResult, dataQualityResult, latestSignalRunResult, pipelineStatusResult, calibrationSummaryResult] = await Promise.allSettled([
      fetchDailyOverviewMarketContext(scopeParams),
      fetchDailyOverviewDataQualitySummary(scopeParams),
      fetchDailyOverviewLatestSignalRun(scopeParams),
      fetchDailyOverviewPipelineStatus(scopeParams),
      fetchDailyOverviewCalibrationSummary({ ...scopeParams, horizon: effectiveCalibrationHorizon }),
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
    if (calibrationRequestRef.current === calibrationRequestId) {
      if (calibrationSummaryResult.status === 'fulfilled') {
        setCalibrationSummary({
          data: calibrationSummaryResult.value,
          loading: false,
          error: null,
          dashboardFetchedAt: deferredFetchedAt,
        });
      } else {
        setCalibrationSummary({
          data: buildUnavailableCalibrationSummary(scope.region, scope.assetType, effectiveCalibrationHorizon, toErrorMessage(calibrationSummaryResult.reason, 'Calibration evidence summary is unavailable for this scope and horizon.')),
          loading: false,
          error: toErrorMessage(calibrationSummaryResult.reason, 'Calibration evidence summary is unavailable for this scope and horizon.'),
          dashboardFetchedAt: deferredFetchedAt,
        });
      }
    }

    setDeferredLoading(false);
    setRefreshing(false);
  }, [calibrationHorizon, scope.assetType, scope.region]);

  useEffect(() => {
    setTodayReview(emptySection());
    setResearchOverview(emptySection());
    setReviewReadiness(emptySection());
    setMarketContext(emptySection());
    setDataQualitySummary(emptySection());
    setLatestSignalRun(emptySection());
    setPipelineStatus(emptySection());
    setCalibrationSummary(emptySection());
    setCriticalLoading(true);
    setDeferredLoading(true);
    setRefreshing(false);
    void runLoad('initial');
  }, [runLoad]);

  const setCalibrationHorizon = useCallback(async (horizon: string) => {
    if (!horizon || calibrationHorizon === horizon) return;
    setCalibrationHorizonState(horizon);
    const requestId = calibrationRequestRef.current + 1;
    calibrationRequestRef.current = requestId;
    setCalibrationSummary((current) => ({ ...current, loading: true, error: null }));
    const scopeParams = { region: scope.region, assetType: scope.assetType };

    try {
      const summary = await fetchDailyOverviewCalibrationSummary({ ...scopeParams, horizon });
      if (calibrationRequestRef.current !== requestId) return;
      setCalibrationSummary({
        data: summary,
        loading: false,
        error: null,
        dashboardFetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (calibrationRequestRef.current !== requestId) return;
      const errorMessage = toErrorMessage(error, 'Calibration evidence summary is unavailable for this scope and horizon.');
      setCalibrationSummary({
        data: buildUnavailableCalibrationSummary(scope.region, scope.assetType, horizon, errorMessage),
        loading: false,
        error: errorMessage,
        dashboardFetchedAt: new Date().toISOString(),
      });
    }
  }, [calibrationHorizon, scope.assetType, scope.region]);

  const latestDashboardFetchedAt = useMemo(() => {
    return latestTimestamp([
      todayReview.dashboardFetchedAt,
      researchOverview.dashboardFetchedAt,
      reviewReadiness.dashboardFetchedAt,
      marketContext.dashboardFetchedAt,
      dataQualitySummary.dashboardFetchedAt,
      latestSignalRun.dashboardFetchedAt,
      pipelineStatus.dashboardFetchedAt,
      calibrationSummary.dashboardFetchedAt,
    ]);
  }, [
    calibrationSummary.dashboardFetchedAt,
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
      calibrationSummary.data?.calibrationEvidence?.evidenceBasis?.latestMeasurablePriceDate,
      calibrationSummary.data?.calibrationEvidence?.evidenceBasis?.signalQualityGeneratedAt,
    ]);
  }, [
    calibrationSummary.data?.calibrationEvidence?.evidenceBasis?.latestMeasurablePriceDate,
    calibrationSummary.data?.calibrationEvidence?.evidenceBasis?.signalQualityGeneratedAt,
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
      calibrationSummary,
    },
    criticalLoading,
    deferredLoading,
    refreshing,
    latestDashboardFetchedAt,
    latestSourceTimestamp,
    calibrationHorizon,
    setCalibrationHorizon,
    refresh: () => runLoad('refresh'),
  };
}

function buildUnavailableCalibrationSummary(region: string, assetType: string, horizon: string, reasonSummary: string): CalibrationPageSummary {
  return {
    scope: { region, assetType, horizon },
    itemsOnPage: 0,
    totalScopedRows: 0,
    calibrationReadiness: {
      status: 'UNAVAILABLE',
      confidenceTier: 'INSUFFICIENT_SAMPLE',
      calibrationApplied: false,
      adjustmentCapApplied: 0,
      downstreamInfluence: 'NONE',
      authoritativeScore: 'NO_SCORE',
      reasons: [reasonSummary],
      blockers: [reasonSummary],
    },
    calibrationEvidence: {
      horizon,
      overallEvaluatedSamples: 0,
      groupEvaluatedSamples: 0,
      minimumOverallSamples: 0,
      minimumGroupSamples: 0,
      requiredOverallSamples: 0,
      requiredGroupSamples: 0,
      horizonAvailability: {},
      dataStatus: 'MISSING',
      evidenceStatus: 'MISSING',
      evidenceReasons: [reasonSummary],
      evidenceWarnings: [reasonSummary],
      warnings: [reasonSummary],
      evidenceBasis: {
        status: 'MISSING_SIGNAL_QUALITY_EVIDENCE',
        signalQualityGeneratedAt: null,
        latestMeasurablePriceDate: null,
        nextEvaluableDate: null,
        reasonSummary,
      },
    },
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

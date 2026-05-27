import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMarketScope } from '@/contexts/MarketScopeContext';
import {
  fetchDailyOverviewMarketContext,
  fetchDailyOverviewMarketMovers,
  fetchDailyOverviewTodayReview,
} from '../api/dailyOverviewDashboardApi';
import type { DashboardSectionState, DailyOverviewDashboardState, MarketMoverRange } from '../types';

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
  const [marketMovers, setMarketMovers] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewMarketMovers>>>>(() => emptySection());
  const [marketContext, setMarketContext] = useState<DashboardSectionState<Awaited<ReturnType<typeof fetchDailyOverviewMarketContext>>>>(() => emptySection());

  const runLoad = useCallback(async (mode: 'initial' | 'refresh') => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    if (mode === 'refresh') setRefreshing(true);
    setCriticalLoading(true);
    setDeferredLoading(true);

    setTodayReview((current) => ({ ...current, loading: true, error: null }));
    setMarketMovers((current) => ({ ...current, loading: true, error: null }));
    setMarketContext((current) => ({ ...current, loading: true, error: null }));

    const scopeParams = { region: scope.region, assetType: scope.assetType };
    const [todayReviewResult, marketMoversResult] = await Promise.allSettled([
      fetchDailyOverviewTodayReview(scopeParams),
      fetchDailyOverviewMarketMovers({ ...scopeParams, range: '1D' }),
    ]);

    if (requestRef.current !== requestId) return;
    const criticalFetchedAt = new Date().toISOString();
    if (todayReviewResult.status === 'fulfilled') {
      setTodayReview({ data: todayReviewResult.value, loading: false, error: null, dashboardFetchedAt: criticalFetchedAt });
    } else {
      setTodayReview((current) => ({ ...current, loading: false, error: toErrorMessage(todayReviewResult.reason, 'Failed to load Today Review summary.') }));
    }
    if (marketMoversResult.status === 'fulfilled') {
      setMarketMovers({ data: marketMoversResult.value, loading: false, error: null, dashboardFetchedAt: criticalFetchedAt });
    } else {
      setMarketMovers((current) => ({ ...current, loading: false, error: toErrorMessage(marketMoversResult.reason, 'Failed to load market movers.') }));
    }
    setCriticalLoading(false);

    const marketContextResult = await Promise.allSettled([
      fetchDailyOverviewMarketContext(scopeParams),
    ]);
    if (requestRef.current !== requestId) return;
    const deferredFetchedAt = new Date().toISOString();
    const [marketContextState] = marketContextResult;
    if (marketContextState.status === 'fulfilled') {
      setMarketContext({ data: marketContextState.value, loading: false, error: null, dashboardFetchedAt: deferredFetchedAt });
    } else {
      setMarketContext((current) => ({ ...current, loading: false, error: toErrorMessage(marketContextState.reason, 'Failed to load market context summary.') }));
    }
    setDeferredLoading(false);
    setRefreshing(false);
  }, [scope.assetType, scope.region]);

  const loadMarketMoversRange = useCallback(async (range: MarketMoverRange) => {
    const existing = marketMovers.data?.ranges.some((item) => item.range === range);
    if (existing || marketMovers.loading) return;
    setMarketMovers((current) => ({ ...current, loading: true, error: null }));
    const scopeParams = { region: scope.region, assetType: scope.assetType };
    try {
      const next = await fetchDailyOverviewMarketMovers({ ...scopeParams, range });
      setMarketMovers((current) => ({
        data: {
          scope: next.scope,
          generatedAt: next.generatedAt,
          ranges: [
            ...(current.data?.ranges.filter((item) => item.range !== range) ?? []),
            ...next.ranges,
          ],
        },
        loading: false,
        error: null,
        dashboardFetchedAt: new Date().toISOString(),
      }));
    } catch (error) {
      setMarketMovers((current) => ({
        ...current,
        loading: false,
        error: toErrorMessage(error, `Failed to load ${range} market movers.`),
      }));
    }
  }, [marketMovers.data?.ranges, marketMovers.loading, scope.assetType, scope.region]);

  useEffect(() => {
    setTodayReview(emptySection());
    setMarketMovers(emptySection());
    setMarketContext(emptySection());
    setCriticalLoading(true);
    setDeferredLoading(true);
    setRefreshing(false);
    void runLoad('initial');
  }, [runLoad]);

  const latestDashboardFetchedAt = useMemo(() => latestTimestamp([
    todayReview.dashboardFetchedAt,
    marketMovers.dashboardFetchedAt,
    marketContext.dashboardFetchedAt,
  ]), [
    marketContext.dashboardFetchedAt,
    marketMovers.dashboardFetchedAt,
    todayReview.dashboardFetchedAt,
  ]);

  const latestSourceTimestamp = useMemo(() => latestTimestamp([
    todayReview.data?.run?.updatedAt,
    todayReview.data?.run?.finishedAt,
    todayReview.data?.run?.dataThroughDate,
    marketMovers.data?.generatedAt,
    marketContext.data?.updatedAt,
    marketContext.data?.regime?.updatedAt,
  ]), [
    marketContext.data?.regime?.updatedAt,
    marketContext.data?.updatedAt,
    marketMovers.data?.generatedAt,
    todayReview.data?.run?.dataThroughDate,
    todayReview.data?.run?.finishedAt,
    todayReview.data?.run?.updatedAt,
  ]);

  return {
    scope,
    critical: {
      todayReview,
      marketMovers,
    },
    deferred: {
      marketContext,
    },
    criticalLoading,
    deferredLoading,
    refreshing,
    latestDashboardFetchedAt,
    latestSourceTimestamp,
    loadMarketMoversRange,
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

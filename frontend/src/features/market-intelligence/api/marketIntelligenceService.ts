import { fetchDailyOverviewMarketMovers, fetchDailyOverviewTodayReview } from '@/features/daily-overview-dashboard/api/dailyOverviewDashboardApi';
import { fetchPersistedMarketContextSummary, type MarketContextSummary } from '@/features/market-context-intelligence';
import { fetchInstruments, fetchMarketDataUniverseHealth } from '@/features/market-data-foundation';
import type { MarketScope } from '@/contexts/MarketScopeContext';
import type { MarketIntelligenceSnapshot, SnapshotResource } from '../types';

const SOURCE_URLS = {
  fiiDii: 'https://www.nseindia.com/reports/fii-dii/',
  advanceDecline: 'https://www.nseindia.com/market-data/advance',
  indices: 'https://www.nseindia.com/nse-indices',
  dataSharing: 'https://nsearchives.nseindia.com/web/sites/default/files/inline-files/Data%20list%20under%20NSE%20Data%20Sharing%20Policy%20for%20Research%20and%20Analysis_20250728.pdf',
} as const;

export async function fetchMarketIntelligenceSnapshot(scope: MarketScope): Promise<MarketIntelligenceSnapshot> {
  const scopeParams = { region: scope.region, assetType: scope.assetType };
  const [
    todayReview,
    persistedMarketContext,
    marketMovers,
    universeHealth,
    indices,
    fnoUnderlyings,
    mapInstruments,
  ] = await Promise.allSettled([
    fetchDailyOverviewTodayReview(scopeParams),
    fetchPersistedMarketContextSummary({ region: scope.region }),
    fetchDailyOverviewMarketMovers({ ...scopeParams, range: '1D' }),
    fetchMarketDataUniverseHealth(scopeParams),
    fetchInstruments({ region: scope.region, assetType: 'INDEX', pageSize: 75 }),
    fetchInstruments({ ...scopeParams, derivativesEligible: true, pageSize: 75 }),
    fetchInstruments({ ...scopeParams, pageSize: 120 }),
  ]);

  const fetchedAt = new Date().toISOString();
  return {
    scope,
    fetchedAt,
    marketContext: settlePersistedMarketContext(persistedMarketContext),
    persistedMarketContext: settle(persistedMarketContext, 'Market context evidence', valueTimestamp(persistedMarketContext, (value) => value.asOf), undefined),
    todayReview: settle(todayReview, 'Today Review latest snapshot', valueTimestamp(todayReview, (value) => value.run?.updatedAt || value.run?.finishedAt || value.run?.dataThroughDate || null)),
    marketMovers: settle(marketMovers, 'Market Data Foundation movers', valueTimestamp(marketMovers, (value) => value.generatedAt)),
    universeHealth: settle(universeHealth, 'Market Data Foundation universe health', valueTimestamp(universeHealth, (value) => value.generatedAt)),
    indices: settle(indices, 'NSE index catalog snapshot', null, SOURCE_URLS.indices),
    fnoUnderlyings: settle(fnoUnderlyings, 'F&O underlying catalog flag', null, SOURCE_URLS.dataSharing),
    mapInstruments: settle(mapInstruments, 'Instrument catalog evidence', null),
  };
}

function settlePersistedMarketContext(result: PromiseSettledResult<Awaited<ReturnType<typeof fetchPersistedMarketContextSummary>>>): SnapshotResource<MarketContextSummary> {
  if (result.status === 'fulfilled' && result.value.status === 'ready' && result.value.summary) {
    return {
      value: result.value.summary,
      status: 'ready',
      error: null,
      source: 'Market context evidence',
      asOf: result.value.asOf,
    };
  }

  if (result.status === 'fulfilled') {
    return {
      value: null,
      status: 'missing',
      error: result.value.message || 'Saved market context is not available yet.',
      source: 'Market context evidence',
      asOf: result.value.asOf,
    };
  }

  return {
    value: null,
    status: 'missing',
    error: toErrorMessage(result.reason),
    source: 'Market context evidence',
    asOf: null,
  };
}

function settle<T>(
  result: PromiseSettledResult<T>,
  source: string,
  asOf: string | null,
  sourceUrl?: string,
): SnapshotResource<T> {
  if (result.status === 'fulfilled') {
    return {
      value: result.value,
      status: 'ready',
      error: null,
      source,
      sourceUrl,
      asOf,
    };
  }

  return {
    value: null,
    status: 'missing',
    error: toErrorMessage(result.reason),
    source,
    sourceUrl,
    asOf: null,
  };
}

function valueTimestamp<T>(result: PromiseSettledResult<T>, picker: (value: T) => string | null | undefined) {
  if (result.status !== 'fulfilled') return null;
  return normalizeTimestamp(picker(result.value));
}

function normalizeTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? value : null;
}

function toErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
    return candidate.response?.data?.error || candidate.response?.data?.message || candidate.message || 'Snapshot unavailable.';
  }
  return 'Snapshot unavailable.';
}

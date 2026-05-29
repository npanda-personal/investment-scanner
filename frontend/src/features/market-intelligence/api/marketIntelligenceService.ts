import { fetchDailyOverviewMarketMovers, fetchDailyOverviewTodayReview } from '@/features/daily-overview-dashboard/api/dailyOverviewDashboardApi';
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
    marketMovers,
    universeHealth,
    indices,
    fnoUnderlyings,
    mapInstruments,
  ] = await Promise.allSettled([
    fetchDailyOverviewTodayReview(scopeParams),
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
    marketContext: missingPersistedOnly('Market Context Intelligence persisted-only snapshot', 'Persisted-only market context endpoint is not available yet. Existing summary reads may materialize data and are intentionally not called from trader pages.'),
    todayReview: settle(todayReview, 'Today Review latest snapshot', valueTimestamp(todayReview, (value) => value.run?.updatedAt || value.run?.finishedAt || value.run?.dataThroughDate || null)),
    marketMovers: settle(marketMovers, 'Market Data Foundation movers', valueTimestamp(marketMovers, (value) => value.generatedAt)),
    universeHealth: settle(universeHealth, 'Market Data Foundation universe health', valueTimestamp(universeHealth, (value) => value.generatedAt)),
    indices: settle(indices, 'NSE index catalog snapshot', null, SOURCE_URLS.indices),
    fnoUnderlyings: settle(fnoUnderlyings, 'F&O underlying catalog flag', null, SOURCE_URLS.dataSharing),
    mapInstruments: settle(mapInstruments, 'Instrument catalog read model', null),
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

function missingPersistedOnly<T>(source: string, reason: string): SnapshotResource<T> {
  return {
    value: null,
    status: 'missing',
    error: reason,
    source,
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

import type { CorporateAction, HistoricalPrice } from '../market-data-foundation.types';
import type { MarketRegion } from '../../../shared/utils/market-scope';
import { normalizeMarketRegion } from '../../../shared/utils/market-scope';
import { fetchYahooHistory, fetchYahooHistoryWithEvents } from './market-data-foundation.yahoo-eod-provider';

/**
 * Per-region EOD provider registry.
 *
 * The legacy equity provider port is globally disabled and the NSE/BSE path is
 * strictly exchange-file based.  This registry is the single place that lifts
 * that GLOBAL disable to a PER-REGION gate: US/EU equities are served by the
 * FREE keyless Yahoo chart API, while IN stays file-based and GLOBAL (crypto)
 * keeps its own isolated provider.  No paid providers are ever wired here.
 *
 * Usage (ingestion/scheduler):
 *   const provider = resolveEodProvider('US');
 *   if (provider) bars = await provider.fetchHistory(symbol, { exchange, startTime });
 */

export interface EodProviderFetchOptions {
  exchange?: string | null;
  startTime?: Date | null;
  throttleMs?: number;
}

export interface MarketDataEodProvider {
  /** Stable provider id for logging/source tagging. */
  readonly id: string;
  readonly region: MarketRegion;
  fetchHistory(symbol: string, options?: EodProviderFetchOptions): Promise<HistoricalPrice[]>;
  /**
   * Fetch prices AND corporate-action events in a single request, when the
   * provider exposes them.  Optional so non-event providers stay simple.
   */
  fetchHistoryWithEvents?(
    symbol: string,
    options?: EodProviderFetchOptions
  ): Promise<{ bars: HistoricalPrice[]; actions: CorporateAction[] }>;
}

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  return String(raw).toLowerCase() !== 'false';
}

/**
 * Whether the FREE region provider is enabled for a region.
 *  - US: default ON  (MARKET_DATA_US_PROVIDER_ENABLED)
 *  - EU: default OFF until its rollout phase (MARKET_DATA_EU_PROVIDER_ENABLED)
 *  - IN / GLOBAL: never served here (file-based / crypto-isolated).
 */
export function isRegionProviderEnabled(region?: string | null): boolean {
  const normalized = normalizeMarketRegion(region);
  switch (normalized) {
    case 'US':
      return envFlag('MARKET_DATA_US_PROVIDER_ENABLED', true);
    case 'EU':
      return envFlag('MARKET_DATA_EU_PROVIDER_ENABLED', false);
    default:
      return false;
  }
}

function makeYahooProvider(region: MarketRegion): MarketDataEodProvider {
  return {
    id: 'YAHOO_EOD',
    region,
    fetchHistory: (symbol, options = {}) =>
      fetchYahooHistory(symbol, region, {
        exchange: options.exchange,
        startTime: options.startTime,
        throttleMs: options.throttleMs,
      }),
    fetchHistoryWithEvents: (symbol, options = {}) =>
      fetchYahooHistoryWithEvents(symbol, region, {
        exchange: options.exchange,
        startTime: options.startTime,
        throttleMs: options.throttleMs,
      }),
  };
}

/**
 * Resolve the FREE EOD provider for a region, or null when the region is served
 * by another path (IN file-based, GLOBAL crypto-isolated) or its provider is
 * disabled.  Yahoo's keyless chart API covers both US and EU equities/indices.
 */
export function resolveEodProvider(region?: string | null): MarketDataEodProvider | null {
  const normalized = normalizeMarketRegion(region);
  if ((normalized === 'US' || normalized === 'EU') && isRegionProviderEnabled(normalized)) {
    return makeYahooProvider(normalized);
  }
  return null;
}

/** True when a region's EOD prices should flow through the free region provider path. */
export function regionUsesRegionProviderPath(region?: string | null): boolean {
  return resolveEodProvider(region) !== null;
}

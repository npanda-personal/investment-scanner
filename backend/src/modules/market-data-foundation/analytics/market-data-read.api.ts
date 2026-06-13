/**
 * MarketDataReadApi
 *
 * The read-only contract for MarketDataFoundationService that external modules
 * actually consume.  Derived from a grep survey of all call sites outside
 * backend/src/modules/market-data-foundation/ (see §4.5 of docs/dataflow-proposed.md).
 *
 * Rules:
 * - Only READ methods — no ingest, sync, repair, backfill, import, or write.
 * - Signatures match the concrete implementation exactly (the interface documents
 *   reality; it does not redesign it).
 * - MarketDataFoundationService implements this interface (compile-checked below).
 *
 * Watermark gate (MARKET_DATA_READ_WATERMARK_GATE=1|true, DEFAULT OFF):
 * When enabled, price reads for dates newer than the latest FINAL_CONFIRMED
 * market_data_sync_states watermark for (region, assetType) are filtered to the
 * watermark date so consumers never observe mid-ingest rows.  Off by default —
 * all callers see identical behaviour unless the flag is set.
 */

import type {
  DailyRefreshEligibilityResult,
  PaginationOptions,
  ReviewReadinessSummary,
  TrustedReviewUniverseHealth,
  TrustedReviewUniverseInstrument,
} from '../market-data-foundation.types';

// ---------------------------------------------------------------------------
// MarketDataReadApi — the interface
// ---------------------------------------------------------------------------

export interface MarketDataReadApi {
  // -------------------------------------------------------------------------
  // Instrument catalogue reads
  // -------------------------------------------------------------------------

  /** List instruments with pagination, filtering, and universe-readiness annotation. */
  listInstruments(options?: Partial<PaginationOptions>): Promise<{
    instruments: any[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>;

  /** Get a single instrument by id. Returns null when not found. */
  getInstrument(
    id: string,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<any | null>;

  /** Bulk instrument lookup by a list of ids. Returns partial results when some ids are absent. */
  getInstrumentsByIds(ids: string[]): Promise<any[]>;

  /** Full-text asset search (name / symbol) limited to the given scope. */
  searchAssets(
    query: string,
    options?: Pick<PaginationOptions, 'region' | 'assetType' | 'instrumentSegment'>,
  ): Promise<any[]>;

  // -------------------------------------------------------------------------
  // Price reads (high-traffic — subject to watermark gate when flag is on)
  // -------------------------------------------------------------------------

  /**
   * Price history for a single instrument.
   * Watermark gate: filters rows to the FINAL_CONFIRMED watermark date when the
   * env flag MARKET_DATA_READ_WATERMARK_GATE is '1' or 'true'.
   */
  listPricesByInstrumentId(
    instrumentId: string,
    limit?: number,
    startDate?: Date,
    endDate?: Date,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<any | null>;

  /**
   * Latest single price for one instrument.
   * Watermark gate: applied when flag is on.
   */
  latestPriceByInstrumentId(
    instrumentId: string,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<any | null>;

  /**
   * Bulk latest prices by symbol list.
   * Watermark gate: applied when flag is on.
   */
  getLatestPricesBySymbols(symbols: string[]): Promise<
    Array<{
      symbol: string;
      date: Date;
      close: number;
      adjusted_close: number;
      timestamp: Date;
    }>
  >;

  /**
   * Bulk recent price windows keyed by instrumentId.
   * Watermark gate: applied when flag is on.
   */
  listRecentPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    limit?: number,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
    endDate?: Date,
  ): Promise<Map<string, any[]>>;

  // -------------------------------------------------------------------------
  // Fundamentals reads
  // -------------------------------------------------------------------------

  /**
   * Stored fundamentals for a single instrument (persisted-read; no live provider fetch).
   */
  storedFundamentalsByInstrumentId(
    instrumentId: string,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<any | null>;

  /**
   * Bulk stored fundamentals keyed by instrumentId.
   * Optional asOf date for point-in-time queries (e.g. backtesting).
   */
  storedFundamentalsByInstrumentIds(
    instrumentIds: string[],
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
    asOf?: Date,
  ): Promise<Map<string, any>>;

  // -------------------------------------------------------------------------
  // Corporate actions reads
  // -------------------------------------------------------------------------

  /** Stored corporate actions for a single instrument (persisted-read). */
  storedCorporateActionsByInstrumentId(
    instrumentId: string,
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<any | null>;

  // -------------------------------------------------------------------------
  // Trusted review universe reads
  // -------------------------------------------------------------------------

  /**
   * Paginated list of instruments in the trusted review universe for a scope.
   * Heavy: reuses an in-process snapshot cache (60 s TTL) to avoid re-evaluating
   * the full 2900+ stock universe on each page call.
   */
  listTrustedReviewUniverseInstruments(
    options?: Pick<PaginationOptions, 'region' | 'assetType'> & {
      limit?: number;
      offset?: number;
      now?: Date;
    },
  ): Promise<TrustedReviewUniverseInstrument[]>;

  /** Aggregated readiness summary for the trusted review universe. */
  reviewReadinessSummary(
    options?: Pick<PaginationOptions, 'region' | 'assetType'> & {
      now?: Date;
      recompute?: boolean;
    },
  ): Promise<ReviewReadinessSummary>;

  /** Full health report for the trusted review universe. */
  trustedReviewUniverseHealth(
    options?: Pick<PaginationOptions, 'region' | 'assetType'> & { now?: Date },
  ): Promise<TrustedReviewUniverseHealth>;

  // -------------------------------------------------------------------------
  // Pipeline eligibility / candle staleness reads
  // -------------------------------------------------------------------------

  /**
   * List instrument ids whose price data covers the supplied dataThroughDate,
   * used by the pipeline to determine the eligible set for a trading date.
   */
  listDailyRefreshEligibleInstrumentIds(input: {
    region: string;
    assetType: string;
    dataThroughDate: string;
    limit?: number;
  }): Promise<DailyRefreshEligibilityResult>;

  /**
   * Latest stored candle metadata for a region/assetType: latest trading date,
   * FINAL_CONFIRMED status, and the computed tradingDate for now.
   * Used by today-trade-review and trade-plan-risk-engine for freshness proofs.
   */
  latestStoredCandleInfo(
    region: string,
    assetType?: string,
    now?: Date,
  ): Promise<{
    latestTradingDate: string | null;
    finalConfirmed: boolean;
    syncState: any | null;
    tradingDate: string | null;
  }>;

  // -------------------------------------------------------------------------
  // FX rates
  // -------------------------------------------------------------------------

  /** All stored FX rates. */
  listFxRates(): Promise<{
    source: string;
    ingestion_timestamp: string | null;
    last_updated_timestamp: string | null;
    data_status: string;
    rates: any[];
  }>;

  /** Single FX rate by pair (e.g. 'USD/INR'). Returns null when absent. */
  getFxRate(pair: string): Promise<any | null>;

  // -------------------------------------------------------------------------
  // Crypto reads
  // -------------------------------------------------------------------------

  /** List active crypto assets. */
  listCryptoAssets(options?: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;

  /** Ascending price history for a crypto symbol. */
  listCryptoPriceHistory(symbol: string, limit?: number): Promise<any[]>;

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  /** Module health check — instrument count + latest data timestamp. */
  health(
    options?: Pick<PaginationOptions, 'region' | 'assetType'>,
  ): Promise<{
    status: string;
    module: string;
    instrumentCount: number;
    latestDataTimestamp: string | null;
    source: string;
    ingestion_timestamp: string;
    last_updated_timestamp: string | null;
    data_status: string;
    timestamp: string;
    region: string;
    assetType: string;
  }>;
}

// ---------------------------------------------------------------------------
// Watermark gate helper
// ---------------------------------------------------------------------------

/**
 * Whether the watermark gate is enabled (flag is '1' or 'true').
 * Default OFF — behaviour unchanged when the flag is absent.
 */
export function isWatermarkGateEnabled(): boolean {
  const v = process.env.MARKET_DATA_READ_WATERMARK_GATE;
  return v === '1' || v === 'true';
}

/** In-process watermark cache entry (60 s TTL per region+assetType). */
interface WatermarkCacheEntry {
  /** Latest FINAL_CONFIRMED watermark date ('YYYY-MM-DD') or null if none found. */
  watermarkDate: string | null;
  expiresAt: number;
}

const watermarkCache = new Map<string, WatermarkCacheEntry>();
const WATERMARK_CACHE_TTL_MS = 60_000;

/**
 * Returns the latest FINAL_CONFIRMED watermark trading date for the given
 * (region, assetType) from `market_data_sync_states`, cached for 60 s.
 *
 * When no FINAL_CONFIRMED row exists, returns null (gate becomes a no-op so
 * callers always see all available data in degraded scenarios).
 *
 * @param repository - The MarketDataFoundationRepository instance (typed as any
 *   to avoid a circular import — the concrete repo passes the prisma client).
 * @param region     - Market region, e.g. 'IN'.
 * @param assetType  - Asset type, e.g. 'STOCK'.
 */
export async function getWatermarkDate(
  repository: { prisma: any },
  region: string,
  assetType: string,
): Promise<string | null> {
  const key = `${region}:${assetType}`;
  const cached = watermarkCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.watermarkDate;
  }

  let watermarkDate: string | null = null;
  try {
    // Query market_data_sync_states for the latest FINAL_CONFIRMED row for this scope.
    const row = await repository.prisma.marketDataSyncState.findFirst({
      where: {
        region,
        assetType,
        status: 'FINAL_CONFIRMED',
        scopeType: 'CATALOG',
      },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true },
    });
    watermarkDate = row?.tradingDate
      ? (row.tradingDate instanceof Date
        ? row.tradingDate.toISOString().slice(0, 10)
        : String(row.tradingDate).slice(0, 10))
      : null;
  } catch {
    // Best-effort: on any DB error, disable the gate (return null = no-op).
    watermarkDate = null;
  }

  watermarkCache.set(key, { watermarkDate, expiresAt: Date.now() + WATERMARK_CACHE_TTL_MS });
  return watermarkDate;
}

/** Evict the watermark cache for testing or after a sync-state change. */
export function evictWatermarkCache(region?: string, assetType?: string): void {
  if (region && assetType) {
    watermarkCache.delete(`${region}:${assetType}`);
  } else {
    watermarkCache.clear();
  }
}

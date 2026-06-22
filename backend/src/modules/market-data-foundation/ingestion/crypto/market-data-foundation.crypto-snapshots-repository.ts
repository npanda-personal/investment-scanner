import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../../../db/prisma';

/**
 * Crypto snapshot repository — owns the persisted derived crypto_* snapshot tables
 * (crypto_fundamental_snapshots, crypto_futures_snapshots, crypto_daily_metric_snapshots).
 *
 * Prisma-only: every write is an idempotent upsert keyed by the model's @@unique
 * ([instrumentId, snapshotDate]); every read is a PURE select + filter + order with
 * NO computation (all metrics are computed upstream by the metrics service and stored
 * here). This is the single read source for the crypto signal board + instrument
 * workspace, so the frontend does zero runtime calculation.
 *
 * Uses the SHARED PrismaClient singleton and only touches crypto_* tables.
 */

// ── Upsert input rows (symbol-keyed; instrumentId resolved here by symbol) ────

export interface CryptoFundamentalSnapshotRow {
  symbol: string;
  defillamaSlug?: string | null;
  category?: string | null;
  chains?: string[] | null;
  tvlUsd?: number | null;
  tvlChange1dPct?: number | null;
  tvlChange7dPct?: number | null;
  fees24hUsd?: number | null;
  fees7dUsd?: number | null;
  revenue24hUsd?: number | null;
  revenue30dUsd?: number | null;
  annualizedRevenueUsd?: number | null;
  coverageStatus?: 'FULL' | 'PARTIAL' | 'NONE';
}

export interface CryptoFuturesSnapshotRow {
  symbol: string;
  fundingRatePct?: number | null;
  openInterestUsd?: number | null;
  longShortRatioGlobal?: number | null;
  longAccountPct?: number | null;
  shortAccountPct?: number | null;
  topTraderLongShortRatio?: number | null;
  topTraderPositionRatio?: number | null;
  takerBuySellRatio?: number | null;
}

export interface CryptoDailyMetricSnapshotRow {
  symbol: string;
  name?: string | null;
  snapshotDate: Date;
  dataThroughDate?: Date | null;
  price?: number | null;
  marketCap?: number | null;
  rank?: number | null;
  signalScore?: number | null;
  signalDirection?: string | null;
  signalConfidence?: string | null;
  volumeSpike?: boolean;
  pctChange1d?: number | null;
  pctChange7d?: number | null;
  pctChange30d?: number | null;
  distanceFromAthPct?: number | null;
  near52wHigh?: boolean;
  near52wLow?: boolean;
  rsi14?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHist?: number | null;
  bbPercentB?: number | null;
  sma50?: number | null;
  sma200?: number | null;
  crossState?: string | null;
  rsVsBtcPct?: number | null;
  tvlUsd?: number | null;
  tvlChange7dPct?: number | null;
  fundingRatePct?: number | null;
  openInterestUsd?: number | null;
  quoteVolume24h?: number | null;
  calculationVersion?: string;
}

export interface CryptoDailyMetricBoardOptions {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  direction?: string; // signalDirection filter (BULLISH/NEUTRAL/BEARISH)
  minScore?: number;
  minConfidence?: string; // HIGH/MEDIUM/LOW
  volumeSpikeOnly?: boolean;
  near52wHigh?: boolean;
  goldenCrossOnly?: boolean;
  limit?: number;
}

/** Whitelisted sortable columns → actual model fields (prevents arbitrary order-by). */
const BOARD_SORT_COLUMNS: Record<string, string> = {
  marketCap: 'marketCap',
  rank: 'rank',
  signalScore: 'signalScore',
  pctChange1d: 'pctChange1d',
  pctChange7d: 'pctChange7d',
  volumeSpike: 'volumeSpike',
  rsi14: 'rsi14',
  distanceFromAthPct: 'distanceFromAthPct',
  quoteVolume24h: 'quoteVolume24h',
  openInterestUsd: 'openInterestUsd',
  fundingRatePct: 'fundingRatePct',
  rsVsBtcPct: 'rsVsBtcPct',
  pctChange30d: 'pctChange30d',
};

/** Confidence ranking for a minConfidence floor filter. */
const CONFIDENCE_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const toNum = (value: Prisma.Decimal | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

const toDecimal = (value: number | null | undefined): Prisma.Decimal | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : new Prisma.Decimal(value);

function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export class CryptoSnapshotsRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

  /** symbol → instrumentId map for the supplied symbols (only existing assets). */
  private async resolveInstrumentIds(symbols: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
    if (unique.length === 0) return new Map();
    const assets = await this.prisma.cryptoAsset.findMany({
      where: { symbol: { in: unique } },
      select: { id: true, symbol: true },
    });
    return new Map(assets.map((a) => [a.symbol.toUpperCase(), a.id]));
  }

  /** Upsert on-chain fundamental snapshots (crypto_fundamental_snapshots). */
  async upsertFundamentalSnapshots(
    rows: CryptoFundamentalSnapshotRow[],
    snapshotDate: Date,
  ): Promise<{ count: number }> {
    if (rows.length === 0) return { count: 0 };
    const day = utcMidnight(snapshotDate);
    const idBySymbol = await this.resolveInstrumentIds(rows.map((r) => r.symbol));
    let count = 0;
    for (const row of rows) {
      const instrumentId = idBySymbol.get(row.symbol.trim().toUpperCase());
      if (!instrumentId) continue;
      const data = {
        symbol: row.symbol.trim().toUpperCase(),
        defillamaSlug: row.defillamaSlug ?? null,
        category: row.category ?? null,
        chains: (row.chains ?? null) as Prisma.InputJsonValue | undefined,
        tvlUsd: toDecimal(row.tvlUsd),
        tvlChange1dPct: row.tvlChange1dPct ?? null,
        tvlChange7dPct: row.tvlChange7dPct ?? null,
        fees24hUsd: toDecimal(row.fees24hUsd),
        fees7dUsd: toDecimal(row.fees7dUsd),
        revenue24hUsd: toDecimal(row.revenue24hUsd),
        revenue30dUsd: toDecimal(row.revenue30dUsd),
        annualizedRevenueUsd: toDecimal(row.annualizedRevenueUsd),
        coverageStatus: row.coverageStatus ?? 'NONE',
      };
      await this.prisma.cryptoFundamentalSnapshot.upsert({
        where: { instrumentId_snapshotDate: { instrumentId, snapshotDate: day } },
        create: { instrumentId, snapshotDate: day, ...data },
        update: data,
      });
      count += 1;
    }
    return { count };
  }

  /** Upsert perp futures snapshots (crypto_futures_snapshots). */
  async upsertFuturesSnapshots(
    rows: CryptoFuturesSnapshotRow[],
    snapshotDate: Date,
  ): Promise<{ count: number }> {
    if (rows.length === 0) return { count: 0 };
    const day = utcMidnight(snapshotDate);
    const idBySymbol = await this.resolveInstrumentIds(rows.map((r) => r.symbol));
    let count = 0;
    for (const row of rows) {
      const instrumentId = idBySymbol.get(row.symbol.trim().toUpperCase());
      if (!instrumentId) continue;
      const data = {
        symbol: row.symbol.trim().toUpperCase(),
        fundingRatePct: row.fundingRatePct ?? null,
        openInterestUsd: toDecimal(row.openInterestUsd),
        longShortRatioGlobal: row.longShortRatioGlobal ?? null,
        longAccountPct: row.longAccountPct ?? null,
        shortAccountPct: row.shortAccountPct ?? null,
        topTraderLongShortRatio: row.topTraderLongShortRatio ?? null,
        topTraderPositionRatio: row.topTraderPositionRatio ?? null,
        takerBuySellRatio: row.takerBuySellRatio ?? null,
      };
      await this.prisma.cryptoFuturesSnapshot.upsert({
        where: { instrumentId_snapshotDate: { instrumentId, snapshotDate: day } },
        create: { instrumentId, snapshotDate: day, ...data },
        update: data,
      });
      count += 1;
    }
    return { count };
  }

  /** Upsert denormalized daily-metric snapshots (crypto_daily_metric_snapshots). */
  async upsertDailyMetricSnapshots(rows: CryptoDailyMetricSnapshotRow[]): Promise<{ count: number }> {
    if (rows.length === 0) return { count: 0 };
    const idBySymbol = await this.resolveInstrumentIds(rows.map((r) => r.symbol));
    let count = 0;
    for (const row of rows) {
      const instrumentId = idBySymbol.get(row.symbol.trim().toUpperCase());
      if (!instrumentId) continue;
      const day = utcMidnight(row.snapshotDate);
      const data = {
        symbol: row.symbol.trim().toUpperCase(),
        name: row.name ?? null,
        dataThroughDate: row.dataThroughDate ?? null,
        price: toDecimal(row.price),
        marketCap: toDecimal(row.marketCap),
        rank: row.rank ?? null,
        signalScore: row.signalScore ?? null,
        signalDirection: row.signalDirection ?? null,
        signalConfidence: row.signalConfidence ?? null,
        volumeSpike: row.volumeSpike ?? false,
        pctChange1d: row.pctChange1d ?? null,
        pctChange7d: row.pctChange7d ?? null,
        pctChange30d: row.pctChange30d ?? null,
        distanceFromAthPct: row.distanceFromAthPct ?? null,
        near52wHigh: row.near52wHigh ?? false,
        near52wLow: row.near52wLow ?? false,
        rsi14: row.rsi14 ?? null,
        macd: row.macd ?? null,
        macdSignal: row.macdSignal ?? null,
        macdHist: row.macdHist ?? null,
        bbPercentB: row.bbPercentB ?? null,
        sma50: row.sma50 ?? null,
        sma200: row.sma200 ?? null,
        crossState: row.crossState ?? null,
        rsVsBtcPct: row.rsVsBtcPct ?? null,
        tvlUsd: toDecimal(row.tvlUsd),
        tvlChange7dPct: row.tvlChange7dPct ?? null,
        fundingRatePct: row.fundingRatePct ?? null,
        openInterestUsd: toDecimal(row.openInterestUsd),
        quoteVolume24h: toDecimal(row.quoteVolume24h),
        calculationVersion: row.calculationVersion ?? 'crypto-metrics-v1',
      };
      await this.prisma.cryptoDailyMetricSnapshot.upsert({
        where: { instrumentId_snapshotDate: { instrumentId, snapshotDate: day } },
        create: { instrumentId, snapshotDate: day, ...data },
        update: data,
      });
      count += 1;
    }
    return { count };
  }

  /**
   * Read the LATEST daily-metric board (single persisted snapshotDate). PURE
   * select + whitelist filter + whitelist order — no computation.
   */
  async getDailyMetricBoard(
    opts: CryptoDailyMetricBoardOptions = {},
  ): Promise<{ snapshotDate: Date | null; rows: Record<string, unknown>[] }> {
    const latest = await this.prisma.cryptoDailyMetricSnapshot.findFirst({
      orderBy: { snapshotDate: 'desc' },
      select: { snapshotDate: true },
    });
    if (!latest) return { snapshotDate: null, rows: [] };

    const where: Prisma.CryptoDailyMetricSnapshotWhereInput = { snapshotDate: latest.snapshotDate };
    if (opts.direction) where.signalDirection = opts.direction.trim().toUpperCase();
    if (typeof opts.minScore === 'number' && Number.isFinite(opts.minScore)) {
      where.signalScore = { gte: opts.minScore };
    }
    if (opts.volumeSpikeOnly) where.volumeSpike = true;
    if (opts.near52wHigh) where.near52wHigh = true;
    if (opts.goldenCrossOnly) where.crossState = 'GOLDEN';
    // minConfidence is an ordinal floor (LOW<MEDIUM<HIGH) over a fixed enum, so it maps
    // to an exact `in` set — applied in SQL (before take) so the limit isn't truncated
    // by a later in-memory filter. Still a pure read (no computation).
    if (opts.minConfidence) {
      const floor = CONFIDENCE_RANK[opts.minConfidence.trim().toUpperCase()] ?? 0;
      const allowed = Object.keys(CONFIDENCE_RANK).filter((k) => CONFIDENCE_RANK[k] >= floor);
      if (allowed.length) where.signalConfidence = { in: allowed };
    }

    const sortField = opts.sortBy && BOARD_SORT_COLUMNS[opts.sortBy] ? BOARD_SORT_COLUMNS[opts.sortBy] : 'rank';
    const sortOrder: 'asc' | 'desc' = opts.sortOrder === 'asc' || opts.sortOrder === 'desc'
      ? opts.sortOrder
      : sortField === 'rank'
        ? 'asc'
        : 'desc';
    const orderBy = [{ [sortField]: sortOrder } as Prisma.CryptoDailyMetricSnapshotOrderByWithRelationInput];

    const take = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 1000) : undefined;
    const rows = await this.prisma.cryptoDailyMetricSnapshot.findMany({ where, orderBy, take });

    return {
      snapshotDate: latest.snapshotDate,
      rows: rows.map((r) => this.serializeBoardRow(r)),
    };
  }

  /** Decimal/BigInt-safe serialization of a daily-metric row for JSON transport. */
  private serializeBoardRow(r: {
    instrumentId: string;
    symbol: string;
    name: string | null;
    snapshotDate: Date;
    dataThroughDate: Date | null;
    price: Prisma.Decimal | null;
    marketCap: Prisma.Decimal | null;
    rank: number | null;
    signalScore: number | null;
    signalDirection: string | null;
    signalConfidence: string | null;
    volumeSpike: boolean;
    pctChange1d: number | null;
    pctChange7d: number | null;
    pctChange30d: number | null;
    distanceFromAthPct: number | null;
    near52wHigh: boolean;
    near52wLow: boolean;
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHist: number | null;
    bbPercentB: number | null;
    sma50: number | null;
    sma200: number | null;
    crossState: string | null;
    rsVsBtcPct: number | null;
    tvlUsd: Prisma.Decimal | null;
    tvlChange7dPct: number | null;
    fundingRatePct: number | null;
    openInterestUsd: Prisma.Decimal | null;
    quoteVolume24h: Prisma.Decimal | null;
    calculationVersion: string;
    dataStatus: string;
  }): Record<string, unknown> {
    return {
      instrument_id: r.instrumentId,
      symbol: r.symbol,
      name: r.name,
      snapshot_date: r.snapshotDate.toISOString().slice(0, 10),
      data_through_date: r.dataThroughDate ? r.dataThroughDate.toISOString().slice(0, 10) : null,
      price: toNum(r.price),
      market_cap: toNum(r.marketCap),
      rank: r.rank,
      signal_score: r.signalScore,
      signal_direction: r.signalDirection,
      signal_confidence: r.signalConfidence,
      volume_spike: r.volumeSpike,
      pct_change_1d: r.pctChange1d,
      pct_change_7d: r.pctChange7d,
      pct_change_30d: r.pctChange30d,
      distance_from_ath_pct: r.distanceFromAthPct,
      near_52w_high: r.near52wHigh,
      near_52w_low: r.near52wLow,
      rsi14: r.rsi14,
      macd: r.macd,
      macd_signal: r.macdSignal,
      macd_hist: r.macdHist,
      bb_percent_b: r.bbPercentB,
      sma50: r.sma50,
      sma200: r.sma200,
      cross_state: r.crossState,
      rs_vs_btc_pct: r.rsVsBtcPct,
      tvl_usd: toNum(r.tvlUsd),
      tvl_change_7d_pct: r.tvlChange7dPct,
      funding_rate_pct: r.fundingRatePct,
      open_interest_usd: toNum(r.openInterestUsd),
      quote_volume_24h: toNum(r.quoteVolume24h),
      calculation_version: r.calculationVersion,
      data_status: r.dataStatus,
    };
  }

  /**
   * Joined detail for a single crypto instrument: catalog + latest daily-metric +
   * latest fundamental + latest futures + latest signal result. PURE reads.
   * Returns null when the asset is absent.
   */
  async getCryptoAssetDetail(instrumentId: string): Promise<Record<string, unknown> | null> {
    const asset = await this.prisma.cryptoAsset.findUnique({ where: { id: instrumentId } });
    if (!asset) return null;

    const [metric, fundamental, futures, signal] = await Promise.all([
      this.prisma.cryptoDailyMetricSnapshot.findFirst({
        where: { instrumentId },
        orderBy: { snapshotDate: 'desc' },
      }),
      this.prisma.cryptoFundamentalSnapshot.findFirst({
        where: { instrumentId },
        orderBy: { snapshotDate: 'desc' },
      }),
      this.prisma.cryptoFuturesSnapshot.findFirst({
        where: { instrumentId },
        orderBy: { snapshotDate: 'desc' },
      }),
      this.prisma.cryptoSignalResult.findFirst({
        where: { instrumentId },
        orderBy: { generatedAt: 'desc' },
      }),
    ]);

    return {
      catalog: {
        instrument_id: asset.id,
        symbol: asset.symbol,
        display_symbol: asset.displaySymbol,
        name: asset.name,
        rank: asset.rank,
        market_cap: toNum(asset.marketCap),
        circulating_supply: toNum(asset.circulatingSupply),
        max_supply: toNum(asset.maxSupply),
        fully_diluted_valuation: toNum(asset.fullyDilutedValuation),
        ath_price: toNum(asset.athPrice),
        ath_date: asset.athDate ? asset.athDate.toISOString() : null,
        atl_price: toNum(asset.atlPrice),
        atl_date: asset.atlDate ? asset.atlDate.toISOString() : null,
        category_tags: asset.categoryTags,
        logo_url: asset.logoUrl,
        website_url: asset.websiteUrl,
      },
      metrics: metric ? this.serializeBoardRow(metric) : null,
      fundamental: fundamental
        ? {
            snapshot_date: fundamental.snapshotDate.toISOString().slice(0, 10),
            defillama_slug: fundamental.defillamaSlug,
            category: fundamental.category,
            chains: fundamental.chains,
            tvl_usd: toNum(fundamental.tvlUsd),
            tvl_change_1d_pct: fundamental.tvlChange1dPct,
            tvl_change_7d_pct: fundamental.tvlChange7dPct,
            fees_24h_usd: toNum(fundamental.fees24hUsd),
            fees_7d_usd: toNum(fundamental.fees7dUsd),
            revenue_24h_usd: toNum(fundamental.revenue24hUsd),
            revenue_30d_usd: toNum(fundamental.revenue30dUsd),
            annualized_revenue_usd: toNum(fundamental.annualizedRevenueUsd),
            coverage_status: fundamental.coverageStatus,
          }
        : null,
      futures: futures
        ? {
            snapshot_date: futures.snapshotDate.toISOString().slice(0, 10),
            funding_rate_pct: futures.fundingRatePct,
            open_interest_usd: toNum(futures.openInterestUsd),
            long_short_ratio_global: futures.longShortRatioGlobal,
            long_account_pct: futures.longAccountPct,
            short_account_pct: futures.shortAccountPct,
            top_trader_long_short_ratio: futures.topTraderLongShortRatio,
            top_trader_position_ratio: futures.topTraderPositionRatio,
            taker_buy_sell_ratio: futures.takerBuySellRatio,
          }
        : null,
      signal: signal
        ? {
            score: signal.score,
            direction: signal.direction,
            confidence: signal.confidence,
            triggered_signals: signal.triggeredSignals,
            negative_signals: signal.negativeSignals,
            explanation: signal.explanation,
            generated_at: signal.generatedAt.toISOString(),
          }
        : null,
    };
  }
}

/** Shared instance bound to the singleton Prisma client. */
export const cryptoSnapshotsRepository = new CryptoSnapshotsRepository();

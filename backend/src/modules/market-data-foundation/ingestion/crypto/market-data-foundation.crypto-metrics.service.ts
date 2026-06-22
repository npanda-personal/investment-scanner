import {
  MarketDataFoundationCryptoRepository,
  marketDataFoundationCryptoRepository,
} from './market-data-foundation.crypto-repository';
import {
  CryptoSnapshotsRepository,
  cryptoSnapshotsRepository,
  type CryptoDailyMetricSnapshotRow,
} from './market-data-foundation.crypto-snapshots-repository';
import {
  fetchCryptoFearGreed,
  fetchBinanceFuturesSnapshots,
  fetchDefiLlamaFundamentals,
} from './market-data-foundation.crypto-feeds-provider';
import { sma, rsi, macd, bollingerPercentB } from '../../../signal-generation-engine';
import type { SignalPricePoint } from '../../../signal-generation-engine';

/**
 * CryptoMetricsService — the CRYPTO_DAILY_METRICS pipeline stage.
 *
 * Derives every per-asset bull/bear metric (momentum, distance-from-ATH, RSI/MACD/
 * Bollinger, SMA cross state, relative strength vs BTC) and PERSISTS them into
 * crypto_daily_metric_snapshots. The frontend does NO runtime computation — it reads
 * the persisted board. Signal/fundamental/futures values are mirrored from their
 * own latest snapshots so the board is a single-query read.
 *
 * Also provides thin ingestion orchestration for the three free feeds (fundamentals,
 * futures, fear&greed) so the pipeline can persist them ahead of the metrics derive.
 */

const HISTORY_BARS = 400; // 52w (365 daily 24/7 bars) + SMA200/warm-up headroom
const MIN_BARS = 30;
const NEAR_52W_PROXIMITY_PCT = 3;
const WINDOW_52W = 365;
const BTC_SYMBOL = (process.env.CRYPTO_RS_BENCHMARK_SYMBOL || 'BTCUSDT').toUpperCase();

export interface CryptoMetricsDeriveResult {
  assetsProcessed: number;
  rowsPersisted: number;
  warnings: string[];
}

export interface CryptoFeedIngestResult {
  count: number;
  warnings: string[];
}

type PriceTick = Awaited<ReturnType<MarketDataFoundationCryptoRepository['getPriceHistory']>>[number];

export class CryptoMetricsService {
  constructor(
    private readonly repo: MarketDataFoundationCryptoRepository = marketDataFoundationCryptoRepository,
    private readonly snapshots: CryptoSnapshotsRepository = cryptoSnapshotsRepository,
  ) {}

  /** Map ascending crypto_price_ticks → newest-first SignalPricePoint[]. */
  private toPricePoints(ticksAsc: PriceTick[]): SignalPricePoint[] {
    const points: SignalPricePoint[] = ticksAsc.map((t) => {
      const close = Number(t.close);
      return {
        date: t.timestamp.toISOString().slice(0, 10),
        open: t.open !== null ? Number(t.open) : null,
        high: t.high !== null ? Number(t.high) : null,
        low: t.low !== null ? Number(t.low) : null,
        close,
        adjusted_close: close, // crypto: no splits/dividends
        volume: t.volume !== null && t.volume !== undefined ? Number(t.volume) : null,
      };
    });
    return points.reverse(); // newest-first
  }

  /** pct change of newest close vs the close `barsBack` bars earlier (null when short). */
  private pctChange(points: SignalPricePoint[], barsBack: number): number | null {
    if (points.length <= barsBack) return null;
    const now = points[0].adjusted_close;
    const then = points[barsBack].adjusted_close;
    if (!(then > 0)) return null;
    return ((now - then) / then) * 100;
  }

  /** GOLDEN/DEATH/NONE from sma50 vs sma200 with the prior-bar comparison. */
  private crossState(points: SignalPricePoint[]): string | null {
    if (points.length < 201) return null; // need sma200 at current AND prior bar
    const sma50Now = sma(points, 50);
    const sma200Now = sma(points, 200);
    const sma50Prev = sma(points.slice(1), 50);
    const sma200Prev = sma(points.slice(1), 200);
    if (sma50Now === null || sma200Now === null || sma50Prev === null || sma200Prev === null) return 'NONE';
    const crossedUp = sma50Prev <= sma200Prev && sma50Now > sma200Now;
    const crossedDown = sma50Prev >= sma200Prev && sma50Now < sma200Now;
    if (crossedUp) return 'GOLDEN';
    if (crossedDown) return 'DEATH';
    return 'NONE';
  }

  /**
   * Derive and persist per-asset daily metrics for all active crypto assets.
   * Skips assets with fewer than MIN_BARS price bars (recorded as a warning).
   */
  async deriveAndPersist(opts: { asOf?: Date } = {}): Promise<CryptoMetricsDeriveResult> {
    const warnings: string[] = [];
    const asOf = opts.asOf ?? new Date();
    const snapshotDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));

    const assets = await this.repo.listAssets({ activeOnly: true });

    // BTC benchmark 30d return for relative strength.
    const btcTicks = await this.repo.getPriceHistory(BTC_SYMBOL, HISTORY_BARS);
    const btcPoints = this.toPricePoints(btcTicks);
    const btc30d = this.pctChange(btcPoints, 30);

    // Latest signal per instrument (mirror score/direction/confidence).
    const signalByInstrument = await this.latestSignalsByInstrument();
    // Latest fundamental/futures per instrument (mirror tvl + funding/OI columns).
    const fundamentalByInstrument = await this.latestFundamentalsByInstrument();
    const futuresByInstrument = await this.latestFuturesByInstrument();
    // Volume-spike flagged symbol set from the latest VOLUME_SPIKE scan.
    const volumeSpikeSymbols = await this.volumeSpikeSymbols();

    const rows: CryptoDailyMetricSnapshotRow[] = [];
    let assetsProcessed = 0;

    for (const asset of assets) {
      const ticks = await this.repo.getPriceHistory(asset.symbol, HISTORY_BARS);
      if (ticks.length < MIN_BARS) {
        warnings.push(`Skipped ${asset.symbol}: only ${ticks.length} bars (< ${MIN_BARS}).`);
        continue;
      }
      assetsProcessed += 1;
      const points = this.toPricePoints(ticks);
      const price = points[0].adjusted_close;
      const dataThroughDate = new Date(points[0].date);
      const latestTick = ticks[ticks.length - 1];
      const quoteVolume24h = latestTick.quoteVolume != null ? Number(latestTick.quoteVolume) : null;

      // Distance from ATH (catalog athPrice; null when missing).
      const athPrice = asset.athPrice !== null && asset.athPrice !== undefined ? Number(asset.athPrice) : null;
      const distanceFromAthPct = athPrice && athPrice > 0 ? ((price - athPrice) / athPrice) * 100 : null;

      // 52w high/low proximity — only meaningful with a full ~365-bar window; with
      // fewer bars the flags would fire spuriously, so leave them false until enough history.
      const window = points.slice(0, WINDOW_52W).map((p) => p.adjusted_close);
      const has52w = window.length >= WINDOW_52W;
      const hi52 = has52w ? Math.max(...window) : null;
      const lo52 = has52w ? Math.min(...window) : null;
      const near52wHigh = hi52 !== null && hi52 > 0 ? (hi52 - price) / hi52 * 100 <= NEAR_52W_PROXIMITY_PCT : false;
      const near52wLow = lo52 !== null && lo52 > 0 ? (price - lo52) / lo52 * 100 <= NEAR_52W_PROXIMITY_PCT : false;

      const macdResult = macd(points);
      const pct30d = this.pctChange(points, 30);
      const rsVsBtcPct = pct30d !== null && btc30d !== null ? pct30d - btc30d : null;

      const sig = signalByInstrument.get(asset.id);
      const fund = fundamentalByInstrument.get(asset.id);
      const fut = futuresByInstrument.get(asset.id);

      rows.push({
        symbol: asset.symbol,
        name: asset.name || asset.displaySymbol,
        snapshotDate,
        dataThroughDate,
        price,
        marketCap: asset.marketCap !== null && asset.marketCap !== undefined ? Number(asset.marketCap) : null,
        rank: asset.rank ?? null,
        signalScore: sig?.score ?? null,
        signalDirection: sig?.direction ?? null,
        signalConfidence: sig?.confidence ?? null,
        volumeSpike: volumeSpikeSymbols.has(asset.symbol.toUpperCase()),
        pctChange1d: this.pctChange(points, 1),
        pctChange7d: this.pctChange(points, 7),
        pctChange30d: pct30d,
        distanceFromAthPct,
        near52wHigh,
        near52wLow,
        rsi14: rsi(points, 14),
        macd: macdResult ? macdResult.macd : null,
        macdSignal: macdResult ? macdResult.signal : null,
        macdHist: macdResult ? macdResult.histogram : null,
        bbPercentB: bollingerPercentB(points),
        sma50: sma(points, 50),
        sma200: sma(points, 200),
        crossState: this.crossState(points),
        rsVsBtcPct,
        tvlUsd: fund?.tvlUsd ?? null,
        tvlChange7dPct: fund?.tvlChange7dPct ?? null,
        fundingRatePct: fut?.fundingRatePct ?? null,
        openInterestUsd: fut?.openInterestUsd ?? null,
        quoteVolume24h,
        calculationVersion: 'crypto-metrics-v1',
      });
    }

    const { count } = await this.snapshots.upsertDailyMetricSnapshots(rows);
    return { assetsProcessed, rowsPersisted: count, warnings };
  }

  // ── Feed ingestion orchestration (called by the pipeline ahead of derive) ───

  /** Fetch DefiLlama fundamentals for active assets and persist them. */
  async ingestFundamentals(opts: { asOf?: Date } = {}): Promise<CryptoFeedIngestResult> {
    const asOf = opts.asOf ?? new Date();
    const assets = await this.repo.listAssets({ activeOnly: true });
    const { rows, warnings } = await fetchDefiLlamaFundamentals(
      assets.map((a) => ({ symbol: a.symbol, displaySymbol: a.displaySymbol })),
    );
    const { count } = await this.snapshots.upsertFundamentalSnapshots(rows, asOf);
    return { count, warnings };
  }

  /** Fetch Binance perp funding/OI for active symbols and persist them. */
  async ingestFutures(opts: { asOf?: Date } = {}): Promise<CryptoFeedIngestResult> {
    const asOf = opts.asOf ?? new Date();
    const assets = await this.repo.listAssets({ activeOnly: true });
    const { rows, warnings } = await fetchBinanceFuturesSnapshots(assets.map((a) => a.symbol));
    const { count } = await this.snapshots.upsertFuturesSnapshots(rows, asOf);
    return { count, warnings };
  }

  /**
   * Fetch the latest Fear & Greed reading and RETURN it for the market-context
   * stage to persist into market_context_snapshots. Does NOT write here.
   */
  async getLatestFearGreed(): Promise<{ index: number | null; label: string | null }> {
    const fg = await fetchCryptoFearGreed();
    return { index: fg?.value ?? null, label: fg?.classification ?? null };
  }

  // ── Latest-snapshot lookups (mirrored into the daily-metric board) ──────────

  private async latestSignalsByInstrument(): Promise<Map<string, { score: number; direction: string; confidence: string }>> {
    const rows = await this.repo.prisma.cryptoSignalResult.findMany({
      orderBy: { generatedAt: 'desc' },
      select: { instrumentId: true, score: true, direction: true, confidence: true },
    });
    const map = new Map<string, { score: number; direction: string; confidence: string }>();
    for (const r of rows) {
      if (!map.has(r.instrumentId)) map.set(r.instrumentId, { score: r.score, direction: r.direction, confidence: r.confidence });
    }
    return map;
  }

  private async latestFundamentalsByInstrument(): Promise<Map<string, { tvlUsd: number | null; tvlChange7dPct: number | null }>> {
    const rows = await this.repo.prisma.cryptoFundamentalSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' },
      select: { instrumentId: true, tvlUsd: true, tvlChange7dPct: true },
    });
    const map = new Map<string, { tvlUsd: number | null; tvlChange7dPct: number | null }>();
    for (const r of rows) {
      if (!map.has(r.instrumentId)) {
        map.set(r.instrumentId, {
          tvlUsd: r.tvlUsd !== null && r.tvlUsd !== undefined ? Number(r.tvlUsd) : null,
          tvlChange7dPct: r.tvlChange7dPct ?? null,
        });
      }
    }
    return map;
  }

  private async latestFuturesByInstrument(): Promise<Map<string, { fundingRatePct: number | null; openInterestUsd: number | null }>> {
    const rows = await this.repo.prisma.cryptoFuturesSnapshot.findMany({
      orderBy: { snapshotDate: 'desc' },
      select: { instrumentId: true, fundingRatePct: true, openInterestUsd: true },
    });
    const map = new Map<string, { fundingRatePct: number | null; openInterestUsd: number | null }>();
    for (const r of rows) {
      if (!map.has(r.instrumentId)) {
        map.set(r.instrumentId, {
          fundingRatePct: r.fundingRatePct ?? null,
          openInterestUsd: r.openInterestUsd !== null && r.openInterestUsd !== undefined ? Number(r.openInterestUsd) : null,
        });
      }
    }
    return map;
  }

  private async volumeSpikeSymbols(): Promise<Set<string>> {
    const scan = await this.repo.readLatestScan('VOLUME_SPIKE');
    const set = new Set<string>();
    for (const row of scan?.rows ?? []) {
      const symbol = (row as { symbol?: string }).symbol;
      if (symbol) set.add(symbol.toUpperCase());
    }
    return set;
  }
}

export const cryptoMetricsService = new CryptoMetricsService();

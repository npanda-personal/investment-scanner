import { Prisma, PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';
import type { HistoricalPrice, SyncSummary } from './market-data-foundation.types';

/**
 * Crypto foundation repository — owns the crypto_* market-data tables
 * (crypto_assets, crypto_price_ticks, crypto_latest_prices).
 *
 * It uses the SHARED PrismaClient singleton (one pool, per the project's
 * connection-ceiling rule) and only ever touches crypto_* tables, so a crypto
 * write can never reach an equity table.  It mirrors the relevant slice of the
 * equity MarketDataFoundationRepository surface (asset upsert, historical price
 * store, latest-price maintenance, candle reads) used by ingestion and the
 * pipeline.
 */

export interface CryptoAssetInput {
  /** Canonical symbol = Binance pair, e.g. BTCUSDT. */
  symbol: string;
  name: string;
  displaySymbol?: string | null; // BTC
  providerSymbol?: string | null; // Binance pair
  sourceSymbol?: string | null; // CoinGecko id (bitcoin)
  marketCap?: number | null;
  rank?: number | null;
  exchange?: string | null;
  currency?: string | null;
  catalogSource?: string | null;
  providerSupportStatus?: string | null;
  providerError?: string | null;
  dataStatus?: string | null;
  isActive?: boolean;
}

/** Crypto historical bar — equity HistoricalPrice plus optional quote (USD) volume. */
export type CryptoHistoricalPrice = HistoricalPrice & { quoteVolume?: number | null };

export interface CryptoUpsertAssetResult {
  id: string;
  created: boolean;
}

function emptySummary(): SyncSummary {
  return {
    rowsReceived: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    warningCount: 0,
    warnings: [],
  };
}

function toBigIntOrNull(value?: number | null): bigint | null {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  return BigInt(Math.round(value));
}

export class MarketDataFoundationCryptoRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

  /** Upsert a single crypto asset by canonical symbol. Returns id + whether created. */
  async upsertAsset(input: CryptoAssetInput): Promise<CryptoUpsertAssetResult> {
    const existing = await this.prisma.cryptoAsset.findUnique({
      where: { symbol: input.symbol },
      select: { id: true },
    });
    const data = {
      name: input.name,
      displaySymbol: input.displaySymbol ?? null,
      providerSymbol: input.providerSymbol ?? input.symbol,
      sourceSymbol: input.sourceSymbol ?? null,
      marketCap: input.marketCap ?? null,
      rank: input.rank ?? null,
      exchange: input.exchange ?? 'CRYPTO',
      currency: input.currency ?? 'USD',
      catalogSource: input.catalogSource ?? null,
      providerSupportStatus: input.providerSupportStatus ?? null,
      providerError: input.providerError ?? null,
      dataStatus: input.dataStatus ?? 'PARTIAL',
      isActive: input.isActive ?? true,
      region: 'GLOBAL',
      assetType: 'CRYPTO',
      instrumentSegment: 'CRYPTO',
    };
    const row = await this.prisma.cryptoAsset.upsert({
      where: { symbol: input.symbol },
      create: { symbol: input.symbol, ...data },
      update: data,
      select: { id: true },
    });
    return { id: row.id, created: !existing };
  }

  /** Bulk upsert crypto assets; returns insert/update counts. */
  async upsertAssets(inputs: CryptoAssetInput[]): Promise<SyncSummary> {
    const summary = emptySummary();
    summary.rowsReceived = inputs.length;
    for (const input of inputs) {
      try {
        const result = await this.upsertAsset(input);
        if (result.created) summary.rowsInserted += 1;
        else summary.rowsUpdated += 1;
      } catch (error) {
        summary.rowsSkipped += 1;
        summary.warningCount += 1;
        summary.warnings.push(`Failed to upsert crypto asset ${input.symbol}: ${(error as Error).message}`);
      }
    }
    return summary;
  }

  async getAssetBySymbol(symbol: string) {
    return this.prisma.cryptoAsset.findUnique({ where: { symbol } });
  }

  async getAssetById(id: string) {
    return this.prisma.cryptoAsset.findUnique({ where: { id } });
  }

  /** Build the crypto_assets `where` shared by listAssets / countAssets. */
  private assetWhere(options: { activeOnly?: boolean; search?: string }): Prisma.CryptoAssetWhereInput | undefined {
    const and: Prisma.CryptoAssetWhereInput[] = [];
    if (options.activeOnly) and.push({ isActive: true, isDelisted: false });
    const search = options.search?.trim();
    if (search) {
      and.push({
        OR: [
          { symbol: { contains: search, mode: 'insensitive' } },
          { displaySymbol: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    return and.length ? { AND: and } : undefined;
  }

  async listAssets(options: { activeOnly?: boolean; limit?: number; offset?: number; search?: string } = {}) {
    return this.prisma.cryptoAsset.findMany({
      // Ranked by market cap (rank asc ≈ market-cap desc); equity `sortBy` is intentionally ignored.
      where: this.assetWhere(options),
      orderBy: [{ rank: 'asc' }, { symbol: 'asc' }],
      take: options.limit,
      skip: options.offset,
    });
  }

  /** Count crypto assets matching the same filter as listAssets (for pagination). */
  async countAssets(options: { activeOnly?: boolean; search?: string } = {}) {
    return this.prisma.cryptoAsset.count({ where: this.assetWhere(options) });
  }

  /** Most recent stored price-tick timestamp across all crypto assets (or null). */
  async latestPriceTimestamp(): Promise<Date | null> {
    const row = await this.prisma.cryptoPriceTick.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    return row?.timestamp ?? null;
  }

  /** Count of crypto assets that have a maintained latest-price row (price coverage). */
  async countLatestPrices(): Promise<number> {
    return this.prisma.cryptoLatestPrice.count();
  }

  /** Most recent stored daily candle date for a symbol (ISO yyyy-mm-dd) or null. */
  async latestStoredCandleDate(symbol: string): Promise<Date | null> {
    const row = await this.prisma.cryptoPriceTick.findFirst({
      where: { symbol },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    return row?.timestamp ?? null;
  }

  /** Ascending price history for a symbol (oldest first). */
  async getPriceHistory(symbol: string, limit?: number) {
    return this.prisma.cryptoPriceTick.findMany({
      where: { symbol },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  // ── Crypto market scans (52w-high / 52w-low / volume-spike) ─────────────────
  // Computes movers from crypto_price_ticks and persists crypto_market_scan_snapshots
  // (one row per rank, payloadJson = the scan row) so trader-page GETs stay
  // persisted-reads. Mirrors the equity market_scan_snapshots storage shape.

  private async writeScan(scanType: string, rows: object[], tradingDate: Date, scanRange: string | null = null): Promise<void> {
    await this.prisma.cryptoMarketScanSnapshot.deleteMany({
      where: { scanType, scanRange, region: 'GLOBAL', assetType: 'CRYPTO', tradingDate },
    });
    if (rows.length === 0) return;
    await this.prisma.cryptoMarketScanSnapshot.createMany({
      data: rows.map((row, i) => ({
        scanType,
        scanRange,
        region: 'GLOBAL',
        assetType: 'CRYPTO',
        tradingDate,
        rank: i + 1,
        payloadJson: row as object,
      })),
    });
  }

  /** Read the latest crypto scan snapshot rows for a scanType (+ optional range). */
  async readLatestScan(scanType: string, scanRange: string | null = null): Promise<{ tradingDate: Date; rows: object[] } | null> {
    const latest = await this.prisma.cryptoMarketScanSnapshot.findFirst({
      where: { scanType, scanRange, region: 'GLOBAL', assetType: 'CRYPTO' },
      orderBy: { tradingDate: 'desc' },
      select: { tradingDate: true },
    });
    if (!latest) return null;
    const rows = await this.prisma.cryptoMarketScanSnapshot.findMany({
      where: { scanType, scanRange, region: 'GLOBAL', assetType: 'CRYPTO', tradingDate: latest.tradingDate },
      orderBy: { rank: 'asc' },
      select: { payloadJson: true },
    });
    return { tradingDate: latest.tradingDate, rows: rows.map((r) => r.payloadJson as object) };
  }

  /** Recompute crypto market scans (52w high/low, volume spike) into crypto_market_scan_snapshots. */
  async refreshMarketScans(): Promise<{ '52W_HIGH': number; '52W_LOW': number; VOLUME_SPIKE: number; assetsConsidered: number }> {
    const WINDOW = 365;
    const PROXIMITY_PCT = 5;
    const VOLUME_SPIKE_MIN = 2;
    const assets = await this.listAssets({ activeOnly: true });
    const signals = await this.prisma.cryptoSignalResult.findMany({ orderBy: { generatedAt: 'desc' } });
    const sigByInstrument = new Map<string, { direction: string; score: number }>();
    for (const s of signals) if (!sigByInstrument.has(s.instrumentId)) sigByInstrument.set(s.instrumentId, { direction: s.direction, score: s.score });

    const high: object[] = [];
    const low: object[] = [];
    const vol: object[] = [];
    // Per-asset close series, reused after the loop to compute movers/market-map per range.
    const series: Array<{ base: Record<string, unknown>; closes: number[]; ticks: { timestamp: Date }[] }> = [];
    let maxDate = 0;
    let considered = 0;

    for (const a of assets) {
      const ticks = await this.prisma.cryptoPriceTick.findMany({
        where: { symbol: a.symbol },
        orderBy: { timestamp: 'desc' },
        take: WINDOW,
      });
      if (ticks.length < 20) continue;
      considered += 1;
      const closes = ticks.map((t) => Number(t.close));
      const current = closes[0];
      const hi = Math.max(...closes);
      const lo = Math.min(...closes);
      const pctFromHigh = hi > 0 ? ((current - hi) / hi) * 100 : 0;
      const pctFromLow = lo > 0 ? ((current - lo) / lo) * 100 : 0;
      const latestDate = ticks[0].timestamp;
      maxDate = Math.max(maxDate, latestDate.getTime());
      const sig = sigByInstrument.get(a.id);
      const base = {
        instrumentId: a.id,
        symbol: a.symbol,
        companyName: a.displaySymbol || a.name,
        sector: null,
        latestDate: latestDate.toISOString().slice(0, 10),
        signalDirection: sig?.direction ?? null,
        signalScore: sig?.score ?? null,
      };
      const row52 = { ...base, currentPrice: current, high52w: hi, low52w: lo, pctFromHigh, pctFromLow, priceBasis: 'CLOSE_FALLBACK' as const };
      if (pctFromHigh >= -PROXIMITY_PCT) high.push(row52);
      if (pctFromLow <= PROXIMITY_PCT) low.push(row52);
      series.push({ base, closes, ticks });

      const vols = ticks.map((t) => (t.volume != null ? Number(t.volume) : 0));
      const latestVolume = vols[0];
      const lookback = vols.slice(1, 21);
      const avgVolume = lookback.length ? lookback.reduce((x, y) => x + y, 0) / lookback.length : 0;
      const spikeRatio = avgVolume > 0 ? latestVolume / avgVolume : 0;
      if (spikeRatio >= VOLUME_SPIKE_MIN) {
        vol.push({ ...base, latestVolume, avgVolume, spikeRatio, lookbackBars: lookback.length });
      }
    }

    (high as Array<{ pctFromHigh: number }>).sort((a, b) => b.pctFromHigh - a.pctFromHigh);
    (low as Array<{ pctFromLow: number }>).sort((a, b) => a.pctFromLow - b.pctFromLow);
    (vol as Array<{ spikeRatio: number }>).sort((a, b) => b.spikeRatio - a.spikeRatio);

    const tradingDate = maxDate > 0 ? new Date(Date.UTC(new Date(maxDate).getUTCFullYear(), new Date(maxDate).getUTCMonth(), new Date(maxDate).getUTCDate())) : new Date(maxDate);
    await this.writeScan('52W_HIGH', high.slice(0, 50), tradingDate);
    await this.writeScan('52W_LOW', low.slice(0, 50), tradingDate);
    await this.writeScan('VOLUME_SPIKE', vol.slice(0, 50), tradingDate);

    // Movers + market-map per range (matches equity MarketMoverRow shape so the
    // shared marketMovers()/marketMap() readers can consume crypto snapshots).
    // Daily 24/7 candles → lookback days ≈ index into the desc closes array.
    const MOVER_LOOKBACK_DAYS: Record<string, number> = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    for (const [range, lookback] of Object.entries(MOVER_LOOKBACK_DAYS)) {
      const rows: Array<Record<string, unknown>> = [];
      for (const s of series) {
        if (s.closes.length <= lookback) continue;
        const latestClose = s.closes[0];
        const baseClose = s.closes[lookback];
        if (!(baseClose > 0)) continue;
        const returnPercent = ((latestClose - baseClose) / baseClose) * 100;
        rows.push({
          instrumentId: s.base.instrumentId,
          symbol: s.base.symbol,
          companyName: s.base.companyName,
          sector: null,
          latestDate: s.base.latestDate,
          latestClose,
          baseDate: s.ticks[lookback].timestamp.toISOString().slice(0, 10),
          baseClose,
          returnPercent,
          priceBasis: 'CLOSE_FALLBACK',
          currency: 'USD',
          region: 'GLOBAL',
        });
      }
      const gainers = rows.filter((r) => (r.returnPercent as number) > 0).sort((a, b) => (b.returnPercent as number) - (a.returnPercent as number)).slice(0, 50);
      const losers = rows.filter((r) => (r.returnPercent as number) < 0).sort((a, b) => (a.returnPercent as number) - (b.returnPercent as number)).slice(0, 50);
      const map = [...rows].sort((a, b) => Math.abs(b.returnPercent as number) - Math.abs(a.returnPercent as number)).slice(0, 100);
      await this.writeScan('MOVERS_GAINERS', gainers, tradingDate, range);
      await this.writeScan('MOVERS_LOSERS', losers, tradingDate, range);
      await this.writeScan('MARKET_MAP', map, tradingDate, range);
    }
    return { '52W_HIGH': high.length, '52W_LOW': low.length, VOLUME_SPIKE: vol.length, assetsConsidered: considered };
  }

  /**
   * Store historical daily candles into crypto_price_ticks (upsert by
   * [symbol, timestamp]) and refresh crypto_latest_prices.  Only touches
   * crypto_* tables.
   */
  async storeHistoricalPrices(
    prices: CryptoHistoricalPrice[],
    options: { source?: string } = {}
  ): Promise<SyncSummary> {
    const summary = emptySummary();
    summary.rowsReceived = prices.length;
    if (prices.length === 0) return summary;

    // Track the latest bar per symbol for the latest-price refresh.
    const latestBySymbol = new Map<string, CryptoHistoricalPrice>();

    for (const price of prices) {
      const source = price.source ?? options.source ?? 'BINANCE_KLINES';
      const tickData = {
        region: 'GLOBAL',
        exchange: 'CRYPTO',
        open: new Prisma.Decimal(price.open),
        high: new Prisma.Decimal(price.high),
        low: new Prisma.Decimal(price.low),
        close: new Prisma.Decimal(price.close),
        // crypto has no splits/dividends → adjustedClose === close
        adjustedClose: new Prisma.Decimal(price.adjustedClose ?? price.close),
        volume: toBigIntOrNull(price.volume),
        quoteVolume:
          price.quoteVolume === undefined || price.quoteVolume === null
            ? null
            : new Prisma.Decimal(price.quoteVolume),
        source,
        dataStatus: 'COMPLETE',
      };
      try {
        const before = await this.prisma.cryptoPriceTick.findUnique({
          where: { symbol_timestamp: { symbol: price.symbol, timestamp: price.date } },
          select: { id: true },
        });
        await this.prisma.cryptoPriceTick.upsert({
          where: { symbol_timestamp: { symbol: price.symbol, timestamp: price.date } },
          create: { symbol: price.symbol, timestamp: price.date, ...tickData },
          update: tickData,
        });
        if (before) summary.rowsUpdated += 1;
        else summary.rowsInserted += 1;
      } catch (error) {
        summary.rowsSkipped += 1;
        summary.warningCount += 1;
        summary.warnings.push(`Failed to store crypto candle ${price.symbol}@${price.date.toISOString()}: ${(error as Error).message}`);
        continue;
      }

      const prevLatest = latestBySymbol.get(price.symbol);
      if (!prevLatest || price.date > prevLatest.date) {
        latestBySymbol.set(price.symbol, price);
      }
    }

    // Refresh latest prices (only advance forward in time).
    for (const [symbol, bar] of latestBySymbol) {
      try {
        const existing = await this.prisma.cryptoLatestPrice.findUnique({
          where: { symbol },
          select: { timestamp: true },
        });
        if (existing && existing.timestamp >= bar.date) continue;
        await this.prisma.cryptoLatestPrice.upsert({
          where: { symbol },
          create: { symbol, region: 'GLOBAL', price: new Prisma.Decimal(bar.close), timestamp: bar.date },
          update: { price: new Prisma.Decimal(bar.close), timestamp: bar.date },
        });
      } catch (error) {
        summary.warningCount += 1;
        summary.warnings.push(`Failed to refresh crypto latest price ${symbol}: ${(error as Error).message}`);
      }
    }

    return summary;
  }
}

/** Shared instance bound to the singleton Prisma client. */
export const marketDataFoundationCryptoRepository = new MarketDataFoundationCryptoRepository();

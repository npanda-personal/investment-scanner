// Price serving-reads (Phase 5a).
//
// PriceReadsService owns the persisted-read price-serving methods. MarketDataFoundationService
// constructs it once, passing itself as the MarketDataServingHost, and keeps a thin
// byte-identical delegator for each public method. The watermark gate
// (isWatermarkGateEnabled / getWatermarkDate), the crypto-scope predicate (isCryptoScope), and
// the trading-date helper (tradingDateForRegion) are pure sibling-module functions imported
// directly. The crypto branch of listPricesByInstrumentId / latestPriceByInstrumentId is
// served via the host (listCryptoPricesByInstrumentId / cryptoRepository). Behaviour is
// byte-identical to the pre-extraction inline implementation.

import type { MarketDataServingHost } from './market-data-foundation.serving-host';
import type { PaginationOptions } from '../market-data-foundation.types';
import { isWatermarkGateEnabled, getWatermarkDate } from './market-data-read.api';
import { isCryptoScope } from '../../../shared/data-access/market-repository-router';
import { tradingDateForRegion } from '../ingestion/market-data-foundation.market-session';

// Reduced from 100 to 50 so each raw-SQL batch returns at most ~50 × 420 ≈ 21 000 rows,
// keeping individual queries small and reducing connection-hold time (pool-safety).
const RECENT_PRICE_WINDOW_SYMBOL_CHUNK_SIZE = 50;

export class PriceReadsService {
  constructor(private readonly host: MarketDataServingHost) {}

  listPrices(symbol: string, limit: number, startDate?: Date, endDate?: Date) {
    return this.host.repository.listPrices(symbol, limit, startDate, endDate);
  }

  async listForwardPriceWindowsByInstrumentIds(instrumentIds: string[], startDate: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    return this.host.repository.listForwardPriceWindowsByInstrumentIds(instrumentIds, startDate, options);
  }

  async listPricesByInstrumentId(instrumentId: string, limit = 250, startDate?: Date, endDate?: Date, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    // Crypto scope → crypto_price_ticks (same prices response shape; no delivery%).
    if (isCryptoScope(options)) {
      return this.host.listCryptoPricesByInstrumentId(instrumentId, limit);
    }
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    // Watermark gate (DEFAULT OFF): when MARKET_DATA_READ_WATERMARK_GATE=1|true,
    // clamp the effective endDate to the latest FINAL_CONFIRMED watermark so
    // mid-ingest rows are never visible to consumers.
    if (isWatermarkGateEnabled()) {
      const region = options.region || stock.region || 'IN';
      const assetType = options.assetType || stock.assetType || 'STOCK';
      const wmDate = await getWatermarkDate(this.host.repository, region, assetType);
      if (wmDate) {
        const wmEndDate = new Date(`${wmDate}T23:59:59.999Z`);
        if (!endDate || endDate > wmEndDate) {
          endDate = wmEndDate;
        }
      }
    }

    // Fetch prices and recent delivery% concurrently (persisted-read, null-safe)
    const [prices, recentDelivery] = await Promise.all([
      this.host.repository.listPrices(stock.symbol, limit, startDate, endDate),
      this.host.repository.getRecentDeliveryBySymbol(stock.symbol, 5, endDate).catch(() => []),
    ]);

    // Build a date-keyed lookup so each price row can carry its delivery%
    const deliveryByDate = new Map<string, number | null>();
    for (const row of recentDelivery) {
      const key = row.tradingDate instanceof Date
        ? row.tradingDate.toISOString().split('T')[0]
        : String(row.tradingDate).split('T')[0];
      if (!deliveryByDate.has(key)) deliveryByDate.set(key, row.deliveryPercent);
    }

    // Latest delivery% for the top-level summary field (most recent trading day)
    const latestDeliveryPercent = recentDelivery[0]?.deliveryPercent ?? null;

    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      adjustment_strategy: 'adjusted_close is not persisted; close is returned as adjusted_close for MVP display.',
      source: prices[0]?.source || 'database',
      ingestion_timestamp: prices[0]?.ingestionTimestamp instanceof Date ? prices[0].ingestionTimestamp.toISOString() : null,
      last_updated_timestamp: prices[0]?.lastUpdatedTimestamp instanceof Date ? prices[0].lastUpdatedTimestamp.toISOString() : null,
      data_status: prices.length > 0 ? 'COMPLETE' : 'MISSING',
      /** Latest NSE delivery% (deliverable qty / traded qty × 100) for this stock.
       *  null when delivery data is absent (e.g. BSE-only stocks, or data not yet ingested). */
      delivery_percent: latestDeliveryPercent,
      prices: prices.map((price: any) => {
        const dateKey = price.timestamp instanceof Date
          ? price.timestamp.toISOString().split('T')[0]
          : String(price.timestamp).split('T')[0];
        return {
          date: price.timestamp,
          open: Number(price.open),
          high: Number(price.high),
          low: Number(price.low),
          close: Number(price.close),
          adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
          volume: price.volume !== null ? Number(price.volume) : null,
          /** Delivery% for this specific trading day (null when absent). */
          delivery_percent: deliveryByDate.has(dateKey) ? deliveryByDate.get(dateKey) ?? null : null,
          source: 'source' in price && price.source ? price.source : 'database',
          ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
          last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
          data_status: price.dataStatus || 'COMPLETE',
        };
      }),
    };
  }

  /**
   * Returns the latest delivery% snapshot for a stock identified by its internal symbol.
   * Passes through directly to the repository (persisted-read, null-safe).
   * Signal generation and other consumers use this for evidence annotation.
   */
  getRecentDeliveryBySymbol(
    symbol: string,
    limit = 5,
    endDate?: Date,
  ) {
    return this.host.repository.getRecentDeliveryBySymbol(symbol, limit, endDate);
  }

  async latestPriceByInstrumentId(instrumentId: string, options: Pick<PaginationOptions, 'region' | 'assetType'> = {}) {
    if (isCryptoScope(options)) {
      const asset = await this.host.cryptoRepository.getAssetById(instrumentId);
      if (!asset) return null;
      const latest = await this.host.cryptoRepository.prisma.cryptoLatestPrice.findUnique({ where: { symbol: asset.symbol } });
      if (!latest) {
        return { instrument_id: asset.id, symbol: asset.symbol, latest: null, data_status: 'PARTIAL' };
      }
      return {
        instrument_id: asset.id,
        symbol: asset.symbol,
        latest: {
          date: latest.timestamp,
          close: Number(latest.price),
          adjusted_close: Number(latest.price),
          source: 'BINANCE_KLINES',
          data_status: 'COMPLETE',
        },
        source: 'BINANCE_KLINES',
        data_status: 'COMPLETE',
      };
    }
    const stock = await this.host.repository.findStockByIdInScope(instrumentId, options);
    if (!stock) {
      return null;
    }

    // Watermark gate (DEFAULT OFF): when enabled, if the latest price date
    // exceeds the FINAL_CONFIRMED watermark treat it as PARTIAL (mid-ingest).
    let watermarkEndDate: Date | null = null;
    if (isWatermarkGateEnabled()) {
      const region = options.region || stock.region || 'IN';
      const assetType = options.assetType || stock.assetType || 'STOCK';
      const wmDate = await getWatermarkDate(this.host.repository, region, assetType);
      watermarkEndDate = wmDate ? new Date(`${wmDate}T23:59:59.999Z`) : null;
    }

    const price = await this.host.repository.latestPrice(stock.symbol);
    if (!price) {
      return {
        instrument_id: stock.id,
        symbol: stock.symbol,
        latest: null,
        data_status: 'PARTIAL',
      };
    }

    // If the price is newer than the watermark, report as PARTIAL (not yet confirmed).
    if (watermarkEndDate && price.timestamp > watermarkEndDate) {
      return {
        instrument_id: stock.id,
        symbol: stock.symbol,
        latest: null,
        data_status: 'PARTIAL',
      };
    }

    return {
      instrument_id: stock.id,
      symbol: stock.symbol,
      latest: {
        date: price.timestamp,
        open: price.open !== null ? Number(price.open) : null,
        high: price.high !== null ? Number(price.high) : null,
        low: price.low !== null ? Number(price.low) : null,
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null ? Number(price.volume) : null,
        source: price.source || 'database',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      },
      source: price.source || 'database',
      ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
      last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
      data_status: price.dataStatus || 'COMPLETE',
    };
  }

  async getLatestPricesBySymbols(symbols: string[]) {
    // Watermark gate (DEFAULT OFF): when enabled, filter out prices beyond the
    // FINAL_CONFIRMED watermark date.  A single lookup covers all symbols
    // (they are all IN/STOCK for the equity use case that calls this method).
    let watermarkEndDate: Date | null = null;
    if (isWatermarkGateEnabled()) {
      // Default region/assetType — getLatestPricesBySymbols has no scope arg.
      const wmDate = await getWatermarkDate(this.host.repository, 'IN', 'STOCK');
      watermarkEndDate = wmDate ? new Date(`${wmDate}T23:59:59.999Z`) : null;
    }

    const prices = await this.host.repository.prisma.priceTick.findMany({
      where: { symbol: { in: symbols } },
      orderBy: { timestamp: 'desc' },
      distinct: ['symbol'],
    });
    return prices
      .filter((price: any) => !watermarkEndDate || price.timestamp <= watermarkEndDate)
      .map((price: any) => ({
        symbol: price.symbol,
        date: price.timestamp,
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        timestamp: price.timestamp,
      }));
  }

  async listRecentPriceWindowsByInstrumentIds(
    instrumentIds: string[],
    limit = 500,
    _options: Pick<PaginationOptions, 'region' | 'assetType'> = {},
    endDate?: Date
  ) {
    const uniqueIds = [...new Set(instrumentIds.filter(Boolean))];
    if (uniqueIds.length === 0) return new Map<string, any[]>();

    // Watermark gate (DEFAULT OFF): clamp endDate to the FINAL_CONFIRMED watermark
    // so mid-ingest rows are never returned.
    if (isWatermarkGateEnabled()) {
      const region = _options.region || 'IN';
      const assetType = _options.assetType || 'STOCK';
      const wmDate = await getWatermarkDate(this.host.repository, region, assetType);
      if (wmDate) {
        const wmEndDate = new Date(`${wmDate}T23:59:59.999Z`);
        if (!endDate || endDate > wmEndDate) {
          endDate = wmEndDate;
        }
      }
    }

    const stocks = await this.host.repository.prisma.stock.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, symbol: true },
    });
    if (stocks.length === 0) return new Map<string, any[]>();

    const safeLimit = Math.max(1, Math.min(Math.floor(Number(limit) || 500), 5000));
    const anchor = endDate ?? new Date();
    const cutoff = new Date(anchor);
    // Use safeLimit * 1.5 calendar-day lookback (300 sessions × 1.5 ≈ 450 days, well above the
    // ~420 calendar days needed for 300 trading sessions).  The old safeLimit * 3 = 900 days
    // pulled roughly 2× the needed rows, doubling BigInt-exposure and result-set size.
    cutoff.setDate(cutoff.getDate() - Math.max(365, Math.ceil(safeLimit * 1.5)));
    const instrumentIdBySymbol = new Map<string, string>(stocks.map((stock: any) => [stock.symbol, stock.id] as [string, string]));
    const symbols = stocks.map((stock: any) => stock.symbol);
    const prices: any[] = [];
    // listPriceWindowsForSymbolChunk uses raw SQL with CAST(volume AS float8) to avoid
    // the Prisma 6 NAPI crash that occurs when BigInt volume values (e.g. IDEA: 8.4B,
    // GTLINFRA: 6.1B) are returned through the Rust→Node NAPI bridge.
    for (let offset = 0; offset < symbols.length; offset += RECENT_PRICE_WINDOW_SYMBOL_CHUNK_SIZE) {
      const symbolChunk = symbols.slice(offset, offset + RECENT_PRICE_WINDOW_SYMBOL_CHUNK_SIZE);
      const chunkPrices = await this.host.repository.listPriceWindowsForSymbolChunk(
        symbolChunk,
        cutoff,
        endDate ?? null,
      );
      prices.push(...chunkPrices);
    }

    const byInstrumentId = new Map(uniqueIds.map((id) => [id, [] as any[]]));
    for (const price of prices) {
      const instrumentId = instrumentIdBySymbol.get(price.symbol);
      if (!instrumentId) continue;
      const bucket = byInstrumentId.get(instrumentId);
      if (!bucket || bucket.length >= safeLimit) continue;
      bucket.push({
        date: price.timestamp,
        open: Number(price.open),
        high: Number(price.high),
        low: Number(price.low),
        close: Number(price.close),
        adjusted_close: price.adjustedClose !== null ? Number(price.adjustedClose) : Number(price.close),
        volume: price.volume !== null ? Number(price.volume) : null,
        source: price.source || 'database',
        ingestion_timestamp: price.ingestionTimestamp instanceof Date ? price.ingestionTimestamp.toISOString() : new Date().toISOString(),
        last_updated_timestamp: price.lastUpdatedTimestamp instanceof Date ? price.lastUpdatedTimestamp.toISOString() : new Date().toISOString(),
        data_status: price.dataStatus || 'COMPLETE',
      });
    }
    return byInstrumentId;
  }

  async latestStoredCandleInfo(region: string, assetType = 'STOCK', now = new Date()) {
    const tradingDate = tradingDateForRegion(region, now);
    const [latestTradingDate, syncState] = await Promise.all([
      this.host.repository.latestStoredTradingDateForRegion(region, assetType),
      tradingDate ? this.host.repository.getSyncState(region, assetType, tradingDate) : Promise.resolve(null),
    ]);

    return {
      latestTradingDate,
      finalConfirmed: syncState?.status === 'FINAL_CONFIRMED',
      syncState,
      tradingDate,
    };
  }
}

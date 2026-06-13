import { Prisma, PrismaClient } from '@prisma/client';
import type { HistoricalPrice, SyncSummary } from '../market-data-foundation.types';
import { partitionHistoricalPrices } from '../ingestion/market-data-foundation.validation';
import { EXCHANGE_PRICE_SOURCES } from './market-data-foundation.repository.constants';
import { normalizeUtcDay, priceStorageKey, sameDecimal, sameNullableBigInt, sameNullableDecimal } from './market-data-foundation.repository.helpers';

export type PriceRegionInfo = { region?: string | null; exchange?: string | null };
export type InferPriceRegion = (symbol: string) => PriceRegionInfo;
export type HistoricalBulkStoreSummary = SyncSummary & {
  summaryBySymbol: Map<string, SyncSummary>;
};
export type HistoricalStoreOptions = {
  sourceFileImportId?: string | null;
  skipLatestPriceUpdate?: boolean;
};

export class PriceRepository {
  private static historicalBulkWriteChain: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaClient) {}



  async filterPricesMissingPrimaryExchangeCandles(prices: HistoricalPrice[], primaryExchange: string): Promise<HistoricalPrice[]> {
    if (prices.length === 0) return [];
    const symbols = [...new Set(prices.map((price) => price.symbol))];
    const timestamps = [...new Set(prices.map((price) => normalizeUtcDay(price.date).toISOString()))]
      .map((date) => new Date(date));
    const primarySources = EXCHANGE_PRICE_SOURCES.filter((source) => source.toUpperCase().startsWith(primaryExchange.toUpperCase()));
    const existing = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: symbols },
        timestamp: { in: timestamps },
        OR: [
          { exchange: { equals: primaryExchange, mode: 'insensitive' } },
          { source: { in: primarySources, mode: 'insensitive' } },
        ],
      },
      select: { symbol: true, timestamp: true },
    });
    const existingKeys = new Set(existing.map((row) => priceStorageKey(row.symbol, normalizeUtcDay(row.timestamp))));
    return prices.filter((price) => !existingKeys.has(priceStorageKey(price.symbol, normalizeUtcDay(price.date))));
  }



  async storeHistorical(
    prices: HistoricalPrice[],
    inferRegion: InferPriceRegion,
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map()
  ): Promise<SyncSummary> {
    const rowsReceived = prices.length;
    const validation = partitionHistoricalPrices(prices);
    const duplicateProviderRowsSkipped = (validation as any).duplicateProviderRowsSkipped || 0;
    const warnings = validation.invalid.flatMap((invalid) =>
      invalid.errors.map((error) => `${(invalid.item as HistoricalPrice)?.symbol || 'UNKNOWN'}: ${error}`)
    );
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before storage`);
    }
    prices = validation.valid;
    if (prices.length === 0) {
      return {
        rowsReceived,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: validation.invalid.length,
        rowsNoOp: 0,
        duplicateProviderRowsSkipped,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
      };
    }

    prices = prices.map((price) => ({ ...price, date: normalizeUtcDay(price.date) }));

    const regionInfo = regionInfoBySymbol.get(prices[0].symbol) ?? inferRegion(prices[0].symbol);
    const latest = prices.reduce((prev, current) =>
      prev.date > current.date ? prev : current
    );
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: prices[0].symbol,
        timestamp: { in: prices.map((price) => price.date) },
      },
      select: { timestamp: true, open: true, high: true, low: true, close: true, adjustedClose: true, volume: true, source: true },
    });
    const existingByTimestamp = new Map(existingRows.map((row) => [row.timestamp.toISOString(), row]));
    const rowsToInsert = prices.filter((price) => !existingByTimestamp.has(price.date.toISOString()));
    const rowsToUpdate = prices.filter((price) => {
      const existing = existingByTimestamp.get(price.date.toISOString());
      return existing ? !this.sameDailyCandle(existing, price) : false;
    });
    const rowsNoOp = prices.length - rowsToInsert.length - rowsToUpdate.length;
    const rowsInserted = rowsToInsert.length;
    const rowsUpdated = rowsToUpdate.length;
    const rowsToWrite = [...rowsToInsert, ...rowsToUpdate];

    console.log(`  Storing ${prices.length} price ticks for ${prices[0].symbol}...`);

    await this.prisma.$transaction(async (tx: any) => {
      const batchSize = 1000;
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize);
        await tx.priceTick.createMany({
          data: batch.map((price) => {
            const source = price.source || 'yahoo';
            return {
              symbol: price.symbol,
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              timestamp: price.date,
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source,
              dataStatus: 'COMPLETE',
            };
          }),
          skipDuplicates: true,
        });
      }

      for (let i = 0; i < rowsToUpdate.length; i += batchSize) {
        const batch = rowsToUpdate.slice(i, i + batchSize);
        await Promise.all(batch.map((price) => {
          const source = price.source || 'yahoo';
          return tx.priceTick.update({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            data: {
              open: new Prisma.Decimal(price.open),
              high: new Prisma.Decimal(price.high),
              low: new Prisma.Decimal(price.low),
              close: new Prisma.Decimal(price.close),
              adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
              volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
              source,
              region: regionInfo.region,
              exchange: regionInfo.exchange,
              dataStatus: 'COMPLETE',
            },
          });
        }));

        if (batch.length === batchSize) {
          console.log(`    Processed ${Math.min(i + batchSize, rowsToWrite.length)} of ${rowsToWrite.length} changed records...`);
        }
      }

      await tx.latestPrice.upsert({
        where: { symbol: latest.symbol },
        update: {
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
        create: {
          symbol: latest.symbol,
          region: regionInfo.region,
          price: new Prisma.Decimal(latest.close),
          timestamp: latest.date,
          updatedAt: new Date(),
        },
      });
    }, {
      maxWait: 30000,
      timeout: 60000,
    });

    console.log(`  Successfully stored ${prices.length} price ticks for ${prices[0].symbol}: ${rowsInserted} inserted, ${rowsUpdated} updated, ${rowsNoOp} no-op`);
    return {
      rowsReceived,
      rowsInserted,
      rowsUpdated,
      rowsSkipped: validation.invalid.length,
      rowsNoOp,
      duplicateProviderRowsSkipped,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
    };
  }



  async storeHistoricalBulk(
    prices: HistoricalPrice[],
    inferRegion: InferPriceRegion,
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreSummary> {
    return this.withHistoricalBulkWriteSlot(() => this.storeHistoricalBulkUnlocked(prices, inferRegion, regionInfoBySymbol, options));
  }



  private async storeHistoricalBulkUnlocked(
    prices: HistoricalPrice[],
    inferRegion: InferPriceRegion,
    regionInfoBySymbol: Map<string, PriceRegionInfo> = new Map(),
    options: HistoricalStoreOptions = {}
  ): Promise<HistoricalBulkStoreSummary> {
    const rowsReceived = prices.length;
    const receivedBySymbol = new Map<string, number>();
    for (const price of prices) {
      receivedBySymbol.set(price.symbol, (receivedBySymbol.get(price.symbol) || 0) + 1);
    }

    const validation = partitionHistoricalPrices(prices);
    const duplicateProviderRowsSkipped = (validation as any).duplicateProviderRowsSkipped || 0;
    const warningBySymbol = new Map<string, string[]>();
    for (const invalid of validation.invalid) {
      const symbol = (invalid.item as HistoricalPrice)?.symbol || 'UNKNOWN';
      const warnings = invalid.errors.map((error) => `${symbol}: ${error}`);
      warningBySymbol.set(symbol, [...(warningBySymbol.get(symbol) || []), ...warnings]);
    }
    if (validation.invalid.length > 0) {
      console.warn(`Skipped ${validation.invalid.length} malformed historical price rows before bulk storage`);
    }

    const validPrices = validation.valid.map((price) => ({ ...price, date: normalizeUtcDay(price.date) }));
    const summaryBySymbol = new Map<string, SyncSummary>();
    const symbols = [...new Set([
      ...Array.from(receivedBySymbol.keys()),
      ...validPrices.map((price) => price.symbol),
    ])];

    if (validPrices.length === 0) {
      const warnings = Array.from(warningBySymbol.values()).flat();
      for (const symbol of symbols) {
        const symbolWarnings = warningBySymbol.get(symbol) || [];
        summaryBySymbol.set(symbol, {
          rowsReceived: receivedBySymbol.get(symbol) || 0,
          rowsInserted: 0,
          rowsUpdated: 0,
          rowsSkipped: symbolWarnings.length > 0 ? 1 : 0,
          rowsNoOp: 0,
          duplicateProviderRowsSkipped,
          warningCount: symbolWarnings.length,
          warnings: symbolWarnings.slice(0, 10),
        });
      }
      return {
        rowsReceived,
        rowsInserted: 0,
        rowsUpdated: 0,
        rowsSkipped: validation.invalid.length,
        rowsNoOp: 0,
        duplicateProviderRowsSkipped,
        warningCount: warnings.length,
        warnings: warnings.slice(0, 10),
        summaryBySymbol,
      };
    }

    const validSymbols = [...new Set(validPrices.map((price) => price.symbol))];
    const validDates = [...new Set(validPrices.map((price) => price.date.toISOString()))].map((date) => new Date(date));
    const existingRows = await this.prisma.priceTick.findMany({
      where: {
        symbol: { in: validSymbols },
        timestamp: { in: validDates },
      },
      select: { symbol: true, timestamp: true, open: true, high: true, low: true, close: true, adjustedClose: true, volume: true, source: true },
    });
    const existingByKey = new Map(existingRows.map((row) => [priceStorageKey(row.symbol, row.timestamp), row]));
    const rowsToInsert = validPrices.filter((price) => !existingByKey.has(priceStorageKey(price.symbol, price.date)));
    const rowsToUpdate = validPrices.filter((price) => {
      const existing = existingByKey.get(priceStorageKey(price.symbol, price.date));
      return existing ? !this.sameDailyCandle(existing, price) : false;
    });
    const rowsNoOp = validPrices.length - rowsToInsert.length - rowsToUpdate.length;
    const latestBySymbol = this.latestHistoricalPriceBySymbol(validPrices);

    console.log(`  Bulk storing ${validPrices.length} price ticks across ${validSymbols.length} symbols...`);

    const batchSize = this.exchangeBulkWriteBatchSize();
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const batch = rowsToInsert.slice(i, i + batchSize);
      await this.prisma.$transaction(async (tx: any) => {
        await tx.priceTick.createMany({
          data: batch.map((price) => this.priceTickCreateData(price, regionInfoBySymbol.get(price.symbol) ?? inferRegion(price.symbol), options)),
          skipDuplicates: true,
        });
      }, {
        maxWait: 30000,
        timeout: 60000,
      });
    }

    for (let i = 0; i < rowsToUpdate.length; i += batchSize) {
      const batch = rowsToUpdate.slice(i, i + batchSize);
      await this.prisma.$transaction(async (tx: any) => {
        for (const price of batch) {
          const regionInfo = regionInfoBySymbol.get(price.symbol) ?? inferRegion(price.symbol);
          await tx.priceTick.update({
            where: {
              symbol_timestamp: {
                symbol: price.symbol,
                timestamp: price.date,
              },
            },
            data: this.priceTickUpdateData(price, regionInfo, options),
          });
        }
      }, {
        maxWait: 30000,
        timeout: 60000,
      });
    }

    if (options.skipLatestPriceUpdate !== true) {
      const latestEntries = Array.from(latestBySymbol.entries());
      for (let i = 0; i < latestEntries.length; i += 100) {
        const batch = latestEntries.slice(i, i + 100);
        await this.prisma.$transaction(async (tx: any) => {
          for (const [symbol, latest] of batch) {
            const regionInfo = regionInfoBySymbol.get(symbol) ?? inferRegion(symbol);
            await tx.latestPrice.upsert({
              where: { symbol },
              update: {
                region: regionInfo.region,
                price: new Prisma.Decimal(latest.close),
                timestamp: latest.date,
                updatedAt: new Date(),
              },
              create: {
                symbol,
                region: regionInfo.region,
                price: new Prisma.Decimal(latest.close),
                timestamp: latest.date,
                updatedAt: new Date(),
              },
            });
          }
        }, {
          maxWait: 30000,
          timeout: 60000,
        });
      }
    }

    const insertedBySymbol = this.countPricesBySymbol(rowsToInsert);
    const updatedBySymbol = this.countPricesBySymbol(rowsToUpdate);
    const validBySymbol = this.countPricesBySymbol(validPrices);
    for (const symbol of symbols) {
      const symbolWarnings = warningBySymbol.get(symbol) || [];
      const validCount = validBySymbol.get(symbol) || 0;
      const inserted = insertedBySymbol.get(symbol) || 0;
      const updated = updatedBySymbol.get(symbol) || 0;
      summaryBySymbol.set(symbol, {
        rowsReceived: receivedBySymbol.get(symbol) || validCount,
        rowsInserted: inserted,
        rowsUpdated: updated,
        rowsSkipped: symbolWarnings.length > 0 ? 1 : 0,
        rowsNoOp: Math.max(0, validCount - inserted - updated),
        duplicateProviderRowsSkipped,
        warningCount: symbolWarnings.length,
        warnings: symbolWarnings.slice(0, 10),
      });
    }

    const warnings = Array.from(warningBySymbol.values()).flat();
    console.log(`  Successfully bulk stored ${validPrices.length} price ticks: ${rowsToInsert.length} inserted, ${rowsToUpdate.length} updated, ${rowsNoOp} no-op`);
    return {
      rowsReceived,
      rowsInserted: rowsToInsert.length,
      rowsUpdated: rowsToUpdate.length,
      rowsSkipped: validation.invalid.length,
      rowsNoOp,
      duplicateProviderRowsSkipped,
      warningCount: warnings.length,
      warnings: warnings.slice(0, 10),
      summaryBySymbol,
    };
  }



  private async withHistoricalBulkWriteSlot<T>(operation: () => Promise<T>): Promise<T> {
    const previous = PriceRepository.historicalBulkWriteChain.catch(() => undefined);
    let release!: () => void;
    PriceRepository.historicalBulkWriteChain = previous.then(() => new Promise<void>((resolve) => {
      release = resolve;
    }));
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }



  private exchangeBulkWriteBatchSize(): number {
    const raw = Number(process.env.MARKET_DATA_EXCHANGE_BULK_WRITE_BATCH_SIZE || 500);
    if (!Number.isFinite(raw)) return 500;
    return Math.max(100, Math.min(Math.floor(raw), 1000));
  }



  private priceTickCreateData(price: HistoricalPrice, regionInfo: PriceRegionInfo, options: HistoricalStoreOptions = {}) {
    const source = price.source || 'yahoo';
    return {
      symbol: price.symbol,
      region: regionInfo.region,
      exchange: regionInfo.exchange ?? null,
      timestamp: price.date,
      open: new Prisma.Decimal(price.open),
      high: new Prisma.Decimal(price.high),
      low: new Prisma.Decimal(price.low),
      close: new Prisma.Decimal(price.close),
      adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
      volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
      source,
      sourceFileImportId: options.sourceFileImportId ?? null,
      dataStatus: 'COMPLETE',
    };
  }



  private priceTickUpdateData(price: HistoricalPrice, regionInfo: PriceRegionInfo, options: HistoricalStoreOptions = {}) {
    const source = price.source || 'yahoo';
    return {
      open: new Prisma.Decimal(price.open),
      high: new Prisma.Decimal(price.high),
      low: new Prisma.Decimal(price.low),
      close: new Prisma.Decimal(price.close),
      adjustedClose: price.adjustedClose !== undefined && price.adjustedClose !== null ? new Prisma.Decimal(price.adjustedClose) : null,
      volume: price.volume !== undefined && price.volume !== null ? BigInt(price.volume) : null,
      source,
      ...(options.sourceFileImportId !== undefined ? { sourceFileImportId: options.sourceFileImportId } : {}),
      region: regionInfo.region,
      exchange: regionInfo.exchange ?? null,
      dataStatus: 'COMPLETE',
    };
  }



  private sameDailyCandle(existing: any, price: HistoricalPrice): boolean {
    return sameDecimal(existing.open, price.open)
      && sameDecimal(existing.high, price.high)
      && sameDecimal(existing.low, price.low)
      && sameDecimal(existing.close, price.close)
      && sameNullableDecimal(existing.adjustedClose, price.adjustedClose ?? null)
      && sameNullableBigInt(existing.volume, price.volume ?? null)
      && String(existing.source || 'yahoo') === String(price.source || 'yahoo');
  }



  private latestHistoricalPriceBySymbol(prices: HistoricalPrice[]): Map<string, HistoricalPrice> {
    const latestBySymbol = new Map<string, HistoricalPrice>();
    for (const price of prices) {
      const current = latestBySymbol.get(price.symbol);
      if (!current || current.date < price.date) {
        latestBySymbol.set(price.symbol, price);
      }
    }
    return latestBySymbol;
  }



  private countPricesBySymbol(prices: HistoricalPrice[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const price of prices) {
      counts.set(price.symbol, (counts.get(price.symbol) || 0) + 1);
    }
    return counts;
  }
}

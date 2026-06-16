import type { PrismaClient } from '@prisma/client';
import prisma from '../../db/prisma';
import { resolveMarketProfile } from '../../shared/utils/market-profile';
import type {
  MarketPulseAdvanceDeclineSummary,
  MarketPulseCalculationData,
  MarketPulseDeliveryPoint,
  MarketPulsePricePoint,
  MarketPulseRefreshRequest,
  MarketPulseScope,
  MarketPulseSnapshotInput,
  MarketPulseSnapshotRecord,
  MarketPulseSourceImport,
  MarketPulseStockUniverseItem,
  MarketPulseVixSummary,
} from './market-pulse-snapshot.types';

// Used in toRecord default values below (TS needs the types for the cast).
const UNAVAILABLE_VIX: MarketPulseVixSummary = { latest: null, low5d: null, high5d: null, asOf: null, posture: 'UNAVAILABLE' };
const EMPTY_AD: MarketPulseAdvanceDeclineSummary = { advances: 0, declines: 0, ratio: null, asOf: null };

const PRICE_LOOKBACK_DAYS = 420;
const DELIVERY_LOOKBACK_DAYS = 90;
const PRICE_SYMBOL_BATCH_SIZE = 500;
// IN-specific NSE index sources. Non-IN regions filter by an explicit caret-prefixed
// index allowlist instead (Yahoo tags all equities YAHOO_EOD, so source can't identify
// an index — but a curated symbol allowlist never matches an equity).
const INDEX_PRICE_SOURCES_IN = ['NSE_INDEX_EOD', 'NIFTY_SECTOR_INDEX'];
// Non-IN index symbols surfaced on Market Pulse Key Indices (+ volatility). Symbols not
// yet seeded simply return no rows — harmless. Falls back to the region benchmark.
const NON_IN_INDEX_SYMBOLS_BY_REGION: Record<string, string[]> = {
  US: ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX'],
};
const SOURCE_SEGMENTS = ['CM', 'INDEX', 'SECTOR_INDEX', 'DELIVERY'];

export class MarketPulseSnapshotRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async latestSnapshot(scope: MarketPulseScope): Promise<MarketPulseSnapshotRecord | null> {
    const row = await (this.db as any).marketPulseSnapshot.findFirst({
      where: {
        region: this.normalizeRegion(scope.region),
        assetType: this.normalizeAssetType(scope.assetType),
        timeframe: this.normalizeTimeframe(scope.timeframe),
      },
      orderBy: [{ snapshotDate: 'desc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return row ? this.toRecord(row) : null;
  }

  async snapshotHistory(scope: MarketPulseScope & { limit?: number }): Promise<MarketPulseSnapshotRecord[]> {
    const rows = await (this.db as any).marketPulseSnapshot.findMany({
      where: {
        region: this.normalizeRegion(scope.region),
        assetType: this.normalizeAssetType(scope.assetType),
        timeframe: this.normalizeTimeframe(scope.timeframe),
      },
      orderBy: [{ snapshotDate: 'desc' }, { generatedAt: 'desc' }, { updatedAt: 'desc' }],
      take: Math.max(1, Math.min(Number(scope.limit) || 25, 100)),
    });
    return rows.map((row: unknown) => this.toRecord(row));
  }

  async upsertSnapshot(input: MarketPulseSnapshotInput): Promise<MarketPulseSnapshotRecord> {
    const data = this.toPersistenceData(input);
    const row = await (this.db as any).marketPulseSnapshot.upsert({
      where: {
        snapshotDate_region_assetType_timeframe: {
          snapshotDate: input.snapshotDate,
          region: input.region,
          assetType: input.assetType,
          timeframe: input.timeframe,
        },
      },
      create: data,
      update: {
        dataThroughDate: data.dataThroughDate,
        generatedAt: data.generatedAt,
        status: data.status,
        marketHealthScore: data.marketHealthScore,
        marketHealthLabel: data.marketHealthLabel,
        indexTrendScore: data.indexTrendScore,
        sectorStrengthScore: data.sectorStrengthScore,
        breadthScore: data.breadthScore,
        deliveryParticipationScore: data.deliveryParticipationScore,
        dataFreshnessScore: data.dataFreshnessScore,
        topIndicesJson: data.topIndicesJson,
        strongSectorsJson: data.strongSectorsJson,
        weakSectorsJson: data.weakSectorsJson,
        breadthSummaryJson: data.breadthSummaryJson,
        deliverySummaryJson: data.deliverySummaryJson,
        candidateCount: data.candidateCount,
        warningsJson: data.warningsJson,
        sourceSummaryJson: data.sourceSummaryJson,
        vixSummaryJson: data.vixSummaryJson,
        advanceDeclineJson: data.advanceDeclineJson,
        pipelineRunId: data.pipelineRunId,
      },
    });
    return this.toRecord(row);
  }

  async loadCalculationData(request: MarketPulseRefreshRequest): Promise<MarketPulseCalculationData> {
    const region = this.normalizeRegion(request.region);
    const assetType = this.normalizeAssetType(request.assetType);
    const generatedAt = request.generatedAt || new Date();
    const priceSince = new Date(generatedAt.getTime() - PRICE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const deliverySince = new Date(generatedAt.getTime() - DELIVERY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const normalizedRegion = String(region || '').trim().toUpperCase();
    const isIN = normalizedRegion === 'IN';

    const [stockUniverse, indexPrices, deliverySnapshots, sourceImports, nonInSectorPrices] = await Promise.all([
      this.loadStockUniverse(region, assetType),
      this.loadIndexPricePoints(region, priceSince),
      this.loadDeliverySnapshots(deliverySince),
      this.loadSourceImports(region),
      // Non-IN sector proxies: SPDR sector ETFs (US) supply the pulse's sector-strength score
      // (Yahoo tags all equities YAHOO_EOD, so the index-price query can't pick them up).
      isIN ? Promise.resolve([] as MarketPulsePricePoint[]) : this.loadSectorEtfPrices(region, priceSince),
    ]);
    const stockPrices = await this.loadStockPricePoints(region, stockUniverse.map((stock) => stock.symbol), priceSince);
    return {
      region,
      assetType,
      stockUniverse,
      stockPrices,
      // IN: split NSE_INDEX_EOD (headline indices + VIX) vs NIFTY_SECTOR_INDEX (sector indices).
      // non-IN: all YAHOO_EOD rows go to indexPrices; sectorIndexPrices is empty until a sector
      // index seed is built for US/EU.
      indexPrices: isIN
        ? indexPrices.filter((price) => String(price.source || '').toUpperCase() === 'NSE_INDEX_EOD')
        : indexPrices,
      sectorIndexPrices: isIN
        ? indexPrices.filter((price) => String(price.source || '').toUpperCase() === 'NIFTY_SECTOR_INDEX')
        : nonInSectorPrices,
      deliverySnapshots,
      sourceImports,
    };
  }

  private async loadStockUniverse(region: string, assetType: string): Promise<MarketPulseStockUniverseItem[]> {
    const rows = await (this.db as any).stock.findMany({
      where: {
        region,
        assetType,
        isActive: true,
        isDelisted: false,
      },
      select: {
        id: true,
        symbol: true,
        sector: true,
        marketCap: true,
      },
      orderBy: { symbol: 'asc' },
    });
    return rows.map((row: any) => ({
      id: row.id,
      symbol: row.symbol,
      sector: row.sector ?? null,
      marketCap: row.marketCap === null || row.marketCap === undefined ? null : Number(row.marketCap),
    }));
  }

  private async loadStockPricePoints(region: string, symbols: string[], since: Date): Promise<MarketPulsePricePoint[]> {
    const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean))];
    const rows: unknown[] = [];
    for (let index = 0; index < uniqueSymbols.length; index += PRICE_SYMBOL_BATCH_SIZE) {
      const chunk = uniqueSymbols.slice(index, index + PRICE_SYMBOL_BATCH_SIZE);
      const chunkRows = await (this.db as any).priceTick.findMany({
        where: {
          region,
          symbol: { in: chunk },
          timestamp: { gte: since },
        },
        select: {
          symbol: true,
          timestamp: true,
          close: true,
          adjustedClose: true,
          volume: true,
          source: true,
        },
        orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
      });
      for (const row of chunkRows) rows.push(row); // not push(...chunkRows): spread overflows the stack on large (US) chunks
    }
    return rows.map((row) => this.toPricePoint(row));
  }

  private async loadIndexPricePoints(region: string, since: Date): Promise<MarketPulsePricePoint[]> {
    // Index price sources are region-specific:
    //   IN  → NSE_INDEX_EOD + NIFTY_SECTOR_INDEX
    //   US  → YAHOO_EOD  (Yahoo Finance writes ^GSPC price ticks with this source tag)
    //   others → YAHOO_EOD (same provider used for non-IN equity seeds)
    const normalizedRegion = String(region || '').trim().toUpperCase();
    // IN uses index-specific source tags (NSE_INDEX_EOD/NIFTY_SECTOR_INDEX). Non-IN
    // providers (Yahoo) tag EVERY equity with the same source (YAHOO_EOD), so source
    // cannot distinguish an index from a stock — that would surface random stocks as
    // "indices". Restrict non-IN to a curated index-symbol allowlist (e.g. US → ^GSPC,
    // ^IXIC, ^DJI, ^RUT, ^VIX), falling back to the region benchmark for other regions.
    const nonInIndexSymbols = NON_IN_INDEX_SYMBOLS_BY_REGION[normalizedRegion]
      ?? [resolveMarketProfile({ region }).benchmark.symbol];
    const where: Record<string, unknown> = normalizedRegion === 'IN'
      ? { region, source: { in: INDEX_PRICE_SOURCES_IN }, timestamp: { gte: since } }
      : { region, symbol: { in: nonInIndexSymbols }, timestamp: { gte: since } };
    const rows = await (this.db as any).priceTick.findMany({
      where,
      select: {
        symbol: true,
        timestamp: true,
        close: true,
        adjustedClose: true,
        volume: true,
        source: true,
      },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
    });
    return rows.map((row: unknown) => this.toPricePoint(row));
  }

  /**
   * Non-IN sector proxies for the pulse sector-strength score. US uses the 11 SPDR
   * sector ETFs (the same set the sector-rotation pipeline uses). Returns [] for
   * regions without curated sector proxies.
   */
  private async loadSectorEtfPrices(region: string, since: Date): Promise<MarketPulsePricePoint[]> {
    const SECTOR_ETF_SYMBOLS_BY_REGION: Record<string, string[]> = {
      US: ['XLK', 'XLF', 'XLV', 'XLE', 'XLY', 'XLP', 'XLI', 'XLB', 'XLRE', 'XLU', 'XLC'],
    };
    const symbols = SECTOR_ETF_SYMBOLS_BY_REGION[String(region || '').trim().toUpperCase()] || [];
    if (symbols.length === 0) return [];
    const rows = await (this.db as any).priceTick.findMany({
      where: { region, symbol: { in: symbols }, timestamp: { gte: since } },
      select: { symbol: true, timestamp: true, close: true, adjustedClose: true, volume: true, source: true },
      orderBy: [{ symbol: 'asc' }, { timestamp: 'desc' }],
    });
    return rows.map((row: unknown) => this.toPricePoint(row));
  }

  private async loadDeliverySnapshots(since: Date): Promise<MarketPulseDeliveryPoint[]> {
    const rows = await (this.db as any).marketDeliverySnapshot.findMany({
      where: {
        tradingDate: { gte: since },
      },
      select: {
        symbol: true,
        tradingDate: true,
        deliveryPercent: true,
        tradedQuantity: true,
        deliverableQuantity: true,
      },
      orderBy: [{ tradingDate: 'desc' }, { symbol: 'asc' }],
    });
    return rows.map((row: any) => ({
      symbol: row.symbol,
      tradingDate: row.tradingDate,
      deliveryPercent: row.deliveryPercent === null || row.deliveryPercent === undefined ? null : Number(row.deliveryPercent),
      tradedQuantity: row.tradedQuantity === null || row.tradedQuantity === undefined ? null : Number(row.tradedQuantity),
      deliverableQuantity: row.deliverableQuantity === null || row.deliverableQuantity === undefined ? null : Number(row.deliverableQuantity),
    }));
  }

  private async loadSourceImports(region: string): Promise<MarketPulseSourceImport[]> {
    const [rows, sectorPriceRows] = await Promise.all([
      (this.db as any).sourceFileImport.findMany({
        where: {
          segment: { in: SOURCE_SEGMENTS },
          status: 'COMPLETED',
        },
        select: {
          source: true,
          segment: true,
          status: true,
          tradingDate: true,
          importedAt: true,
        },
        orderBy: [{ tradingDate: 'desc' }, { importedAt: 'desc' }],
        take: 100,
      }),
      (this.db as any).priceTick.findMany({
        where: {
          region,
          source: 'NIFTY_SECTOR_INDEX',
          sourceFileImportId: { not: null },
        },
        select: {
          timestamp: true,
          sourceFileImport: {
            select: {
              source: true,
              segment: true,
              status: true,
              tradingDate: true,
              importedAt: true,
            },
          },
        },
        orderBy: [{ timestamp: 'desc' }, { ingestionTimestamp: 'desc' }],
        take: 100,
      }),
    ]);
    return [
      ...rows.map((row: any) => ({
        source: row.source,
        segment: row.segment,
        status: row.status,
        tradingDate: row.tradingDate,
        importedAt: row.importedAt ?? null,
      })),
      ...this.sectorIndexImportsFromPriceProvenance(sectorPriceRows),
    ];
  }

  private sectorIndexImportsFromPriceProvenance(rows: any[]): MarketPulseSourceImport[] {
    const latestByImportDate = new Map<string, MarketPulseSourceImport>();
    for (const row of rows) {
      const sourceImport = row.sourceFileImport;
      if (!sourceImport || String(sourceImport.status).toUpperCase() !== 'COMPLETED') continue;
      if (String(sourceImport.source || '').toUpperCase() !== 'NSE') continue;
      if (String(sourceImport.segment || '').toUpperCase() !== 'INDEX') continue;
      const tradingDate = sourceImport.tradingDate instanceof Date ? sourceImport.tradingDate : row.timestamp;
      if (!(tradingDate instanceof Date)) continue;
      const key = tradingDate.toISOString();
      if (latestByImportDate.has(key)) continue;
      latestByImportDate.set(key, {
        source: sourceImport.source,
        segment: 'SECTOR_INDEX',
        status: sourceImport.status,
        tradingDate,
        importedAt: sourceImport.importedAt ?? null,
      });
    }
    return [...latestByImportDate.values()];
  }

  private toPricePoint(row: any): MarketPulsePricePoint {
    return {
      symbol: row.symbol,
      label: row.symbol,
      source: row.source ?? null,
      timestamp: row.timestamp,
      close: Number(row.adjustedClose ?? row.close),
      adjustedClose: row.adjustedClose === null || row.adjustedClose === undefined ? null : Number(row.adjustedClose),
      volume: row.volume === null || row.volume === undefined ? null : Number(row.volume),
    };
  }

  private toPersistenceData(input: MarketPulseSnapshotInput) {
    return {
      snapshotDate: input.snapshotDate,
      dataThroughDate: input.dataThroughDate,
      generatedAt: input.generatedAt,
      region: input.region,
      assetType: input.assetType,
      timeframe: input.timeframe,
      status: input.status,
      marketHealthScore: input.marketHealthScore,
      marketHealthLabel: input.marketHealthLabel,
      indexTrendScore: input.indexTrendScore,
      sectorStrengthScore: input.sectorStrengthScore,
      breadthScore: input.breadthScore,
      deliveryParticipationScore: input.deliveryParticipationScore,
      dataFreshnessScore: input.dataFreshnessScore,
      topIndicesJson: input.topIndicesJson,
      strongSectorsJson: input.strongSectorsJson,
      weakSectorsJson: input.weakSectorsJson,
      breadthSummaryJson: input.breadthSummaryJson,
      deliverySummaryJson: input.deliverySummaryJson,
      candidateCount: input.candidateCount,
      warningsJson: input.warningsJson,
      sourceSummaryJson: input.sourceSummaryJson,
      vixSummaryJson: input.vixSummaryJson,
      advanceDeclineJson: input.advanceDeclineJson,
      pipelineRunId: input.pipelineRunId ?? null,
    };
  }

  private toRecord(row: any): MarketPulseSnapshotRecord {
    return {
      id: row.id,
      snapshotDate: row.snapshotDate,
      dataThroughDate: row.dataThroughDate,
      generatedAt: row.generatedAt,
      region: row.region,
      assetType: row.assetType,
      timeframe: row.timeframe,
      status: row.status,
      marketHealthScore: Number(row.marketHealthScore),
      marketHealthLabel: row.marketHealthLabel,
      indexTrendScore: Number(row.indexTrendScore),
      sectorStrengthScore: Number(row.sectorStrengthScore),
      breadthScore: Number(row.breadthScore),
      deliveryParticipationScore: Number(row.deliveryParticipationScore),
      dataFreshnessScore: Number(row.dataFreshnessScore),
      topIndicesJson: Array.isArray(row.topIndicesJson) ? row.topIndicesJson : [],
      strongSectorsJson: Array.isArray(row.strongSectorsJson) ? row.strongSectorsJson : [],
      weakSectorsJson: Array.isArray(row.weakSectorsJson) ? row.weakSectorsJson : [],
      breadthSummaryJson: row.breadthSummaryJson || {},
      deliverySummaryJson: row.deliverySummaryJson || {},
      candidateCount: Number(row.candidateCount || 0),
      warningsJson: Array.isArray(row.warningsJson) ? row.warningsJson.map(String) : [],
      sourceSummaryJson: row.sourceSummaryJson || {},
      vixSummaryJson: row.vixSummaryJson || UNAVAILABLE_VIX,
      advanceDeclineJson: row.advanceDeclineJson || EMPTY_AD,
      pipelineRunId: row.pipelineRunId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private normalizeRegion(region: string | undefined): string {
    return String(region || 'IN').trim().toUpperCase() || 'IN';
  }

  private normalizeAssetType(assetType: string | undefined): string {
    return String(assetType || 'STOCK').trim().toUpperCase() || 'STOCK';
  }

  private normalizeTimeframe(timeframe: string | undefined): string {
    return String(timeframe || '1d').trim().toLowerCase() || '1d';
  }
}

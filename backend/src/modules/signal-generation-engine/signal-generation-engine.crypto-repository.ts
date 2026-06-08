import { PrismaClient } from '@prisma/client';
import defaultPrisma from '../../db/prisma';

/**
 * Crypto signal repository — owns crypto_signal_results + crypto_signal_generation_runs.
 *
 * Uses the SHARED Prisma singleton with the crypto delegates so a crypto signal
 * write never reaches the equity signal_results table.  Read methods back the
 * crypto signals API surface (instrument detail + top signals).
 */

export interface CryptoSignalRunInput {
  modelVersion: string;
  rulesetVersion: string;
  generatedDate: Date;
  requestedByUserId?: string;
  batchSize: number;
  totalCount: number;
}

export interface CryptoSignalUpsert {
  instrumentId: string;
  symbol: string;
  companyName?: string | null;
  generationRunId?: string | null;
  score: number;
  direction: string;
  confidence: string;
  triggeredSignals: unknown;
  negativeSignals: unknown;
  explanation: string;
  generatedAt: Date;
  generatedDate: Date;
  modelVersion: string;
  rulesetVersion?: string | null;
  sourceDataDate?: Date | null;
  sourcePriceDate?: Date | null;
  dataStatus?: string;
}

export interface CryptoSignalQuery {
  direction?: string;
  minScore?: number;
  limit?: number;
  offset?: number;
  modelVersion?: string;
}

export class CryptoSignalGenerationRepository {
  constructor(public readonly prisma: PrismaClient = defaultPrisma) {}

  async createRun(input: CryptoSignalRunInput) {
    return this.prisma.cryptoSignalGenerationRun.create({
      data: {
        region: 'GLOBAL',
        assetType: 'CRYPTO',
        requestedByUserId: input.requestedByUserId ?? 'system',
        status: 'RUNNING',
        modelVersion: input.modelVersion,
        rulesetVersion: input.rulesetVersion,
        generatedDate: input.generatedDate,
        batchSize: input.batchSize,
        offset: 0,
        totalCount: input.totalCount,
        warnings: [],
      },
      select: { id: true },
    });
  }

  async finalizeRun(
    id: string,
    counts: { processedCount: number; generatedCount: number; updatedCount: number; skippedCount: number; failedCount: number; durationMs: number; warnings?: string[] }
  ) {
    return this.prisma.cryptoSignalGenerationRun.update({
      where: { id },
      data: {
        status: counts.failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
        processedCount: counts.processedCount,
        generatedCount: counts.generatedCount,
        updatedCount: counts.updatedCount,
        skippedCount: counts.skippedCount,
        failedCount: counts.failedCount,
        durationMs: counts.durationMs,
        warnings: counts.warnings ?? [],
        completedAt: new Date(),
      },
    });
  }

  /** Upsert a crypto signal by the (instrument, modelVersion, generatedDate) key. Returns created flag. */
  async upsertSignal(input: CryptoSignalUpsert): Promise<{ created: boolean }> {
    const existing = await this.prisma.cryptoSignalResult.findUnique({
      where: {
        instrumentId_modelVersion_generatedDate: {
          instrumentId: input.instrumentId,
          modelVersion: input.modelVersion,
          generatedDate: input.generatedDate,
        },
      },
      select: { id: true },
    });
    const data = {
      generationRunId: input.generationRunId ?? null,
      symbol: input.symbol,
      companyName: input.companyName ?? null,
      sector: null,
      country: null,
      score: input.score,
      direction: input.direction,
      confidence: input.confidence,
      triggeredSignals: (input.triggeredSignals ?? []) as object,
      negativeSignals: (input.negativeSignals ?? []) as object,
      explanation: input.explanation,
      generatedAt: input.generatedAt,
      modelVersion: input.modelVersion,
      rulesetVersion: input.rulesetVersion ?? null,
      sourceDataDate: input.sourceDataDate ?? null,
      sourcePriceDate: input.sourcePriceDate ?? null,
      source: 'crypto-signal-generation',
      dataStatus: input.dataStatus ?? 'PARTIAL',
    };
    await this.prisma.cryptoSignalResult.upsert({
      where: {
        instrumentId_modelVersion_generatedDate: {
          instrumentId: input.instrumentId,
          modelVersion: input.modelVersion,
          generatedDate: input.generatedDate,
        },
      },
      create: { instrumentId: input.instrumentId, generatedDate: input.generatedDate, ...data },
      update: data,
    });
    return { created: !existing };
  }

  /** Latest persisted crypto signal for an instrument (persisted-read; no recompute). */
  async latestForInstrument(instrumentId: string) {
    return this.prisma.cryptoSignalResult.findFirst({
      where: { instrumentId },
      orderBy: { generatedAt: 'desc' },
    });
  }

  /**
   * Batch-load latest + previous close per symbol so signal rows can surface a live
   * price + daily change (crypto_latest_prices for current, prior tick for previousClose).
   */
  async pricesForSymbols(symbols: string[]): Promise<Map<string, { currentPrice: number | null; previousClose: number | null; priceTimestamp: string | null }>> {
    const map = new Map<string, { currentPrice: number | null; previousClose: number | null; priceTimestamp: string | null }>();
    const unique = [...new Set(symbols.filter(Boolean))];
    if (unique.length === 0) return map;
    const latest = await this.prisma.cryptoLatestPrice.findMany({ where: { symbol: { in: unique } } });
    const latestBySymbol = new Map(latest.map((l) => [l.symbol, l]));
    await Promise.all(unique.map(async (symbol) => {
      const ticks = await this.prisma.cryptoPriceTick.findMany({
        where: { symbol },
        orderBy: { timestamp: 'desc' },
        take: 2,
        select: { close: true, timestamp: true },
      });
      const lp = latestBySymbol.get(symbol);
      const currentPrice = lp ? Number(lp.price) : ticks[0] ? Number(ticks[0].close) : null;
      const previousClose = ticks[1] ? Number(ticks[1].close) : null;
      const priceTimestamp = lp?.timestamp ? lp.timestamp.toISOString() : ticks[0]?.timestamp ? ticks[0].timestamp.toISOString() : null;
      map.set(symbol, { currentPrice, previousClose, priceTimestamp });
    }));
    return map;
  }

  /** Crypto signal-plane health: total persisted signals + latest generation timestamp. */
  async health(): Promise<{ count: number; latestGeneratedAt: Date | null; dataStatus: 'COMPLETE' | 'MISSING' }> {
    const [count, latest] = await Promise.all([
      this.prisma.cryptoSignalResult.count(),
      this.prisma.cryptoSignalResult.findFirst({ orderBy: { generatedAt: 'desc' }, select: { generatedAt: true } }),
    ]);
    return { count, latestGeneratedAt: latest?.generatedAt ?? null, dataStatus: latest ? 'COMPLETE' : 'MISSING' };
  }

  /** Top crypto signals (persisted-read) for the dashboard/screener. */
  async topSignals(query: CryptoSignalQuery = {}) {
    const where: Record<string, unknown> = {};
    if (query.direction) where.direction = query.direction;
    if (typeof query.minScore === 'number') where.score = { gte: query.minScore };
    const [items, total, bullish, bearish, neutral] = await Promise.all([
      this.prisma.cryptoSignalResult.findMany({
        where,
        orderBy: [{ score: 'desc' }, { generatedAt: 'desc' }],
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.cryptoSignalResult.count({ where }),
      this.prisma.cryptoSignalResult.count({ where: { direction: 'BULLISH' } }),
      this.prisma.cryptoSignalResult.count({ where: { direction: 'BEARISH' } }),
      this.prisma.cryptoSignalResult.count({ where: { direction: 'NEUTRAL' } }),
    ]);
    return { items, total, directionCounts: { BULLISH: bullish, BEARISH: bearish, NEUTRAL: neutral } };
  }
}

export const cryptoSignalGenerationRepository = new CryptoSignalGenerationRepository();

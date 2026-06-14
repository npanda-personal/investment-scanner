import { Prisma } from '@prisma/client';
import prisma from '../../db/prisma';
import type {
  DataQualityEvaluationDto,
  DataQualityQuery,
  DataQualitySummary,
  DataQualityTierEvidence,
  DataQualityUseCaseTier,
  DataQualityUseCaseTiers,
} from './data-quality-engine.types';
import { resolveRelatedMarketRegionFilter } from '../../shared/utils/market-scope';
import { TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING } from './data-quality-engine.constants';
import { deriveUseCaseTiers } from './data-quality-engine.use-case-tiers';
import { recommendedFixes } from './data-quality-engine.recommended-fixes';
import { jsonStringArray } from './data-quality-engine.utils';

export class DataQualityEngineRepository {
  constructor(private readonly db = prisma) {}

  async upsertEligibility(params: {
    instrumentId: string;
    tradingDate: Date;
    values: Record<string, unknown>;
  }): Promise<void> {
    await this.db.instrumentEligibility.upsert({
      where: {
        instrumentId_tradingDate: {
          instrumentId: params.instrumentId,
          tradingDate: params.tradingDate,
        },
      },
      create: {
        instrumentId: params.instrumentId,
        tradingDate: params.tradingDate,
        ...(params.values as object),
      } as Prisma.InstrumentEligibilityUncheckedCreateInput,
      update: params.values as Prisma.InstrumentEligibilityUncheckedUpdateInput,
    });
  }

  async findEligibilityRows(params: {
    instrumentIds: string[];
    tradingDate?: Date;
  }): Promise<unknown[]> {
    if (params.instrumentIds.length === 0) return [];
    if (params.tradingDate) {
      return this.db.instrumentEligibility.findMany({
        where: {
          instrumentId: { in: params.instrumentIds },
          tradingDate: params.tradingDate,
        },
      });
    }
    return this.db.instrumentEligibility.findMany({
      where: { instrumentId: { in: params.instrumentIds } },
      orderBy: { tradingDate: 'desc' },
    });
  }

  async upsertEvaluation(evaluation: DataQualityEvaluationDto): Promise<DataQualityEvaluationDto> {
    const saved = await this.db.dataQualityEvaluation.upsert({
      where: { instrumentId: evaluation.instrumentId },
      create: this.toWrite(evaluation),
      update: this.toWrite(evaluation),
    });
    return this.toDto(saved);
  }

  async latestForInstrument(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    const evaluation = await this.db.dataQualityEvaluation.findUnique({ where: { instrumentId } });
    return evaluation ? this.toDto(evaluation) : null;
  }

  async latestForInstruments(instrumentIds: string[]): Promise<DataQualityEvaluationDto[]> {
    if (instrumentIds.length === 0) return [];
    const evaluations = await this.db.dataQualityEvaluation.findMany({
      where: { instrumentId: { in: instrumentIds } },
    });
    return evaluations.map((evaluation) => this.toDto(evaluation));
  }

  async list(query: DataQualityQuery): Promise<DataQualityEvaluationDto[]> {
    const rows = await this.db.dataQualityEvaluation.findMany({
      where: this.where(query),
      orderBy: this.orderBy(query),
      take: query.limit,
      skip: query.offset,
    });
    return rows.map((row) => this.toDto(row));
  }

  async count(query: Partial<DataQualityQuery> = {}): Promise<number> {
    return this.db.dataQualityEvaluation.count({ where: this.where(query) });
  }

  /**
   * Count the instruments that fall in this region/asset scope, using the SAME
   * Stock-relation predicate the evaluation list/count uses. This is the summary
   * denominator: previously it came from a DIFFERENT engine (MarketDataFoundation
   * listInstruments), so the universe total and the per-status counts could be
   * scoped differently and disagree (e.g. US 6843 vs 6826). One predicate now
   * backs both, so totalInstruments and dataStatus are internally consistent.
   */
  async countInstrumentsInScope(query: Partial<DataQualityQuery> = {}): Promise<number> {
    const stockFilter = this.scopeStockWhere(query);
    return this.db.stock.count({
      where: Object.keys(stockFilter).length > 0 ? stockFilter : undefined,
    });
  }

  async summary(totalInstruments: number, query: Partial<DataQualityQuery> = {}): Promise<DataQualitySummary> {
    const base = { region: query.region, assetType: query.assetType };
    const [good, partial, poor, unusable, ready, latest, all] = await Promise.all([
      this.count({ ...base, status: 'GOOD' }),
      this.count({ ...base, status: 'PARTIAL' }),
      this.count({ ...base, status: 'POOR' }),
      this.count({ ...base, status: 'UNUSABLE' }),
      this.count({ ...base, readinessStatus: 'READY' }),
      this.db.dataQualityEvaluation.findFirst({
        where: this.where(base),
        orderBy: { evaluatedAt: 'desc' },
      }),
      this.db.dataQualityEvaluation.findMany({
        where: this.where(base),
      }),
    ]);
    const hasGap = (needle: string) => all.filter((item) => jsonStringArray(item.dataGaps).some((gap) => gap.includes(needle))).length;
    return {
      totalInstruments,
      goodCoverageCount: good,
      partialCoverageCount: partial,
      poorCoverageCount: poor,
      unusableCoverageCount: unusable,
      signalReadyCount: ready,
      notSignalReadyCount: Math.max(0, all.length - ready),
      stalePriceCount: hasGap('latest price is stale'),
      missingFundamentalsCount: hasGap('Fundamentals are missing'),
      missingSectorCount: hasGap('Sector metadata is missing'),
      missingIndustryCount: hasGap('Industry metadata is missing'),
      missingCountryCount: hasGap('Country metadata is missing'),
      lowLiquidityCount: all.filter((item) => ['THIN', 'ILLIQUID'].includes(item.liquidityStatus)).length,
      missingVolumeCount: all.filter((item) => item.liquidityStatus === 'UNKNOWN' || jsonStringArray(item.dataGaps).some((gap) => gap.includes('Volume data is missing'))).length,
      latestEvaluationAt: latest?.evaluatedAt.toISOString() ?? null,
      dataStatus: all.length === 0 ? 'MISSING' : all.length < totalInstruments ? 'PARTIAL' : 'COMPLETE',
    };
  }

  /**
   * The region + asset-type Stock predicate. Single source of truth for scope so
   * the evaluation list/count and the universe count (countInstrumentsInScope)
   * always select the same population.
   */
  private scopeStockWhere(query: Partial<DataQualityQuery>): Prisma.StockWhereInput {
    const regionStockFilter = resolveRelatedMarketRegionFilter(query.region).stock as Prisma.StockWhereInput | undefined;
    const assetStockFilter = this.assetTypeWhere(query.assetType);
    const stockFilters = [regionStockFilter, assetStockFilter].filter((item): item is Prisma.StockWhereInput => Boolean(item && Object.keys(item).length > 0));
    return stockFilters.length > 1 ? { AND: stockFilters } : stockFilters[0] || {};
  }

  private where(query: Partial<DataQualityQuery>): any {
    const stockFilter = this.scopeStockWhere(query);

    return {
      stock: Object.keys(stockFilter).length > 0 ? stockFilter : undefined,
      OR: query.search ? [
        { symbol: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
      ] : undefined,
      coverageStatus: query.status,
      signalReadinessStatus: query.readinessStatus,
      liquidityStatus: query.liquidityStatus,
      sector: query.sector ? { contains: query.sector, mode: 'insensitive' } : undefined,
      country: query.country ? { contains: query.country, mode: 'insensitive' } : undefined,
      eligibleForSignals: query.eligibleForSignals,
      eligibleForBacktesting: query.eligibleForBacktesting,
      coverageScore: query.minCoverageScore !== undefined ? { gte: query.minCoverageScore } : undefined,
      signalReadinessScore: query.minReadinessScore !== undefined ? { gte: query.minReadinessScore } : undefined,
    };
  }

  private orderBy(query: Partial<DataQualityQuery>): Prisma.DataQualityEvaluationOrderByWithRelationInput[] {
    const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const allowed: Record<string, Prisma.DataQualityEvaluationOrderByWithRelationInput> = {
      symbol: { symbol: direction },
      companyName: { companyName: direction },
      coverageScore: { coverageScore: direction },
      signalReadinessScore: { signalReadinessScore: direction },
      liquidityScore: { liquidityScore: direction },
      evaluatedAt: { evaluatedAt: direction },
    };
    return [allowed[query.sortBy || ''] || { signalReadinessScore: 'asc' }, { evaluatedAt: 'desc' }];
  }

  private assetTypeWhere(assetType?: string): Prisma.StockWhereInput {
    const normalized = String(assetType || '').trim().toUpperCase();
    if (!normalized) return {};
    if (normalized === 'STOCK') {
      return {
        OR: [
          { assetType: { in: ['STOCK', 'EQUITY'], mode: 'insensitive' } },
          { assetType: null },
        ],
      };
    }
    return { assetType: { equals: normalized, mode: 'insensitive' } };
  }

  private toWrite(evaluation: DataQualityEvaluationDto) {
    return {
      instrumentId: evaluation.instrumentId,
      symbol: evaluation.symbol,
      companyName: evaluation.companyName,
      sector: evaluation.sector,
      industry: evaluation.industry,
      country: evaluation.country,
      currency: evaluation.currency,
      coverageScore: evaluation.coverageScore,
      coverageStatus: evaluation.coverageStatus,
      signalReadinessScore: evaluation.signalReadinessScore,
      signalReadinessStatus: evaluation.signalReadinessStatus,
      liquidityScore: evaluation.liquidityScore,
      liquidityStatus: evaluation.liquidityStatus,
      eligibleForSignals: evaluation.eligibleForSignals,
      eligibleForBacktesting: evaluation.eligibleForBacktesting,
      eligibleForCalibration: evaluation.eligibleForCalibration,
      dataGaps: evaluation.dataGaps as unknown as Prisma.InputJsonValue,
      warnings: evaluation.warnings as unknown as Prisma.InputJsonValue,
      readinessReasons: evaluation.readinessReasons as unknown as Prisma.InputJsonValue,
      readinessBlockers: evaluation.readinessBlockers as unknown as Prisma.InputJsonValue,
      evaluatedAt: new Date(evaluation.lastEvaluatedAt),
    };
  }

  private toDto(record: any): DataQualityEvaluationDto {
    const dataGaps = jsonStringArray(record.dataGaps);
    const warnings = jsonStringArray(record.warnings);
    const readinessReasons = jsonStringArray(record.readinessReasons);
    const readinessBlockers = jsonStringArray(record.readinessBlockers);
    const tierEvidence = this.tierEvidence(readinessBlockers);
    const useCaseTiers = this.useCaseTiers(record, dataGaps, readinessReasons, readinessBlockers, tierEvidence);
    return {
      id: record.id,
      instrumentId: record.instrumentId,
      symbol: record.symbol,
      companyName: record.companyName,
      sector: record.sector,
      industry: record.industry,
      country: record.country,
      currency: record.currency,
      coverageScore: record.coverageScore,
      coverageStatus: record.coverageStatus,
      signalReadinessScore: record.signalReadinessScore,
      signalReadinessStatus: record.signalReadinessStatus,
      liquidityScore: record.liquidityScore,
      liquidityStatus: record.liquidityStatus,
      eligibleForSignals: record.eligibleForSignals,
      eligibleForBacktesting: record.eligibleForBacktesting,
      eligibleForCalibration: record.eligibleForCalibration,
      dataGaps,
      warnings,
      readinessReasons,
      readinessBlockers,
      recommendedFixes: recommendedFixes(dataGaps, readinessBlockers),
      useCaseTiers,
      tierEvidence,
      lastEvaluatedAt: record.evaluatedAt.toISOString(),
      researchUrl: `/research/stocks/${record.instrumentId}`,
    };
  }

  private tierEvidence(readinessBlockers: string[]): DataQualityTierEvidence {
    const requiredHistory = readinessBlockers
      .map((blocker) => blocker.match(/^Trusted baseline required history status is ([A-Z_]+)\.$/i))
      .find((match): match is RegExpMatchArray => Boolean(match))?.[1]?.toUpperCase() ?? null;

    const listingDateMissing = readinessBlockers.some((blocker) => blocker.includes('Trusted baseline listing-date confidence is missing.'))
      || readinessBlockers.some((blocker) => blocker.includes(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING));

    const trustedBaselineBlockerCodes: string[] = [];
    if (requiredHistory && requiredHistory !== 'COMPLETE') trustedBaselineBlockerCodes.push('REQUIRED_HISTORY_INCOMPLETE');
    if (listingDateMissing) trustedBaselineBlockerCodes.push('LISTING_DATE_MISSING_REQUIRED_15Y');

    return {
      requiredHistoryStatus: requiredHistory,
      listingDateStatus: listingDateMissing ? 'MISSING_USED_15_YEAR_TARGET' : null,
      trustedBaselineBlockerCodes,
    };
  }

  /**
   * Reconstruct use-case tiers for a persisted row.
   *
   * Freshly-evaluated rows carry the engine's tier decisions as tagged strings
   * (e.g. `DAILYREVIEW_LIMITED: …`) inside readinessReasons/readinessBlockers;
   * `taggedTierReasons` replays those exactly. For legacy rows without tags, the
   * SAME shared `deriveUseCaseTiers` engine the service uses is fed input
   * reconstructed from the persisted columns + parsed trust evidence — so the
   * read path and the evaluate path can never derive tiers by different rules.
   */
  private useCaseTiers(
    record: any,
    dataGaps: string[],
    readinessReasons: string[],
    readinessBlockers: string[],
    tierEvidence: DataQualityTierEvidence
  ): DataQualityUseCaseTiers {
    const tagged = this.taggedTierReasons([...readinessReasons, ...readinessBlockers]);
    const stale = dataGaps.some((gap) => gap.toLowerCase().includes('latest price is stale'));
    const fallback = deriveUseCaseTiers({
      stale,
      coverageStatus: record.coverageStatus,
      signalReadinessStatus: record.signalReadinessStatus,
      liquidityStatus: record.liquidityStatus,
      eligibleForSignals: record.eligibleForSignals,
      eligibleForBacktesting: record.eligibleForBacktesting,
      eligibleForCalibration: record.eligibleForCalibration,
      requiredHistoryStatus: tierEvidence.requiredHistoryStatus ?? null,
      listingDateStatus: tierEvidence.listingDateStatus ?? null,
    });

    return {
      dailyReview: tagged.dailyReview ?? fallback.dailyReview,
      signal: tagged.signal ?? fallback.signal,
      backtest: tagged.backtest ?? fallback.backtest,
      calibration: tagged.calibration ?? fallback.calibration,
      automation: tagged.automation ?? fallback.automation,
    };
  }

  private taggedTierReasons(lines: string[]): Partial<DataQualityUseCaseTiers> {
    const out: Partial<DataQualityUseCaseTiers> = {};
    const keyByPrefix: Record<string, keyof DataQualityUseCaseTiers> = {
      DAILYREVIEW: 'dailyReview',
      SIGNAL: 'signal',
      BACKTEST: 'backtest',
      CALIBRATION: 'calibration',
      AUTOMATION: 'automation',
    };
    for (const line of lines) {
      const match = line.match(/^(DAILYREVIEW|SIGNAL|BACKTEST|CALIBRATION|AUTOMATION)_(READY|LIMITED|BLOCKED):\s+(.+)$/);
      if (!match) continue;
      const key = keyByPrefix[match[1]];
      const status = match[2] as DataQualityUseCaseTier['status'];
      const reason = match[3].trim();
      const current = out[key];
      if (!current) out[key] = { status, reasons: [reason] };
      else if (current.status === status && !current.reasons.includes(reason)) current.reasons.push(reason);
    }
    return out;
  }
}

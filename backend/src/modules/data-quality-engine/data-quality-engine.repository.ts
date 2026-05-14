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

const PHASE0_AUTOMATION_NOT_AUTHORIZED = 'PHASE0_AUTOMATION_NOT_AUTHORIZED';
const TIER_REASON_TRUST_CONTEXT_MISSING = 'TRUST_CONTEXT_MISSING';
const TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE = 'TRUSTED_BASELINE_HISTORY_INCOMPLETE';
const TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING = 'LISTING_DATE_CONFIDENCE_MISSING';

export class DataQualityEngineRepository {
  constructor(private readonly db = prisma) {}

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
    const hasGap = (needle: string) => all.filter((item) => this.jsonArray(item.dataGaps).some((gap) => gap.includes(needle))).length;
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
      missingVolumeCount: all.filter((item) => item.liquidityStatus === 'UNKNOWN' || this.jsonArray(item.dataGaps).some((gap) => gap.includes('Volume data is missing'))).length,
      latestEvaluationAt: latest?.evaluatedAt.toISOString() ?? null,
      dataStatus: all.length === 0 ? 'MISSING' : all.length < totalInstruments ? 'PARTIAL' : 'COMPLETE',
    };
  }

  private where(query: Partial<DataQualityQuery>): any {
    const regionStockFilter = resolveRelatedMarketRegionFilter(query.region).stock as Prisma.StockWhereInput | undefined;
    const assetStockFilter = this.assetTypeWhere(query.assetType);
    const stockFilters = [regionStockFilter, assetStockFilter].filter((item): item is Prisma.StockWhereInput => Boolean(item && Object.keys(item).length > 0));
    const stockFilter: Prisma.StockWhereInput = stockFilters.length > 1 ? { AND: stockFilters } : stockFilters[0] || {};
    
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
    const dataGaps = this.jsonArray(record.dataGaps);
    const warnings = this.jsonArray(record.warnings);
    const readinessReasons = this.jsonArray(record.readinessReasons);
    const readinessBlockers = this.jsonArray(record.readinessBlockers);
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
      recommendedFixes: this.recommendedFixes(dataGaps, readinessBlockers),
      useCaseTiers,
      tierEvidence,
      lastEvaluatedAt: record.evaluatedAt.toISOString(),
      researchUrl: `/research/stocks/${record.instrumentId}`,
    };
  }

  private jsonArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private recommendedFixes(gaps: string[], blockers: string[]): string[] {
    const text = [...gaps, ...blockers].join(' ');
    const fixes = new Set<string>();
    if (text.includes('price history') || text.includes('SMA200') || text.includes('backtesting')) fixes.add('Sync more historical price data.');
    if (text.includes('latest price')) fixes.add('Refresh latest price data.');
    if (text.includes('Sector') || text.includes('Industry')) fixes.add('Add sector/industry metadata.');
    if (text.includes('Country')) fixes.add('Add country metadata.');
    if (text.includes('Fundamentals')) fixes.add('Sync or add fundamentals.');
    if (text.includes('Volume')) fixes.add('Refresh price history with volume data.');
    return [...fixes];
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

  private useCaseTiers(
    record: any,
    dataGaps: string[],
    readinessReasons: string[],
    readinessBlockers: string[],
    tierEvidence: DataQualityTierEvidence
  ): DataQualityUseCaseTiers {
    const tagged = this.taggedTierReasons([...readinessReasons, ...readinessBlockers]);
    const stale = dataGaps.some((gap) => gap.toLowerCase().includes('latest price is stale'));
    const trustContextMissing = !tierEvidence.requiredHistoryStatus && !readinessBlockers.some((blocker) => blocker.includes(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE));
    const historyIncomplete = tierEvidence.requiredHistoryStatus ? tierEvidence.requiredHistoryStatus !== 'COMPLETE' : readinessBlockers.some((blocker) => blocker.includes(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE));
    const listingDateConfidenceMissing = !tierEvidence.listingDateStatus
      || tierEvidence.listingDateStatus === 'MISSING_USED_15_YEAR_TARGET'
      || readinessBlockers.some((blocker) => blocker.includes(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING));

    const fallbackDailyReview: DataQualityUseCaseTier = stale
      ? { status: 'BLOCKED', reasons: ['STALE_PRICE_DATA'] }
      : record.coverageStatus === 'UNUSABLE'
        ? { status: 'BLOCKED', reasons: ['UNUSABLE_COVERAGE'] }
        : trustContextMissing || historyIncomplete || listingDateConfidenceMissing || record.signalReadinessStatus !== 'READY'
          ? { status: 'LIMITED', reasons: [
            ...(trustContextMissing ? [TIER_REASON_TRUST_CONTEXT_MISSING] : []),
            ...(historyIncomplete ? [TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE] : []),
            ...(listingDateConfidenceMissing ? [TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING] : []),
            ...(record.signalReadinessStatus === 'LIMITED' ? ['SIGNAL_LIMITED'] : []),
            ...(record.signalReadinessStatus === 'NOT_READY' ? ['SIGNAL_NOT_READY'] : []),
          ] }
          : { status: 'READY', reasons: [] };

    const signalLimitedReasons: string[] = [];
    if (trustContextMissing) signalLimitedReasons.push(TIER_REASON_TRUST_CONTEXT_MISSING);
    if (historyIncomplete) signalLimitedReasons.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
    if (listingDateConfidenceMissing) signalLimitedReasons.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);
    if (record.signalReadinessStatus === 'LIMITED') signalLimitedReasons.push('SIGNAL_LIMITED');
    if (!record.eligibleForSignals) signalLimitedReasons.push('LEGACY_SIGNAL_EVIDENCE_INELIGIBLE');
    const fallbackSignal: DataQualityUseCaseTier = record.signalReadinessStatus === 'NOT_READY' || stale
      ? { status: 'BLOCKED', reasons: [stale ? 'STALE_PRICE_DATA' : 'SIGNAL_NOT_READY'] }
      : signalLimitedReasons.length > 0
        ? { status: 'LIMITED', reasons: signalLimitedReasons }
        : { status: 'READY', reasons: [] };

    const fallbackBacktest: DataQualityUseCaseTier = trustContextMissing || historyIncomplete || listingDateConfidenceMissing || !record.eligibleForBacktesting
      ? { status: 'BLOCKED', reasons: [
        ...(trustContextMissing ? [TIER_REASON_TRUST_CONTEXT_MISSING] : []),
        ...(historyIncomplete ? [TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE] : []),
        ...(listingDateConfidenceMissing ? [TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING] : []),
        ...(!record.eligibleForBacktesting ? ['LEGACY_BACKTEST_EVIDENCE_INELIGIBLE'] : []),
      ] }
      : fallbackSignal.status === 'LIMITED'
        ? { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] }
        : { status: 'READY', reasons: [] };

    const fallbackCalibration: DataQualityUseCaseTier = trustContextMissing || historyIncomplete || listingDateConfidenceMissing || !record.eligibleForCalibration
      ? { status: 'BLOCKED', reasons: [
        ...(trustContextMissing ? [TIER_REASON_TRUST_CONTEXT_MISSING] : []),
        ...(historyIncomplete ? [TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE] : []),
        ...(listingDateConfidenceMissing ? [TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING] : []),
        ...(!record.eligibleForCalibration ? ['LEGACY_CALIBRATION_EVIDENCE_INELIGIBLE'] : []),
      ] }
      : fallbackSignal.status === 'LIMITED'
        ? { status: 'LIMITED', reasons: ['SIGNAL_LIMITED'] }
        : { status: 'READY', reasons: [] };

    return {
      dailyReview: tagged.dailyReview ?? fallbackDailyReview,
      signal: tagged.signal ?? fallbackSignal,
      backtest: tagged.backtest ?? fallbackBacktest,
      calibration: tagged.calibration ?? fallbackCalibration,
      automation: tagged.automation ?? { status: 'BLOCKED', reasons: [PHASE0_AUTOMATION_NOT_AUTHORIZED] },
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

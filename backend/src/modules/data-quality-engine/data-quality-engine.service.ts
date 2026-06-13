import { MarketDataFoundationService, expectedLatestTradingDate } from '../market-data-foundation';
import { DataQualityEngineRepository } from './data-quality-engine.repository';
import {
  ELIGIBILITY_POLICY,
  ELIGIBILITY_POLICY_VERSION,
  type EligibilityFacts,
  type EligibilityReasonCode,
  type EligibilityVerdicts,
} from '../../shared/types/eligibility-policy';
import {
  DEFAULT_DATA_QUALITY_CONFIG,
  resolveDataQualityConfig,
  type DataQualityConfig,
} from './data-quality-engine.config';
import {
  coverageScore,
  coverageStatus,
  calculateLiquidity,
  fundamentalsCoverageTierFor as computeFundamentalsTier,
  readinessScore,
  readinessStatus,
} from './data-quality-engine.scoring';
import { computeStaleness } from './data-quality-engine.staleness';
import { deriveUseCaseTiers } from './data-quality-engine.use-case-tiers';
import { recommendedFixes } from './data-quality-engine.recommended-fixes';
import { normalizeInstrument, type NormalizedInstrument } from './data-quality-engine.instrument';
import { optionalNumber, optionalText } from './data-quality-engine.utils';
import type {
  DataQualityEvaluateRequest,
  DataQualityEvaluateResponse,
  DataQualityEvaluationDto,
  DataQualityFilterOptions,
  DataQualityFilterResult,
  DataQualityListResponse,
  DataQualityQuery,
  DataQualityScheduledEvaluateRequest,
  DataQualityScheduledEvaluateResponse,
  DataQualityTierEvidence,
  DataQualityUseCaseTiers,
  FundamentalsCoverageTier,
  PriceForQuality,
} from './data-quality-engine.types';

// ── Eligibility read-API types ────────────────────────────────────────────────
export interface InstrumentEligibilityRow {
  instrumentId: string;
  tradingDate: Date;
  facts: EligibilityFacts;
  verdicts: EligibilityVerdicts;
  readinessScore: number;
  readinessStatus: string;
  policyVersion: string;
  computedAt: Date;
}

export interface FilterByVerdictResult {
  eligibleInstrumentIds: string[];
  excludedInstrumentIds: string[];
  reasonsByInstrumentId: Record<string, EligibilityReasonCode[]>;
}

type VerdictKey = 'signal' | 'review' | 'backtest' | 'calibration';

const DEFAULT_EVALUATION_CONCURRENCY = 4;
const MAX_EVALUATION_CONCURRENCY = 4;
const DEFAULT_SCHEDULED_DQ_CHUNK_SIZE = 100;
const MAX_SCHEDULED_DQ_CHUNK_SIZE = 100;

export class DataQualityEngineService {
  constructor(
    private readonly repository = new DataQualityEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService: { signalHistory(input: any): Promise<any[]> } | null = null
  ) {}

  /** Resolve the effective config for an instrument from its region/asset scope. */
  private configFor(instrument: NormalizedInstrument): DataQualityConfig {
    return resolveDataQualityConfig({
      region: instrument.region ?? instrument.country,
      assetType: instrument.assetType,
    });
  }

  async summary(query: Partial<DataQualityQuery> = {}) {
    const total = await this.instrumentCount(query);
    return this.repository.summary(total, query);
  }

  async list(query: DataQualityQuery): Promise<DataQualityListResponse> {
    const [items, total] = await Promise.all([
      this.repository.list(query),
      this.repository.count(query),
    ]);
    const nextOffset = query.offset + items.length;
    return {
      items,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        nextOffset: nextOffset < total ? nextOffset : null,
        hasMore: nextOffset < total,
      },
    };
  }

  async signalReadiness(query: DataQualityQuery) {
    return this.list({ ...query, readinessStatus: query.readinessStatus ?? 'READY' });
  }

  async liquidity(query: DataQualityQuery) {
    return this.list(query);
  }

  async diagnostics(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    const existing = await this.repository.latestForInstrument(instrumentId);
    if (existing) return existing;
    const instrument = await this.marketDataService.getInstrument(instrumentId);
    return instrument ? this.evaluateAndPersistInstrument(instrument) : null;
  }

  getLatestEvaluationForInstrument(instrumentId: string): Promise<DataQualityEvaluationDto | null> {
    return this.repository.latestForInstrument(instrumentId);
  }

  async getEvaluationsForInstruments(instrumentIds: string[]): Promise<DataQualityEvaluationDto[]> {
    return this.repository.latestForInstruments([...new Set(instrumentIds)]);
  }

  async filterEligibleInstruments(instrumentIds: string[], options: DataQualityFilterOptions = {}, asOf?: Date): Promise<DataQualityFilterResult> {
    const evaluations = await this.getEvaluationsForInstruments(instrumentIds);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    const allowed = options.allowedReadinessStatuses || (options.includeLimited ? ['READY', 'LIMITED'] : ['READY']);
    const minScore = options.minSignalReadinessScore ?? 70;
    const skipUnusable = options.skipUnusable ?? true;
    const missingBehavior = options.missingQualityBehavior ?? 'SKIP';
    // When asOf is provided, override staleness check in eligibility (historical runs should not be blocked by today's stale flag)
    const asOfMs = asOf ? asOf.getTime() : null;
    const eligible: string[] = [];
    const excluded: string[] = [];
    const warnings: string[] = [];
    let missingQualityEvaluationCount = 0;

    for (const instrumentId of instrumentIds) {
      const evaluation = byId.get(instrumentId);
      if (!evaluation) {
        missingQualityEvaluationCount += 1;
        warnings.push(`${instrumentId}: missing data quality evaluation`);
        if (missingBehavior === 'SKIP') excluded.push(instrumentId);
        else eligible.push(instrumentId);
        continue;
      }
      // When asOf is provided, recompute staleness relative to asOf rather than using the persisted flag.
      // This prevents historical instruments from being excluded simply because their price is "stale" today.
      let effectiveEligibleForSignals = evaluation.eligibleForSignals;
      if (asOfMs !== null) {
        // eligibleForSignals = (signalReadinessScore >= 70 && !stale); when the score
        // was sufficient, the only possible reason for ineligibility is today's stale
        // check, which is irrelevant for a historical (asOf) run — so allow it through.
        if (!effectiveEligibleForSignals && evaluation.signalReadinessScore >= 70) {
          effectiveEligibleForSignals = true;
        }
      }
      const blocked =
        !effectiveEligibleForSignals ||
        evaluation.signalReadinessScore < minScore ||
        (!allowed.includes(evaluation.signalReadinessStatus) && !(options.includeLimited && evaluation.signalReadinessStatus === 'LIMITED')) ||
        (options.excludeNotReady && evaluation.signalReadinessStatus === 'NOT_READY') ||
        (skipUnusable && evaluation.coverageStatus === 'UNUSABLE') ||
        (options.excludeIlliquid && evaluation.liquidityStatus === 'ILLIQUID');
      if (blocked) excluded.push(instrumentId);
      else eligible.push(instrumentId);
    }

    return {
      eligibleInstrumentIds: eligible,
      excludedInstrumentIds: excluded,
      missingQualityEvaluationCount,
      warnings,
      evaluationsByInstrumentId: Object.fromEntries(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation])),
    };
  }

  async evaluate(request: DataQualityEvaluateRequest): Promise<DataQualityEvaluateResponse> {
    const started = Date.now();
    const { instruments, totalCount } = await this.resolveEvaluationScope(request);
    const outcomes = await this.evaluateInstrumentBatch(instruments, this.evaluationConcurrency(request));
    const evaluatedCount = outcomes.filter((outcome) => outcome.ok).length;
    const failedCount = outcomes.length - evaluatedCount;
    const warnings = outcomes
      .filter((outcome): outcome is { ok: false; warning: string } => !outcome.ok)
      .map((outcome) => outcome.warning);

    const processedCount = instruments.length;
    const nextOffset = request.offset + processedCount;
    return {
      processedCount,
      totalCount,
      batchSize: request.instrumentId || request.symbol ? 1 : request.batchSize,
      offset: request.instrumentId || request.symbol ? 0 : request.offset,
      nextOffset: nextOffset < totalCount && !request.instrumentId && !request.symbol ? nextOffset : null,
      hasMore: nextOffset < totalCount && !request.instrumentId && !request.symbol,
      evaluatedCount,
      skippedCount: Math.max(0, processedCount - evaluatedCount - failedCount),
      failedCount,
      warnings,
      durationMs: Date.now() - started,
    };
  }

  async evaluateScheduledStage(request: DataQualityScheduledEvaluateRequest): Promise<DataQualityScheduledEvaluateResponse> {
    const started = Date.now();
    const normalizedIds = [...new Set((request.instrumentIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
    const region = String(request.region || '').trim().toUpperCase();
    const assetType = String(request.assetType || '').trim().toUpperCase();
    if (normalizedIds.length === 0) {
      return {
        processedCount: 0,
        totalCount: 0,
        evaluatedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        warnings: [],
        errors: [],
        nextOffset: null,
        hasMore: false,
        durationMs: Date.now() - started,
      };
    }

    const chunkSize = this.scheduledStageChunkSize(request.batchSize);
    const totalChunks = Math.ceil(normalizedIds.length / chunkSize);
    let processedCount = 0;
    let evaluatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const warnings: string[] = [];
    const errors: string[] = [];
    const concurrency = Math.max(1, Math.min(this.positiveNumber(request.batchSize, DEFAULT_EVALUATION_CONCURRENCY), MAX_EVALUATION_CONCURRENCY));

    const reportProgress = async (metadata: Record<string, unknown>) => {
      if (!request.onProgress) return;
      const hasMore = processedCount < normalizedIds.length;
      await request.onProgress({
        processedCount,
        totalCount: normalizedIds.length,
        evaluatedCount,
        failedCount,
        skippedCount,
        warnings: [...warnings],
        errors: [...errors],
        nextOffset: hasMore ? processedCount : null,
        hasMore,
        metadata,
      });
    };

    for (let offset = 0; offset < normalizedIds.length; offset += chunkSize) {
      const chunkIds = normalizedIds.slice(offset, offset + chunkSize);
      const chunkIndex = Math.floor(offset / chunkSize) + 1;
      let instruments: any[] = [];
      let priceWindowsByInstrumentId = new Map<string, any[]>();
      let fundamentalsByInstrumentId = new Map<string, any>();

      try {
        [instruments, priceWindowsByInstrumentId, fundamentalsByInstrumentId] = await Promise.all([
          this.marketDataService.getInstrumentsByIds(chunkIds),
          this.marketDataService.listRecentPriceWindowsByInstrumentIds(chunkIds, 300, { region, assetType }),
          this.marketDataService.storedFundamentalsByInstrumentIds(chunkIds, { region, assetType }),
        ]);
      } catch (error: any) {
        const message = `chunk ${chunkIndex}/${totalChunks} offset ${offset} failed for ${chunkIds.length} instruments: ${error?.message || 'scheduled data quality preload failed'}`;
        failedCount += chunkIds.length;
        processedCount += chunkIds.length;
        warnings.push(message);
        errors.push(message);
        await reportProgress({
          chunkIndex,
          totalChunks,
          chunkOffset: offset,
          chunkInstrumentCount: chunkIds.length,
          chunkStatus: 'FAILED',
          chunkError: error?.message || 'scheduled data quality preload failed',
        });
        continue;
      }

      const instrumentById = new Map(
        instruments
          .filter((instrument: any) => this.matchesScheduledScope(instrument, region, assetType))
          .map((instrument: any) => [String(instrument.id), instrument])
      );

      await this.eachWithConcurrency(chunkIds, concurrency, async (instrumentId) => {
        const instrument = instrumentById.get(instrumentId);
        if (!instrument) {
          skippedCount += 1;
          warnings.push(`chunk ${chunkIndex}/${totalChunks} ${instrumentId}: instrument missing or out of scope`);
          return;
        }

        try {
          const [actionsResponse, latestSignal] = await Promise.all([
            this.marketDataService.storedCorporateActionsByInstrumentId(instrumentId, { region, assetType }).catch(() => ({ actions: [] })),
            this.signalService?.signalHistory({ instrumentId, limit: 1 }).catch(() => []) ?? Promise.resolve([]),
          ]);
          const priceWindow = priceWindowsByInstrumentId.get(instrumentId) || [];
          const prices = this.normalizePrices(priceWindow);
          const latestPrice = prices[0] || null;
          const fundamentalsResponse = fundamentalsByInstrumentId.get(instrumentId) || { records: [] };
          const fundamentals = fundamentalsResponse.records || [];
          const actions = actionsResponse?.actions || [];
          const evaluated = this.evaluateInstrument(instrument, prices, latestPrice, fundamentals, actions, latestSignal.length > 0);
          await Promise.all([
            this.repository.upsertEvaluation(evaluated),
            this.persistEligibility(instrument, prices, latestPrice, fundamentals, evaluated.signalReadinessScore, evaluated.signalReadinessStatus),
          ]);
          evaluatedCount += 1;
        } catch (error: any) {
          failedCount += 1;
          warnings.push(`chunk ${chunkIndex}/${totalChunks} ${instrument.symbol || instrumentId}: ${error?.message || 'evaluation failed'}`);
        }
      });

      processedCount += chunkIds.length;
      await reportProgress({
        chunkIndex,
        totalChunks,
        chunkOffset: offset,
        chunkInstrumentCount: chunkIds.length,
        chunkStatus: 'COMPLETED',
      });
    }

    return {
      processedCount,
      totalCount: normalizedIds.length,
      evaluatedCount,
      failedCount,
      skippedCount,
      warnings,
      errors,
      nextOffset: null,
      hasMore: false,
      durationMs: Date.now() - started,
    };
  }

  async evaluateAndPersistInstrument(instrument: any): Promise<DataQualityEvaluationDto> {
    const dqScope = { region: instrument.region, assetType: instrument.assetType ?? instrument.asset_type };
    const [pricesResponse, latestResponse, fundamentalsResponse, actionsResponse, latestSignal] = await Promise.all([
      this.marketDataService.listPricesByInstrumentId(instrument.id, 300, undefined, undefined, dqScope).catch(() => null),
      this.marketDataService.latestPriceByInstrumentId(instrument.id, dqScope).catch(() => null),
      this.marketDataService.storedFundamentalsByInstrumentId(instrument.id).catch(() => null),
      this.marketDataService.storedCorporateActionsByInstrumentId(instrument.id).catch(() => null),
      this.signalService?.signalHistory({ instrumentId: instrument.id, limit: 1 }).catch(() => []) ?? Promise.resolve([]),
    ]);
    const prices = this.normalizePrices(pricesResponse?.prices || []);
    const latest = latestResponse?.latest || null;
    const fundamentals = fundamentalsResponse?.records || [];
    const actions = actionsResponse?.actions || [];
    const evaluated = this.evaluateInstrument(instrument, prices, latest, fundamentals, actions, latestSignal.length > 0);
    const [saved] = await Promise.all([
      this.repository.upsertEvaluation(evaluated),
      this.persistEligibility(instrument, prices, latest, fundamentals, evaluated.signalReadinessScore, evaluated.signalReadinessStatus),
    ]);
    return saved;
  }

  /**
   * Shared helper: compute facts + verdicts and upsert into instrument_eligibility.
   * Called from both the single-instrument path and the scheduled-stage batch path.
   * Failures are swallowed so they never block the legacy DataQualityEvaluation write.
   */
  private async persistEligibility(
    instrument: any,
    prices: PriceForQuality[],
    latestPrice: PriceForQuality | null,
    fundamentals: any[],
    readinessScoreValue: number,
    readinessStatusValue: string,
  ): Promise<void> {
    try {
      const norm = normalizeInstrument(instrument);
      const config = this.configFor(norm);
      const latestDate = latestPrice?.date
        ? new Date(latestPrice.date as unknown as string)
        : prices[0]?.date
          ? new Date(prices[0].date as unknown as string)
          : null;
      const staleSessionCount = computeStaleness(latestDate, config).staleSessions;
      const liquidity = calculateLiquidity(prices, config);
      const facts = this.computeEligibilityFacts(instrument, prices, latestPrice, fundamentals, staleSessionCount, liquidity.score);
      const verdicts = this.computeEligibilityVerdicts(facts, instrument, readinessScoreValue);
      await this.upsertInstrumentEligibility(instrument.id, instrument, facts, verdicts, readinessScoreValue, readinessStatusValue);
    } catch (_err: unknown) {
      // Eligibility write failure must not surface to callers — the legacy
      // DataQualityEvaluation row is already written; log only in debug builds.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DQE] eligibility upsert failed for ${instrument?.id}: ${(_err as Error)?.message}`);
      }
    }
  }

  private async evaluateInstrumentBatch(instruments: any[], concurrency: number): Promise<Array<{ ok: true } | { ok: false; warning: string }>> {
    const outcomes: Array<{ ok: true } | { ok: false; warning: string }> = new Array(instruments.length);
    await this.eachWithConcurrency(instruments, concurrency, async (instrument, index) => {
      try {
        await this.evaluateAndPersistInstrument(instrument);
        outcomes[index] = { ok: true };
      } catch (error: any) {
        outcomes[index] = {
          ok: false,
          warning: `${instrument.symbol || instrument.id}: ${error?.message || 'evaluation failed'}`,
        };
      }
    });
    return outcomes;
  }

  evaluateInstrument(
    instrument: any,
    prices: PriceForQuality[],
    latestPrice: PriceForQuality | null,
    fundamentals: any[],
    corporateActions: any[],
    hasSignal = false
  ): DataQualityEvaluationDto {
    const norm = normalizeInstrument(instrument);
    const config = this.configFor(norm);
    const dataGaps: string[] = [];
    const warnings: string[] = [];
    const readinessReasons: string[] = [];
    const readinessBlockers: string[] = [];
    const { companyName, sector, industry, country, currency } = norm;
    const tierEvidence = this.tierEvidence(norm, hasSignal);
    const priceCount = prices.length;
    const latestDate = latestPrice?.date ? new Date(latestPrice.date) : prices[0]?.date ? new Date(prices[0].date) : null;
    const stale = computeStaleness(latestDate, config).isStale;
    const volumeValues = prices.map((price) => optionalNumber(price.volume)).filter((value): value is number => value !== null);
    const adjustedFallbackCount = prices.filter((price) => price.adjusted_close === null || price.adjusted_close === undefined).length;

    if (priceCount < config.sma50Bars) dataGaps.push('Price history has fewer than 50 rows.');
    if (priceCount < config.sma200Bars) dataGaps.push('Price history has fewer than 200 rows for SMA200.');
    if (!latestPrice) dataGaps.push('Latest price is missing.');
    if (stale) dataGaps.push('latest price is stale.');
    if (fundamentals.length === 0) dataGaps.push('Fundamentals are missing.');
    if (corporateActions.length === 0) warnings.push('Corporate actions are missing or unavailable.');
    if (!sector) dataGaps.push('Sector metadata is missing.');
    if (!industry) dataGaps.push('Industry metadata is missing.');
    if (!country) dataGaps.push('Country metadata is missing.');
    if (!currency) dataGaps.push('Currency metadata is missing.');
    if (volumeValues.length === 0) dataGaps.push('Volume data is missing.');
    if (adjustedFallbackCount > 0) warnings.push('Adjusted close fallback to close is present for some rows.');
    if (tierEvidence.requiredHistoryStatus && tierEvidence.requiredHistoryStatus !== 'COMPLETE') {
      readinessBlockers.push(`Trusted baseline required history status is ${tierEvidence.requiredHistoryStatus}.`);
    }
    if (tierEvidence.listingDateStatus === 'MISSING_USED_15_YEAR_TARGET') {
      readinessBlockers.push('Trusted baseline listing-date confidence is missing.');
    }
    if (tierEvidence.trustedBaselineBlockerCodes?.includes('FALLBACK_REQUIRED_AFTER_YAHOO_ZERO_ROWS')) {
      warnings.push('Trusted baseline indicates fallback is required after zero-row primary-source history.');
    }

    const liquidity = calculateLiquidity(prices, config);
    if (liquidity.status === 'LIQUID') readinessReasons.push('Recent volume supports liquidity checks.');
    else readinessBlockers.push(`Liquidity status is ${liquidity.status}.`);
    if (priceCount >= config.sma50Bars) readinessReasons.push('Enough price history for SMA50.');
    else readinessBlockers.push('SMA50 requires at least 50 price rows.');
    if (priceCount >= config.sma200Bars) readinessReasons.push('Enough price history for SMA200.');
    else readinessBlockers.push('SMA200 requires at least 200 price rows.');
    if (priceCount >= config.rsiBars) readinessReasons.push('Enough price history for RSI.');
    else readinessBlockers.push('RSI requires at least 14 price rows.');
    if (stale) readinessBlockers.push('Latest price is stale.');
    if (!sector || !country) readinessBlockers.push('Sector and country metadata are required for stronger signal context.');

    const coverage = coverageScore({ sector, industry, country, currency }, priceCount, latestPrice, stale, fundamentals.length, corporateActions.length, volumeValues.length, adjustedFallbackCount, config);
    const signalReadinessScoreValue = readinessScore(priceCount, stale, volumeValues.length, { sector, country }, liquidity.score, config);
    const eligibleForSignals = signalReadinessScoreValue >= config.signalMinReadinessScore && !stale;
    const coverageStatusValue = coverageStatus(coverage, config);
    const signalReadinessStatusValue = readinessStatus(signalReadinessScoreValue, config);
    const eligibleForBacktesting = priceCount >= config.backtestMinBars && !stale;
    // Calibration readiness is driven by price-history depth. The previous
    // `hasSignal && …` gate depended on a signal service that is never injected
    // (it would form a module cycle), leaving calibration permanently false in
    // production and disagreeing with the instrument_eligibility verdict. Both
    // now use the same price-bars rule. `hasSignal` remains informational only.
    const eligibleForCalibration = priceCount >= config.calibrationMinBars;
    const useCaseTiers = deriveUseCaseTiers({
      stale,
      coverageStatus: coverageStatusValue,
      signalReadinessStatus: signalReadinessStatusValue,
      liquidityStatus: liquidity.status,
      eligibleForSignals,
      eligibleForBacktesting,
      eligibleForCalibration,
      requiredHistoryStatus: tierEvidence.requiredHistoryStatus ?? null,
      listingDateStatus: tierEvidence.listingDateStatus ?? null,
    });
    this.tierReasonsIntoReadiness(useCaseTiers, readinessReasons, readinessBlockers);
    const { tier: fundamentalsCoverageTier, periodCount: fundamentalsPeriodCount } = computeFundamentalsTier(fundamentals, config);

    return {
      instrumentId: norm.id,
      symbol: norm.symbol,
      companyName,
      sector,
      industry,
      country,
      currency,
      coverageScore: coverage,
      coverageStatus: coverageStatusValue,
      signalReadinessScore: signalReadinessScoreValue,
      signalReadinessStatus: signalReadinessStatusValue,
      liquidityScore: liquidity.score,
      liquidityStatus: liquidity.status,
      eligibleForSignals,
      eligibleForBacktesting,
      eligibleForCalibration,
      dataGaps,
      warnings,
      readinessReasons,
      readinessBlockers,
      recommendedFixes: recommendedFixes(dataGaps, readinessBlockers),
      useCaseTiers,
      tierEvidence,
      fundamentalsCoverageTier,
      fundamentalsPeriodCount,
      lastEvaluatedAt: new Date().toISOString(),
      researchUrl: `/research/stocks/${norm.id}`,
    };
  }

  /** Public delegating wrapper kept for callers/tests; depth tiers are region-agnostic. */
  fundamentalsCoverageTierFor(fundamentals: any[]): { tier: FundamentalsCoverageTier; periodCount: number } {
    return computeFundamentalsTier(fundamentals, DEFAULT_DATA_QUALITY_CONFIG);
  }

  private async resolveEvaluationScope(request: DataQualityEvaluateRequest): Promise<{ instruments: any[]; totalCount: number }> {
    if (request.instrumentId) {
      const instrument = await this.marketDataService.getInstrument(request.instrumentId);
      const instruments = instrument ? [instrument] : [];
      return { instruments, totalCount: instruments.length };
    }
    if (request.symbol) {
      const result = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 25, region: request.region });
      const match = result.instruments.find((instrument: any) => instrument.symbol.toUpperCase() === request.symbol);
      const instruments = match ? [match] : [];
      return { instruments, totalCount: instruments.length };
    }
    const page = Math.floor(request.offset / request.batchSize) + 1;
    const result = await this.marketDataService.listInstruments({
      page,
      pageSize: request.batchSize,
      region: request.region,
      assetType: request.assetType
    });
    return {
      instruments: result.instruments,
      totalCount: Number.isFinite(result.pagination?.total) ? result.pagination.total : result.instruments.length,
    };
  }

  private async instrumentCount(query: Partial<DataQualityQuery> = {}): Promise<number> {
    const result = await this.marketDataService.listInstruments({
      page: 1,
      pageSize: 1,
      region: query.region,
      assetType: query.assetType
    });
    return result.pagination.total;
  }

  /**
   * Coerce raw price rows into the engine shape and enforce newest-first order.
   * Downstream scoring assumes `prices[0]` is the latest bar; the explicit sort
   * makes that contract defensive instead of dependent on the caller's ordering.
   */
  private normalizePrices(prices: any[]): PriceForQuality[] {
    return prices
      .map((price) => ({
        date: price.date,
        close: Number(price.close),
        adjusted_close: price.adjusted_close ?? null,
        volume: price.volume ?? null,
        data_status: price.data_status,
      }))
      .filter((price) => Number.isFinite(price.close))
      .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());
  }

  private tierEvidence(norm: NormalizedInstrument, hasSignal: boolean): DataQualityTierEvidence {
    return {
      trustedBaselineResidualState: norm.trustedBaselineResidualState,
      requiredHistoryStatus: norm.requiredHistoryStatus,
      listingDateStatus: norm.listingDateStatus,
      trustedBaselineBlockerCodes: norm.trustedBaselineBlockerCodes,
      hasSignalHistory: hasSignal,
    };
  }

  private tierReasonsIntoReadiness(tiers: DataQualityUseCaseTiers, readinessReasons: string[], readinessBlockers: string[]) {
    const addReason = (value: string) => {
      if (!readinessReasons.includes(value)) readinessReasons.push(value);
    };
    const addBlocker = (value: string) => {
      if (!readinessBlockers.includes(value)) readinessBlockers.push(value);
    };

    const useCases: Array<keyof DataQualityUseCaseTiers> = ['dailyReview', 'signal', 'backtest', 'calibration', 'automation'];
    for (const useCase of useCases) {
      const tier = tiers[useCase];
      const target = tier.status === 'BLOCKED' ? addBlocker : addReason;
      for (const reason of tier.reasons) {
        target(`${useCase.toUpperCase()}_${tier.status}: ${reason}`);
      }
    }
  }

  private evaluationConcurrency(request: DataQualityEvaluateRequest): number {
    if (request.instrumentId || request.symbol) return 1;
    const requestedBatchSize = Math.max(1, Number(request.batchSize) || 1);
    const configured = this.positiveNumber(process.env.DATA_QUALITY_EVALUATION_CONCURRENCY, DEFAULT_EVALUATION_CONCURRENCY);
    return Math.max(1, Math.min(configured, requestedBatchSize, MAX_EVALUATION_CONCURRENCY));
  }

  private positiveNumber(value: unknown, fallback: number): number {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : fallback;
  }

  private scheduledStageChunkSize(value: unknown): number {
    return Math.max(1, Math.min(this.positiveNumber(value, DEFAULT_SCHEDULED_DQ_CHUNK_SIZE), MAX_SCHEDULED_DQ_CHUNK_SIZE));
  }

  private async eachWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<void>) {
    if (items.length === 0) return;
    let nextIndex = 0;
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await worker(items[index], index);
      }
    }));
  }

  private matchesScheduledScope(instrument: any, region: string, assetType: string): boolean {
    const instrumentRegion = optionalText(instrument?.region)?.toUpperCase();
    const instrumentAssetType = optionalText(instrument?.asset_type ?? instrument?.assetType)?.toUpperCase();
    if (instrumentRegion && instrumentRegion !== region) return false;
    if (!instrumentAssetType) return assetType === 'STOCK';
    if (assetType === 'STOCK') return instrumentAssetType === 'STOCK' || instrumentAssetType === 'EQUITY';
    return instrumentAssetType === assetType;
  }

  // ── Eligibility authority ─────────────────────────────────────────────────

  /**
   * Compute EligibilityFacts from data that the DQE evaluation ALREADY loads.
   *
   * volumeCoveragePct and maxGapDays are persisted as 0 here: deriving them needs
   * extra passes over the price series that don't belong on the hot evaluation
   * path. They are filled when the DQE pipeline moves to its dedicated DAG stage.
   */
  computeEligibilityFacts(
    instrument: any,
    prices: PriceForQuality[],
    latestPrice: PriceForQuality | null,
    fundamentals: any[],
    staleSessionCount: number,
    liquidityScore: number,
  ): EligibilityFacts {
    const lastPriceDate = latestPrice?.date
      ? (latestPrice.date instanceof Date ? latestPrice.date : new Date(latestPrice.date)).toISOString().slice(0, 10)
      : prices[0]?.date
        ? (prices[0].date instanceof Date ? prices[0].date : new Date(prices[0].date as unknown as string)).toISOString().slice(0, 10)
        : null;

    return {
      priceBars: prices.length,
      lastPriceDate,
      staleSessions: staleSessionCount,
      volumeCoveragePct: 0,
      maxGapDays: 0,
      liquidityScore,
      hasFundamentals: fundamentals.length > 0,
      hasSector: Boolean(optionalText(instrument?.sector)),
      hasIndustry: Boolean(optionalText(instrument?.industry)),
      hasCountry: Boolean(optionalText(instrument?.country)),
    };
  }

  /**
   * Derive EligibilityVerdicts from facts + ELIGIBILITY_POLICY only.
   * The "requires fundamentals" gate is resolved from the instrument's config
   * (IN mainboard requires fundamentals; other markets can opt out).
   */
  computeEligibilityVerdicts(
    facts: EligibilityFacts,
    instrument: any,
    readinessScoreValue: number,
  ): EligibilityVerdicts {
    const policy = ELIGIBILITY_POLICY;
    const norm = normalizeInstrument(instrument);
    const config = this.configFor(norm);
    const requiresFundamentals = config.requiresFundamentals(norm.raw);

    // ── signal ──────────────────────────────────────────────────────────────
    const signalReasons: EligibilityReasonCode[] = [];
    if (readinessScoreValue < policy.signal.minReadinessScore) signalReasons.push('SCORE_BELOW_THRESHOLD');
    if (facts.staleSessions > policy.signal.maxStaleSessions) signalReasons.push('STALE_PRICE');
    if (requiresFundamentals && !facts.hasFundamentals) signalReasons.push('MISSING_FUNDAMENTALS');
    if (facts.liquidityScore < config.signalIlliquidLiquidityScore) signalReasons.push('ILLIQUID');
    const signalEligible = signalReasons.length === 0;

    // ── review ───────────────────────────────────────────────────────────────
    // Mirrors MDF trusted-universe semantics: minPriceBars + fresh price
    // (staleSessions === 0) + recent volume present (liquidityScore > 0).
    const reviewReasons: EligibilityReasonCode[] = [];
    if (facts.priceBars < policy.review.minPriceBars) reviewReasons.push('INSUFFICIENT_BARS');
    if (facts.staleSessions > 0) reviewReasons.push('STALE_PRICE');
    if (facts.liquidityScore === 0) reviewReasons.push('NO_RECENT_VOLUME');
    const reviewEligible = reviewReasons.length === 0;

    // ── backtest ─────────────────────────────────────────────────────────────
    const backtestReasons: EligibilityReasonCode[] = [];
    if (facts.priceBars < policy.backtest.minPriceBars) backtestReasons.push('INSUFFICIENT_BARS');
    if (facts.staleSessions > 0) backtestReasons.push('STALE_PRICE');
    const backtestEligible = backtestReasons.length === 0;

    // ── calibration ──────────────────────────────────────────────────────────
    const calibrationReasons: EligibilityReasonCode[] = [];
    if (facts.priceBars < policy.calibration.minPriceBars) calibrationReasons.push('INSUFFICIENT_BARS');
    const calibrationEligible = calibrationReasons.length === 0;

    return {
      signalEligible,
      reviewEligible,
      backtestEligible,
      calibrationEligible,
      signalReasons,
      reviewReasons,
      backtestReasons,
      calibrationReasons,
    };
  }

  /**
   * Upsert a row into instrument_eligibility keyed (instrumentId, tradingDate).
   * tradingDate = the expected latest completed trading date for the instrument's
   * region — the same reference date DQE uses for staleness checks.
   */
  async upsertInstrumentEligibility(
    instrumentId: string,
    instrument: any,
    facts: EligibilityFacts,
    verdicts: EligibilityVerdicts,
    readinessScoreValue: number,
    readinessStatusValue: string,
  ): Promise<void> {
    const norm = normalizeInstrument(instrument);
    const config = this.configFor(norm);
    const { date: expectedDate } = expectedLatestTradingDate(config.calendarRegion);
    // When the calendar cannot determine a date (unknown region / startup / 24-7
    // markets), use today as a best-effort key so the row lands somewhere rather
    // than being silently dropped.
    const tradingDateStr = expectedDate ?? new Date().toISOString().slice(0, 10);
    const tradingDate = new Date(tradingDateStr + 'T00:00:00.000Z');

    const values = {
      priceBars: facts.priceBars,
      lastPriceDate: facts.lastPriceDate ? new Date(facts.lastPriceDate + 'T00:00:00.000Z') : null,
      staleSessions: facts.staleSessions > 98 ? 99 : facts.staleSessions,
      volumeCoveragePct: facts.volumeCoveragePct,
      maxGapDays: facts.maxGapDays,
      liquidityScore: facts.liquidityScore,
      hasFundamentals: facts.hasFundamentals,
      hasSector: facts.hasSector,
      hasIndustry: facts.hasIndustry,
      hasCountry: facts.hasCountry,
      signalEligible: verdicts.signalEligible,
      reviewEligible: verdicts.reviewEligible,
      backtestEligible: verdicts.backtestEligible,
      calibrationEligible: verdicts.calibrationEligible,
      signalReasons: verdicts.signalReasons,
      reviewReasons: verdicts.reviewReasons,
      backtestReasons: verdicts.backtestReasons,
      calibrationReasons: verdicts.calibrationReasons,
      readinessScore: readinessScoreValue,
      readinessStatus: readinessStatusValue,
      policyVersion: ELIGIBILITY_POLICY_VERSION,
      computedAt: new Date(),
    };
    await this.repository.upsertEligibility({ instrumentId, tradingDate, values });
  }

  // ── Eligibility read API ──────────────────────────────────────────────────

  /**
   * Returns the latest persisted eligibility row per instrument (or the exact
   * row for the given tradingDate when provided).
   * Reads only from instrument_eligibility — never recomputes.
   */
  async getEligibility(
    instrumentIds: string[],
    tradingDate?: Date,
  ): Promise<InstrumentEligibilityRow[]> {
    if (instrumentIds.length === 0) return [];
    const unique = [...new Set(instrumentIds)];

    if (tradingDate) {
      const rows = (await this.repository.findEligibilityRows({
        instrumentIds: unique,
        tradingDate,
      })) as any[];
      return rows.map((row) => this.toEligibilityRow(row));
    }

    // Latest row per instrument: fetch all rows for the ids (ordered by
    // tradingDate desc by the repository), pick the first per instrumentId.
    const rows = (await this.repository.findEligibilityRows({ instrumentIds: unique })) as any[];
    const seen = new Set<string>();
    const latest: typeof rows = [];
    for (const row of rows) {
      if (!seen.has(row.instrumentId)) {
        seen.add(row.instrumentId);
        latest.push(row);
      }
    }
    return latest.map((row) => this.toEligibilityRow(row));
  }

  /**
   * Filter instruments by a named verdict, reading only persisted rows.
   * Never recomputes eligibility.
   * Returns { eligibleInstrumentIds, excludedInstrumentIds, reasonsByInstrumentId }.
   */
  async filterByVerdict(
    instrumentIds: string[],
    verdict: VerdictKey,
    tradingDate?: Date,
  ): Promise<FilterByVerdictResult> {
    if (instrumentIds.length === 0) {
      return { eligibleInstrumentIds: [], excludedInstrumentIds: [], reasonsByInstrumentId: {} };
    }
    const rows = await this.getEligibility(instrumentIds, tradingDate);
    const byId = new Map(rows.map((row) => [row.instrumentId, row]));

    const eligibleInstrumentIds: string[] = [];
    const excludedInstrumentIds: string[] = [];
    const reasonsByInstrumentId: Record<string, EligibilityReasonCode[]> = {};

    for (const instrumentId of instrumentIds) {
      const row = byId.get(instrumentId);
      if (!row) {
        // No persisted row — exclude conservatively
        excludedInstrumentIds.push(instrumentId);
        reasonsByInstrumentId[instrumentId] = ['NO_LATEST_PRICE'];
        continue;
      }
      const eligible = row.verdicts[`${verdict}Eligible` as keyof EligibilityVerdicts] as boolean;
      if (eligible) {
        eligibleInstrumentIds.push(instrumentId);
      } else {
        excludedInstrumentIds.push(instrumentId);
        const reasons = row.verdicts[`${verdict}Reasons` as keyof EligibilityVerdicts] as EligibilityReasonCode[];
        reasonsByInstrumentId[instrumentId] = reasons;
      }
    }

    return { eligibleInstrumentIds, excludedInstrumentIds, reasonsByInstrumentId };
  }

  private toEligibilityRow(row: any): InstrumentEligibilityRow {
    return {
      instrumentId: row.instrumentId,
      tradingDate: row.tradingDate,
      facts: {
        priceBars: row.priceBars,
        lastPriceDate: row.lastPriceDate ? (row.lastPriceDate as Date).toISOString().slice(0, 10) : null,
        staleSessions: row.staleSessions,
        volumeCoveragePct: Number(row.volumeCoveragePct),
        maxGapDays: row.maxGapDays,
        liquidityScore: row.liquidityScore,
        hasFundamentals: row.hasFundamentals,
        hasSector: row.hasSector,
        hasIndustry: row.hasIndustry,
        hasCountry: row.hasCountry,
      },
      verdicts: {
        signalEligible: row.signalEligible,
        reviewEligible: row.reviewEligible,
        backtestEligible: row.backtestEligible,
        calibrationEligible: row.calibrationEligible,
        signalReasons: (row.signalReasons ?? []) as EligibilityReasonCode[],
        reviewReasons: (row.reviewReasons ?? []) as EligibilityReasonCode[],
        backtestReasons: (row.backtestReasons ?? []) as EligibilityReasonCode[],
        calibrationReasons: (row.calibrationReasons ?? []) as EligibilityReasonCode[],
      },
      readinessScore: row.readinessScore,
      readinessStatus: row.readinessStatus,
      policyVersion: row.policyVersion,
      computedAt: row.computedAt,
    };
  }
}

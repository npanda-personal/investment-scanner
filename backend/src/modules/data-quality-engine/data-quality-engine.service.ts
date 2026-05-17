import { MarketDataFoundationService } from '../market-data-foundation';
import { DataQualityEngineRepository } from './data-quality-engine.repository';
import type {
  CoverageStatus,
  DataQualityEvaluateRequest,
  DataQualityEvaluateResponse,
  DataQualityEvaluationDto,
  DataQualityFilterOptions,
  DataQualityFilterResult,
  DataQualityListResponse,
  DataQualityQuery,
  DataQualityTierEvidence,
  DataQualityUseCaseTiers,
  LiquidityStatus,
  PriceForQuality,
  SignalReadinessStatus,
} from './data-quality-engine.types';

const DAY_MS = 86_400_000;
const STALE_PRICE_DAYS = 7;
const DEFAULT_EVALUATION_CONCURRENCY = 6;
const MAX_EVALUATION_CONCURRENCY = 10;
const PHASE0_AUTOMATION_NOT_AUTHORIZED = 'PHASE0_AUTOMATION_NOT_AUTHORIZED';
const TIER_REASON_STALE_PRICE = 'STALE_PRICE_DATA';
const TIER_REASON_UNUSABLE_COVERAGE = 'UNUSABLE_COVERAGE';
const TIER_REASON_SIGNAL_NOT_READY = 'SIGNAL_NOT_READY';
const TIER_REASON_SIGNAL_LIMITED = 'SIGNAL_LIMITED';
const TIER_REASON_THIN_LIQUIDITY = 'THIN_OR_ILLIQUID_LIQUIDITY';
const TIER_REASON_SIGNAL_LEGACY_INELIGIBLE = 'LEGACY_SIGNAL_EVIDENCE_INELIGIBLE';
const TIER_REASON_TRUST_CONTEXT_MISSING = 'TRUST_CONTEXT_MISSING';
const TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE = 'TRUSTED_BASELINE_HISTORY_INCOMPLETE';
const TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING = 'LISTING_DATE_CONFIDENCE_MISSING';
const TIER_REASON_BACKTEST_LEGACY_INELIGIBLE = 'LEGACY_BACKTEST_EVIDENCE_INELIGIBLE';
const TIER_REASON_CALIBRATION_LEGACY_INELIGIBLE = 'LEGACY_CALIBRATION_EVIDENCE_INELIGIBLE';
const TIER_REASON_CALIBRATION_SIGNAL_HISTORY_MISSING = 'CALIBRATION_SIGNAL_HISTORY_MISSING';

export class DataQualityEngineService {
  constructor(
    private readonly repository = new DataQualityEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService: { signalHistory(input: any): Promise<any[]> } | null = null
  ) {}

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

  async filterEligibleInstruments(instrumentIds: string[], options: DataQualityFilterOptions = {}): Promise<DataQualityFilterResult> {
    const evaluations = await this.getEvaluationsForInstruments(instrumentIds);
    const byId = new Map(evaluations.map((evaluation) => [evaluation.instrumentId, evaluation]));
    const allowed = options.allowedReadinessStatuses || (options.includeLimited ? ['READY', 'LIMITED'] : ['READY']);
    const minScore = options.minSignalReadinessScore ?? 70;
    const skipUnusable = options.skipUnusable ?? true;
    const missingBehavior = options.missingQualityBehavior ?? 'SKIP';
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
      const blocked =
        !evaluation.eligibleForSignals ||
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

  async evaluateAndPersistInstrument(instrument: any): Promise<DataQualityEvaluationDto> {
    const [pricesResponse, latestResponse, fundamentalsResponse, actionsResponse, latestSignal] = await Promise.all([
      this.marketDataService.listPricesByInstrumentId(instrument.id, 300).catch(() => null),
      this.marketDataService.latestPriceByInstrumentId(instrument.id).catch(() => null),
      this.marketDataService.storedFundamentalsByInstrumentId(instrument.id).catch(() => null),
      this.marketDataService.storedCorporateActionsByInstrumentId(instrument.id).catch(() => null),
      this.signalService?.signalHistory({ instrumentId: instrument.id, limit: 1 }).catch(() => []) ?? Promise.resolve([]),
    ]);
    const prices = this.normalizePrices(pricesResponse?.prices || []);
    const latest = latestResponse?.latest || null;
    const fundamentals = fundamentalsResponse?.records || [];
    const actions = actionsResponse?.actions || [];
    const evaluated = this.evaluateInstrument(instrument, prices, latest, fundamentals, actions, latestSignal.length > 0);
    return this.repository.upsertEvaluation(evaluated);
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
    const dataGaps: string[] = [];
    const warnings: string[] = [];
    const readinessReasons: string[] = [];
    const readinessBlockers: string[] = [];
    const companyName = this.optionalText(instrument.company_name ?? instrument.companyName ?? instrument.name);
    const sector = this.optionalText(instrument.sector);
    const industry = this.optionalText(instrument.industry);
    const country = this.optionalText(instrument.country);
    const currency = this.optionalText(instrument.currency);
    const tierEvidence = this.tierEvidence(instrument, hasSignal);
    const priceCount = prices.length;
    const latestDate = latestPrice?.date ? new Date(latestPrice.date) : prices[0]?.date ? new Date(prices[0].date) : null;
    const stale = !latestDate || Date.now() - latestDate.getTime() > STALE_PRICE_DAYS * DAY_MS;
    const volumeValues = prices.map((price) => this.optionalNumber(price.volume)).filter((value): value is number => value !== null);
    const adjustedFallbackCount = prices.filter((price) => price.adjusted_close === null || price.adjusted_close === undefined).length;

    if (priceCount < 50) dataGaps.push('Price history has fewer than 50 rows.');
    if (priceCount < 200) dataGaps.push('Price history has fewer than 200 rows for SMA200.');
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

    const liquidity = this.calculateLiquidity(prices);
    if (liquidity.status === 'LIQUID') readinessReasons.push('Recent volume supports liquidity checks.');
    else readinessBlockers.push(`Liquidity status is ${liquidity.status}.`);
    if (priceCount >= 50) readinessReasons.push('Enough price history for SMA50.');
    else readinessBlockers.push('SMA50 requires at least 50 price rows.');
    if (priceCount >= 200) readinessReasons.push('Enough price history for SMA200.');
    else readinessBlockers.push('SMA200 requires at least 200 price rows.');
    if (priceCount >= 14) readinessReasons.push('Enough price history for RSI.');
    else readinessBlockers.push('RSI requires at least 14 price rows.');
    if (stale) readinessBlockers.push('Latest price is stale.');
    if (!sector || !country) readinessBlockers.push('Sector and country metadata are required for stronger signal context.');

    const coverageScore = this.coverageScore({ sector, industry, country, currency }, priceCount, latestPrice, stale, fundamentals.length, corporateActions.length, volumeValues.length, adjustedFallbackCount);
    const signalReadinessScore = this.readinessScore(priceCount, stale, volumeValues.length, { sector, country }, liquidity.score);
    const eligibleForSignals = signalReadinessScore >= 70 && !stale;
    const coverageStatus = this.coverageStatus(coverageScore);
    const signalReadinessStatus = this.readinessStatus(signalReadinessScore);
    const eligibleForBacktesting = priceCount >= 252 && !stale;
    const eligibleForCalibration = hasSignal && priceCount >= 60;
    const useCaseTiers = this.useCaseTiers({
      stale,
      coverageStatus,
      signalReadinessStatus,
      liquidityStatus: liquidity.status,
      eligibleForSignals,
      eligibleForBacktesting,
      eligibleForCalibration,
      tierEvidence,
    });
    this.tierReasonsIntoReadiness(useCaseTiers, readinessReasons, readinessBlockers);

    return {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      companyName,
      sector,
      industry,
      country,
      currency,
      coverageScore,
      coverageStatus,
      signalReadinessScore,
      signalReadinessStatus,
      liquidityScore: liquidity.score,
      liquidityStatus: liquidity.status,
      eligibleForSignals,
      eligibleForBacktesting,
      eligibleForCalibration,
      dataGaps,
      warnings,
      readinessReasons,
      readinessBlockers,
      recommendedFixes: this.recommendedFixes(dataGaps, readinessBlockers),
      useCaseTiers,
      tierEvidence,
      lastEvaluatedAt: new Date().toISOString(),
      researchUrl: `/research/stocks/${instrument.id}`,
    };
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

  private normalizePrices(prices: any[]): PriceForQuality[] {
    return prices.map((price) => ({
      date: price.date,
      close: Number(price.close),
      adjusted_close: price.adjusted_close ?? null,
      volume: price.volume ?? null,
      data_status: price.data_status,
    })).filter((price) => Number.isFinite(price.close));
  }

  private coverageScore(instrument: any, priceCount: number, latest: PriceForQuality | null, stale: boolean, fundamentals: number, actions: number, volumes: number, adjustedFallbackCount: number): number {
    let score = 0;
    score += Math.min(30, (priceCount / 252) * 30);
    if (latest && !stale) score += 15;
    else if (latest) score += 5;
    if (fundamentals > 0) score += 12;
    if (actions > 0) score += 5;
    if (instrument.sector) score += 8;
    if (instrument.industry) score += 6;
    if (instrument.country) score += 6;
    if (instrument.currency) score += 5;
    if (volumes > 0) score += 8;
    if (adjustedFallbackCount === 0 && priceCount > 0) score += 5;
    return Math.round(Math.min(100, score));
  }

  private readinessScore(priceCount: number, stale: boolean, volumeCount: number, instrument: any, liquidityScore: number): number {
    let score = 0;
    if (priceCount >= 14) score += 10;
    if (priceCount >= 50) score += 20;
    if (priceCount >= 200) score += 25;
    if (!stale) score += 15;
    if (volumeCount > 0) score += 10;
    if (instrument.sector) score += 5;
    if (instrument.country) score += 5;
    score += Math.min(10, liquidityScore / 10);
    return Math.round(Math.min(100, score));
  }

  private calculateLiquidity(prices: PriceForQuality[]): { score: number; status: LiquidityStatus } {
    const recent = prices.slice(0, 60);
    const volumes = recent.map((price) => this.optionalNumber(price.volume)).filter((value): value is number => value !== null);
    if (volumes.length === 0) return { score: 0, status: 'UNKNOWN' };
    const twenty = volumes.slice(0, 20);
    const average20 = this.average(twenty);
    const median20 = this.median(twenty);
    const zeroRatio = volumes.filter((value) => value <= 0).length / volumes.length;
    let score = 30;
    if ((average20 ?? 0) > 1_000_000) score += 35;
    else if ((average20 ?? 0) > 100_000) score += 25;
    else if ((average20 ?? 0) > 10_000) score += 15;
    if ((median20 ?? 0) > 0) score += 15;
    score -= zeroRatio * 35;
    if (volumes.length >= 20) score += 10;
    score = Math.round(Math.max(0, Math.min(100, score)));
    return { score, status: score >= 70 ? 'LIQUID' : score >= 40 ? 'THIN' : 'ILLIQUID' };
  }

  private coverageStatus(score: number): CoverageStatus {
    if (score >= 80) return 'GOOD';
    if (score >= 60) return 'PARTIAL';
    if (score >= 30) return 'POOR';
    return 'UNUSABLE';
  }

  private readinessStatus(score: number): SignalReadinessStatus {
    if (score >= 75) return 'READY';
    if (score >= 50) return 'LIMITED';
    return 'NOT_READY';
  }

  private optionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private optionalText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private tierEvidence(instrument: any, hasSignal: boolean): DataQualityTierEvidence {
    const trustedBaselineBlockerCodes = Array.isArray(instrument?.trusted_baseline_blocker_codes)
      ? instrument.trusted_baseline_blocker_codes.map((value: unknown) => String(value))
      : Array.isArray(instrument?.trustedBaselineBlockerCodes)
        ? instrument.trustedBaselineBlockerCodes.map((value: unknown) => String(value))
        : [];
    return {
      trustedBaselineResidualState: this.optionalText(instrument?.trusted_baseline_residual_state ?? instrument?.trustedBaselineResidualState)?.toUpperCase() ?? null,
      requiredHistoryStatus: this.optionalText(instrument?.required_history_status ?? instrument?.requiredHistoryStatus)?.toUpperCase() ?? null,
      listingDateStatus: this.optionalText(instrument?.listing_date_status ?? instrument?.listingDateStatus)?.toUpperCase() ?? null,
      trustedBaselineBlockerCodes,
      hasSignalHistory: hasSignal,
    };
  }

  private useCaseTiers(input: {
    stale: boolean;
    coverageStatus: CoverageStatus;
    signalReadinessStatus: SignalReadinessStatus;
    liquidityStatus: LiquidityStatus;
    eligibleForSignals: boolean;
    eligibleForBacktesting: boolean;
    eligibleForCalibration: boolean;
    tierEvidence: DataQualityTierEvidence;
  }): DataQualityUseCaseTiers {
    const trustContextMissing = !input.tierEvidence.requiredHistoryStatus;
    const historyIncomplete = Boolean(input.tierEvidence.requiredHistoryStatus && input.tierEvidence.requiredHistoryStatus !== 'COMPLETE');
    const listingDateConfidenceMissing = !input.tierEvidence.listingDateStatus || input.tierEvidence.listingDateStatus === 'MISSING_USED_15_YEAR_TARGET';

    const dailyReviewLimitedReasons: string[] = [];
    if (trustContextMissing) dailyReviewLimitedReasons.push(TIER_REASON_TRUST_CONTEXT_MISSING);
    if (historyIncomplete) dailyReviewLimitedReasons.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
    if (listingDateConfidenceMissing) dailyReviewLimitedReasons.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);
    if (input.signalReadinessStatus === 'NOT_READY') dailyReviewLimitedReasons.push(TIER_REASON_SIGNAL_NOT_READY);
    if (input.signalReadinessStatus === 'LIMITED') dailyReviewLimitedReasons.push(TIER_REASON_SIGNAL_LIMITED);
    if (input.liquidityStatus === 'THIN' || input.liquidityStatus === 'ILLIQUID') dailyReviewLimitedReasons.push(TIER_REASON_THIN_LIQUIDITY);

    const dailyReview = input.stale
      ? { status: 'BLOCKED' as const, reasons: [TIER_REASON_STALE_PRICE] }
      : input.coverageStatus === 'UNUSABLE'
        ? { status: 'BLOCKED' as const, reasons: [TIER_REASON_UNUSABLE_COVERAGE] }
        : dailyReviewLimitedReasons.length > 0
          ? { status: 'LIMITED' as const, reasons: dailyReviewLimitedReasons }
          : { status: 'READY' as const, reasons: [] };

    const signalLimitedReasons: string[] = [];
    if (trustContextMissing) signalLimitedReasons.push(TIER_REASON_TRUST_CONTEXT_MISSING);
    if (historyIncomplete) signalLimitedReasons.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
    if (listingDateConfidenceMissing) signalLimitedReasons.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);
    if (input.signalReadinessStatus === 'LIMITED') signalLimitedReasons.push(TIER_REASON_SIGNAL_LIMITED);
    if (!input.eligibleForSignals) signalLimitedReasons.push(TIER_REASON_SIGNAL_LEGACY_INELIGIBLE);
    if (input.liquidityStatus === 'THIN' || input.liquidityStatus === 'ILLIQUID') signalLimitedReasons.push(TIER_REASON_THIN_LIQUIDITY);

    const signal = input.stale || input.signalReadinessStatus === 'NOT_READY'
      ? { status: 'BLOCKED' as const, reasons: [input.stale ? TIER_REASON_STALE_PRICE : TIER_REASON_SIGNAL_NOT_READY] }
      : signalLimitedReasons.length > 0
        ? { status: 'LIMITED' as const, reasons: signalLimitedReasons }
        : { status: 'READY' as const, reasons: [] };

    const backtestBlockers: string[] = [];
    if (trustContextMissing) backtestBlockers.push(TIER_REASON_TRUST_CONTEXT_MISSING);
    if (historyIncomplete) backtestBlockers.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
    if (listingDateConfidenceMissing) backtestBlockers.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);
    if (!input.eligibleForBacktesting) backtestBlockers.push(TIER_REASON_BACKTEST_LEGACY_INELIGIBLE);
    const backtest = backtestBlockers.length > 0
      ? { status: 'BLOCKED' as const, reasons: backtestBlockers }
      : signal.status === 'LIMITED' || input.liquidityStatus === 'THIN'
        ? { status: 'LIMITED' as const, reasons: [signal.status === 'LIMITED' ? TIER_REASON_SIGNAL_LIMITED : TIER_REASON_THIN_LIQUIDITY] }
        : { status: 'READY' as const, reasons: [] };

    const calibrationBlockers: string[] = [];
    if (trustContextMissing) calibrationBlockers.push(TIER_REASON_TRUST_CONTEXT_MISSING);
    if (historyIncomplete) calibrationBlockers.push(TIER_REASON_TRUSTED_BASELINE_HISTORY_INCOMPLETE);
    if (listingDateConfidenceMissing) calibrationBlockers.push(TIER_REASON_LISTING_DATE_CONFIDENCE_MISSING);
    if (!input.tierEvidence.hasSignalHistory) calibrationBlockers.push(TIER_REASON_CALIBRATION_SIGNAL_HISTORY_MISSING);
    if (!input.eligibleForCalibration) calibrationBlockers.push(TIER_REASON_CALIBRATION_LEGACY_INELIGIBLE);
    const calibration = calibrationBlockers.length > 0
      ? { status: 'BLOCKED' as const, reasons: calibrationBlockers }
      : signal.status === 'LIMITED'
        ? { status: 'LIMITED' as const, reasons: [TIER_REASON_SIGNAL_LIMITED] }
        : { status: 'READY' as const, reasons: [] };

    return {
      dailyReview,
      signal,
      backtest,
      calibration,
      automation: { status: 'BLOCKED', reasons: [PHASE0_AUTOMATION_NOT_AUTHORIZED] },
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

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private median(values: number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  private recommendedFixes(gaps: string[], blockers: string[]): string[] {
    const text = [...gaps, ...blockers].join(' ');
    const fixes = new Set<string>();
    if (text.includes('price history') || text.includes('SMA')) fixes.add('Sync more historical price data.');
    if (text.includes('latest price')) fixes.add('Refresh latest price data.');
    if (text.includes('Sector') || text.includes('Industry')) fixes.add('Add sector/industry metadata.');
    if (text.includes('Country')) fixes.add('Add country metadata.');
    if (text.includes('Fundamentals')) fixes.add('Sync or add fundamentals.');
    if (text.includes('Volume')) fixes.add('Refresh price history with volume data.');
    return [...fixes];
  }
}

import { MarketDataFoundationService } from '../market-data-foundation';
import { StockResearchWorkbenchService } from '../stock-research-workbench';
import { DataQualityEngineService } from '../data-quality-engine';
import { StrategyFrameworkEvaluator } from '../strategy-framework/strategy-framework.evaluator';
import { StrategyFrameworkRegistry } from '../strategy-framework/strategy-framework.registry';
import type { StrategyContext, StrategyPerformanceSummaryDto, StrategySignalOutput } from '../strategy-framework/strategy-framework.types';
import { normalizeMarketRegion } from '../../shared/utils/market-scope';
import { SignalGenerationEngineRepository } from './signal-generation-engine.repository';
import type {
  PaginatedSignalResponse,
  SignalConfidence,
  SignalDirection,
  SignalHistoryQuery,
  SignalItem,
  SignalPricePoint,
  SignalQuery,
  SignalResultDto,
  SignalRunRequest,
  SignalRunResponse,
  SignalBlockedStrategySummary,
  SignalStrategyMatchSummary,
  SignalDataQualityEligibility,
  SignalScoringInputSummary,
  SignalTriggerContractDto,
  SignalTriggerPriceEvidence,
  SignalTriggerType,
} from './signal-generation-engine.types';
import {
  signal_generation_engine_batch_size,
  signal_generation_engine_max_workers_count,
  signal_generation_engine_provider_throttle_ms,
  signal_generation_engine_workers_count,
} from './signal-generation-engine.config';

const TECHNICAL_WEIGHT = 0.4;
const MOMENTUM_WEIGHT = 0.35;
const FUNDAMENTAL_WEIGHT = 0.25;
const MODEL_VERSION = 'signal-engine-v1';
const SIGNAL_GENERATION_PRICE_WINDOW = 520;

type SignalGenerationBatchContext = {
  instrumentsById: Map<string, any>;
  priceWindowsByInstrumentId: Map<string, any[]>;
  fundamentalsByInstrumentId: Map<string, any>;
  strategyPerformanceCache: Map<string, Promise<StrategyPerformanceSummaryDto | null>>;
};

export class SignalGenerationEngineService {
  constructor(
    private readonly repository = new SignalGenerationEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly researchService = new StockResearchWorkbenchService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly strategyRegistry = new StrategyFrameworkRegistry(),
    private readonly strategyFrameworkService?: { performance(code: string, query: { region?: string; assetType?: string }): Promise<StrategyPerformanceSummaryDto[]> }
  ) {}

  async topSignals(query: SignalQuery): Promise<PaginatedSignalResponse> {
    const [{ signals, total }, directionCounts] = await Promise.all([
      this.repository.latestSignals(query),
      this.directionCountsFor(query),
    ]);
    const enriched = await this.enrichSignals(signals, query);
    const trusted = this.trustedReadSignals(enriched);
    const totalCount = this.trustedReadTotal(total, enriched.length, trusted.length);
    return {
      signals: trusted,
      items: trusted,
      total: totalCount,
      totalCount,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + trusted.length < totalCount,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  async screener(query: SignalQuery): Promise<PaginatedSignalResponse> {
    const [{ signals, total }, directionCounts] = await Promise.all([
      this.repository.latestSignals(query),
      this.directionCountsFor(query),
    ]);
    const enriched = await this.enrichSignals(signals, query);
    const trusted = this.trustedReadSignals(enriched);
    const totalCount = this.trustedReadTotal(total, enriched.length, trusted.length);
    return {
      signals: trusted,
      items: trusted,
      total: totalCount,
      totalCount,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + trusted.length < totalCount,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const latest = await this.repository.latestForInstrument(instrumentId);
    if (latest && this.isTrustedReadSignal(latest)) return this.enrichSignal(latest);
    const run = await this.run({ instrumentId, missingQualityBehavior: 'SKIP' });
    const generated = run.results[0] || null;
    return generated ? this.enrichSignal(generated) : null;
  }

  async latestPersistedForInstruments(instrumentIds: string[]): Promise<SignalResultDto[]> {
    const uniqueIds = [...new Set(instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
    const results = await Promise.all(uniqueIds.map((instrumentId) => this.repository.latestForInstrument(instrumentId).catch(() => null)));
    return results.filter((result): result is SignalResultDto => Boolean(result && this.isTrustedReadSignal(result)));
  }

  async run(request: SignalRunRequest): Promise<SignalRunResponse> {
    const startedAt = Date.now();
    const generatedAt = new Date().toISOString();
    const generatedDate = this.normalizeUtcDay(new Date(generatedAt));
    const modelVersion = request.modelVersion || MODEL_VERSION;
    const rulesetVersion = request.rulesetVersion || modelVersion;
    const errors: string[] = [];
    const warnings: string[] = [];
    const explicitInstrumentIds = request.instrumentIds
      ? [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))]
      : [];
    const explicitInstrumentScope = Boolean(request.instrumentId || request.symbol || explicitInstrumentIds.length);
    const batchSize = request.instrumentId || request.symbol
      ? 1
      : explicitInstrumentIds.length || this.clampInt(request.batchSize ?? request.limit, signal_generation_engine_batch_size, 1, signal_generation_engine_batch_size);
    const offset = explicitInstrumentScope ? 0 : this.clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const maxConcurrency = request.instrumentId || request.symbol
      ? 1
      : this.clampInt(request.maxConcurrency ?? process.env.SIGNAL_GENERATION_ENGINE_WORKERS_COUNT, signal_generation_engine_workers_count, 1, signal_generation_engine_max_workers_count);
    const providerThrottleMs = this.clampInt(
      request.providerThrottleMs ?? process.env.SIGNAL_GENERATION_ENGINE_PROVIDER_THROTTLE_MS,
      signal_generation_engine_provider_throttle_ms,
      0,
      2000
    );
    const resolved = await this.resolveRunUniverse(request, batchSize, offset);
    const resolvedInstrumentIds = resolved.instrumentIds;
    let instrumentIds = resolvedInstrumentIds;
    const useDataQualityFilter = request.useDataQualityFilter !== false;
    let filteredDataQualityResult: Awaited<ReturnType<DataQualityEngineService['filterEligibleInstruments']>> | null = null;
    let dataQuality: SignalRunResponse['dataQuality'] = {
      filterApplied: useDataQualityFilter,
      beforeFilter: resolvedInstrumentIds.length,
      afterFilter: resolvedInstrumentIds.length,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
      eligibleInstrumentCount: resolvedInstrumentIds.length,
      attemptedGenerationCount: resolvedInstrumentIds.length,
    };

    if (useDataQualityFilter) {
      const filtered = await this.dataQualityService.filterEligibleInstruments(resolvedInstrumentIds, {
        minSignalReadinessScore: request.minSignalReadinessScore ?? 70,
        allowedReadinessStatuses: request.allowedReadinessStatuses,
        includeLimited: request.includeLimited,
        skipUnusable: request.skipUnusable ?? true,
        missingQualityBehavior: request.missingQualityBehavior ?? 'SKIP',
      }).catch((error: any) => {
        warnings.push(`Data quality filter unavailable; trusted signal generation failed closed: ${error?.message || 'unknown error'}`);
        return {
          eligibleInstrumentIds: [],
          excludedInstrumentIds: resolvedInstrumentIds,
          missingQualityEvaluationCount: resolvedInstrumentIds.length,
          warnings: [],
          evaluationsByInstrumentId: {},
        };
      });
      if (filtered) {
        filteredDataQualityResult = filtered;
        instrumentIds = filtered.eligibleInstrumentIds;
        warnings.push(...filtered.warnings);
        dataQuality = {
          filterApplied: true,
          beforeFilter: resolvedInstrumentIds.length,
          afterFilter: instrumentIds.length,
          excludedByDataQuality: filtered.excludedInstrumentIds.length,
          missingQualityEvaluationCount: filtered.missingQualityEvaluationCount,
          eligibleInstrumentCount: instrumentIds.length,
          attemptedGenerationCount: instrumentIds.length,
        };
      }
    }

    const scope = this.scopeFor(request);
    const runAudit = await this.repository.createRunAudit({
      region: scope.region,
      assetType: scope.assetType,
      requestedByUserId: request.requestedByUserId || 'system',
      modelVersion,
      rulesetVersion,
      sourceDataDate: null,
      generatedDate,
      batchSize,
      offset,
      totalCount: resolved.totalCount,
      warnings,
    });
    const dataQualityEvaluationsByInstrumentId = useDataQualityFilter && filteredDataQualityResult
      ? this.getDataQualityEligibilityMap(resolvedInstrumentIds, filteredDataQualityResult)
      : {};
    const researchContextMode: NonNullable<SignalRunRequest['researchContextMode']> = request.instrumentId || request.symbol ? 'FULL' : 'LIGHTWEIGHT';
    const generationRequest = {
      ...request,
      useDataQualityFilter,
      researchContextMode,
      modelVersion,
      rulesetVersion,
      generationRunId: runAudit.id,
      dataQualityEvaluationsByInstrumentId,
    } as SignalRunRequest & {
      generationRunId: string;
      dataQualityEvaluationsByInstrumentId: Record<string, SignalDataQualityEligibility>;
    };
    const effectiveProviderThrottleMs = researchContextMode === 'LIGHTWEIGHT' ? 0 : providerThrottleMs;
    const batchContext = await this.loadSignalGenerationBatchContext(instrumentIds, generationRequest);
    const generatedResults = await this.generateBatchWithConcurrency(instrumentIds, generationRequest, maxConcurrency, effectiveProviderThrottleMs, batchContext);
    const results = generatedResults
      .map((item) => item.result)
      .filter((result): result is SignalResultDto => Boolean(result));
    errors.push(...generatedResults
      .filter((item) => item.error)
      .map((item) => `${item.instrumentId}: ${item.error}`));
    const processedCount = resolvedInstrumentIds.length;
    const failedCount = errors.length;
    const attemptedGenerationCount = instrumentIds.length;
    const generatedCount = results.filter((result) => result.writeStatus === 'CREATED' || !result.writeStatus).length;
    const updatedCount = results.filter((result) => result.writeStatus === 'UPDATED').length;
    const noOpCount = results.filter((result) => result.writeStatus === 'NO_OP').length;
    const nullResultCount = Math.max(0, attemptedGenerationCount - results.length - failedCount);
    const skippedCount = Math.max(0, processedCount - attemptedGenerationCount) + nullResultCount;
    const nextOffset = offset + processedCount;
    const hasMore = nextOffset < resolved.totalCount;
    const directionCountsGenerated = results.reduce<Record<SignalDirection, number>>((acc, result) => {
      acc[result.direction] += 1;
      return acc;
    }, { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 });
    const durationMs = Date.now() - startedAt;
    const completedRunAudit = await this.repository.completeRunAudit(runAudit.id, {
      status: failedCount > 0 ? (results.length > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
      sourceDataDate: this.latestDate(results.map((result) => result.sourceDataDate || result.sourcePriceDate)),
      processedCount,
      generatedCount,
      updatedCount,
      noOpCount,
      duplicateOrIdempotentCount: updatedCount + noOpCount,
      skippedCount,
      failedCount,
      excludedByDataQuality: dataQuality.excludedByDataQuality,
      missingQualityEvaluationCount: dataQuality.missingQualityEvaluationCount,
      durationMs,
      warnings,
    });

    return {
      generated: generatedCount,
      skipped: skippedCount,
      errors,
      warnings,
      dataQuality,
      results,
      runAudit: completedRunAudit,
      generated_at: generatedAt,
      processedCount,
      totalCount: resolved.totalCount,
      batchSize,
      maxConcurrency,
      providerThrottleMs: effectiveProviderThrottleMs,
      offset,
      nextOffset: hasMore ? nextOffset : null,
      hasMore,
      generatedCount,
      updatedCount,
      noOpCount,
      skippedCount,
      failedCount,
      strategyMatchedCount: request.includeStrategyMatches ? results.reduce((sum, result) => sum + (result.strategyMatches?.length || 0), 0) : undefined,
      strategyBlockedCount: request.includeStrategyMatches ? results.reduce((sum, result) => sum + (result.blockedStrategies?.length || 0), 0) : undefined,
      outOfScopeSkipped: 0,
      directionCountsGenerated,
      scope,
      latestGeneratedAt: results[results.length - 1]?.generated_at ?? null,
      durationMs,
      eligibleInstrumentCount: instrumentIds.length,
      attemptedGenerationCount,
    };
  }

  async latestRunAudit(query: Pick<SignalRunRequest, 'region' | 'assetType' | 'modelVersion'>) {
    return this.repository.latestRunAudit(query);
  }

  async health() {
    const { signals: latest } = await this.repository.latestSignals({ limit: 1 });
    return {
      status: 'ok',
      module: 'signal-generation-engine',
      latest_generated_at: latest[0]?.generated_at ?? null,
      source: 'signal-generation-engine',
      data_status: latest.length > 0 ? 'COMPLETE' : 'MISSING',
      timestamp: new Date().toISOString(),
    };
  }

  async signalHistory(query: SignalHistoryQuery) {
    return this.repository.signalHistory(query);
  }

  async signalHistoryCount(query: Omit<SignalHistoryQuery, 'limit'>) {
    return this.repository.signalHistoryCount(query);
  }

  async funnelDiagnostics(query: { region?: string; assetType?: string; generatedDate?: string; from?: string; to?: string }) {
    return this.repository.funnelDiagnostics(query);
  }

  async latestSignalUniverse(query: SignalQuery) {
    return this.repository.latestSignalUniverse(query);
  }

  async latestSignalUniverseCount(query: Omit<SignalQuery, 'limit'>) {
    return this.repository.latestSignalUniverseCount(query);
  }

  async generateForInstrument(instrumentId: string, options: Pick<SignalRunRequest, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'researchContextMode' | 'region' | 'assetType' | 'modelVersion' | 'rulesetVersion' | 'useDataQualityFilter'> & {
    generationRunId?: string;
    dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility>;
    batchContext?: SignalGenerationBatchContext;
  } = {}): Promise<SignalResultDto | null> {
    const useFullResearchContext = options.researchContextMode !== 'LIGHTWEIGHT';
    const marketScope = { region: options.region, assetType: options.assetType };
    const [instrument, pricesResponse, fundamentalsResponse, research] = await Promise.all([
      options.batchContext?.instrumentsById.has(instrumentId)
        ? Promise.resolve(options.batchContext.instrumentsById.get(instrumentId))
        : this.marketDataService.getInstrument(instrumentId, marketScope),
      options.batchContext?.priceWindowsByInstrumentId.has(instrumentId)
        ? Promise.resolve({ prices: options.batchContext.priceWindowsByInstrumentId.get(instrumentId) || [] })
        : this.marketDataService.listPricesByInstrumentId(instrumentId, SIGNAL_GENERATION_PRICE_WINDOW, undefined, undefined, marketScope),
      options.batchContext?.fundamentalsByInstrumentId.has(instrumentId)
        ? Promise.resolve(options.batchContext.fundamentalsByInstrumentId.get(instrumentId))
        : this.getFundamentalsForGeneration(instrumentId, marketScope, useFullResearchContext),
      useFullResearchContext ? this.researchService.workbench(instrumentId, '3M') : Promise.resolve(null),
    ]);

    if (!instrument) return null;

    const prices = this.toPricePoints(pricesResponse?.prices || []);
    const latestFundamental = fundamentalsResponse?.records?.[0] || null;
    const peerAveragePe = typeof research?.valuation?.peer_average_pe === 'number' ? research.valuation.peer_average_pe : null;
    const peerAverageYield = typeof research?.valuation?.peer_average_dividend_yield === 'number'
      ? research.valuation.peer_average_dividend_yield
      : null;
    const relativeToPeers = typeof research?.relative_strength?.relative_to_peer_average === 'number'
      ? research.relative_strength.relative_to_peer_average
      : null;

    const technical = this.evaluateTechnical(prices);
    const momentum = this.evaluateMomentum(prices, relativeToPeers);
    const fundamentals = this.evaluateFundamentals(latestFundamental, peerAveragePe, peerAverageYield);
    
    const triggeredSignals = [...technical.signals, ...momentum.signals, ...fundamentals.signals];
    const negativeSignals = [...technical.negativeSignals, ...momentum.negativeSignals, ...fundamentals.negativeSignals];
    const totalEvaluated = triggeredSignals.length + negativeSignals.length;

    const score = this.compositeScore(technical.score, momentum.score, fundamentals.score);
    const direction = this.directionForScore(score);
    const confidence = this.confidenceFor(prices, latestFundamental, totalEvaluated);

    const warnings: string[] = [];
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    if (latestDate && latestDate < fiveDaysAgo) {
      warnings.push(`Market data is stale (last update: ${latestDate.toISOString().split('T')[0]})`);
    }
    if (prices.length < 50) {
      warnings.push(`Insufficient price history (${prices.length} days) for reliable indicators`);
    }

    let result: SignalResultDto = {
      instrument_id: instrument.id,
      symbol: instrument.symbol,
      company_name: instrument.company_name ?? null,
      sector: instrument.sector ?? null,
      country: instrument.country ?? null,
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: instrument.currency ?? null,
      priceTimestamp: null,
      score,
      direction,
      confidence,
      triggered_signals: triggeredSignals,
      negative_signals: negativeSignals,
      explanation: this.explain(direction, triggeredSignals, negativeSignals),
      generated_at: new Date().toISOString(),
      modelVersion: options.modelVersion || MODEL_VERSION,
      rulesetVersion: options.rulesetVersion || options.modelVersion || MODEL_VERSION,
      generatedDate: this.normalizeUtcDay(new Date()).toISOString(),
      sourceDataDate: latestDate?.toISOString() ?? null,
      sourcePriceDate: latestDate?.toISOString() ?? null,
      scoringInputSummary: this.scoringInputSummary(prices, latestFundamental, useFullResearchContext || Boolean(options.includeStrategyMatches)),
      dataQualityEligibility: this.dataQualityEligibilityFor(instrumentId, options),
      generationRunId: options.generationRunId ?? null,
      source: 'signal-generation-engine',
      data_status: prices.length >= 50 ? (prices.length >= 200 ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
      warnings,
    };

    if (options.includeStrategyMatches || options.strategyCode || options.onlyStrategyEligible || options.excludeNoiseFiltered) {
      result = await this.attachStrategyMatches(result, prices, instrument, options, options.batchContext?.strategyPerformanceCache);
      if (!this.signalPassesStrategyFilters(result, options)) return null;
    }

    const saved = await this.persistSignalResult(result);
    const persisted = {
      ...saved.result,
      writeStatus: saved.status,
      strategyMatches: result.strategyMatches,
      blockedStrategies: result.blockedStrategies,
    };
    return this.withTriggerContract(persisted, instrument);
  }

  async enrichSignals(signals: SignalResultDto[], options: Pick<SignalQuery, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable'> = {}): Promise<SignalResultDto[]> {
    if (signals.length === 0) return [];
    
    try {
      const instrumentIds = Array.from(new Set(signals.map(s => s.instrument_id)));
      const symbols = Array.from(new Set(signals.map(s => s.symbol)));

      // Batch fetch instruments and latest prices using public service methods
      const [instruments, latestPrices] = await Promise.all([
        this.marketDataService.getInstrumentsByIds(instrumentIds),
        this.marketDataService.getLatestPricesBySymbols(symbols)
      ]);

      const instrumentMap = new Map(instruments.map((i: any) => [i.id, i]));
      const priceMap = new Map(latestPrices.map((p: any) => [p.symbol, p]));
      const includeStrategyContext = this.shouldAttachStrategyMatches(options);
      const ratingCache = new Map<string, Promise<StrategyPerformanceSummaryDto | null>>();

      const enriched = await Promise.all(signals.map(async (signal) => {
        const instrument = instrumentMap.get(signal.instrument_id);
        const latest = priceMap.get(signal.symbol);
        
        const currentPrice = latest ? Number((latest as any).adjusted_close ?? (latest as any).close) : null;
        
        let previousClose: number | null = null;
        if (latest) {
          // For previous close, we still do a targeted lookup per signal for now
          // to avoid fetching massive amounts of price history in one go.
          const prevPrices = await this.marketDataService.listPricesByInstrumentId(signal.instrument_id, 2).catch(() => null);
          previousClose = prevPrices?.prices?.[1]?.adjusted_close ?? null;
        }

        const dailyChange = currentPrice !== null && previousClose !== null ? currentPrice - previousClose : null;
        
        let result: SignalResultDto = {
          ...signal,
          currentPrice,
          previousClose,
          dailyChange,
          dailyChangePercent: dailyChange !== null && previousClose !== null && previousClose > 0 ? dailyChange / previousClose : null,
          currency: instrument?.currency ?? signal.currency ?? null,
          priceTimestamp: (latest as any)?.date ? new Date((latest as any).date).toISOString() : null,
        };
        if (!includeStrategyContext) return this.withTriggerContract(result, instrument);
        const history = await this.marketDataService.listPricesByInstrumentId(signal.instrument_id, 500).catch(() => null);
        const prices = this.toPricePoints(history?.prices || []);
        result = await this.attachStrategyMatches(result, prices, instrument, options, ratingCache);
        return this.withTriggerContract(result, instrument);
      }));
      return enriched.filter((signal) => this.signalPassesStrategyFilters(signal, options));
    } catch (error) {
      console.error('Signal enrichment failed:', error);
      return signals.map(signal => ({
        ...signal,
        currentPrice: null,
        previousClose: null,
        dailyChange: null,
        dailyChangePercent: null,
        priceTimestamp: null,
      })).map((signal) => this.withTriggerContract(signal)).filter((signal) => this.signalPassesStrategyFilters(signal, options));
    }
  }

  async enrichSignal(signal: SignalResultDto): Promise<SignalResultDto> {
    const enriched = await this.enrichSignals([signal]);
    return enriched[0];
  }

  evaluateTechnical(prices: SignalPricePoint[]) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const latest = prices[0];
    const previous = prices[1];
    const sma50 = this.sma(prices, 50);
    const sma200 = this.sma(prices, 200);
    const high52 = this.periodHigh(prices, 252);
    const low52 = this.periodLow(prices, 252);
    const rsiNow = this.rsi(prices, 14);
    const rsiPrev = this.rsi(prices.slice(1), 14);
    const currentAtr = this.atr(prices, 14);
    const currentClosePos = this.closePosition(latest);
    const currentAdx = this.adx(prices, 14);
    const obvTrendingUp = this.isObvTrendingUp(prices, 10);
    const obvTrendingDown = this.isObvTrendingDown(prices, 10);

    const isRangeBound = currentAdx !== null && currentAdx < 20;

    if (latest && sma50 !== null) {
      if (isRangeBound) {
        // Mute SMA signals in range-bound markets (noise)
      } else {
        (latest.adjusted_close >= sma50 ? signals : negativeSignals).push(this.signal(
          latest.adjusted_close >= sma50 ? 'PRICE_ABOVE_SMA50' : 'PRICE_BELOW_SMA50',
          latest.adjusted_close >= sma50 ? 'price is above SMA50' : 'price is below SMA50',
          'TECHNICAL'
        ));
      }
    }
    if (sma50 !== null && sma200 !== null) {
      if (isRangeBound) {
        // Mute SMA crossover signals in range-bound markets
      } else {
        (sma50 >= sma200 ? signals : negativeSignals).push(this.signal(
          sma50 >= sma200 ? 'SMA50_ABOVE_SMA200' : 'SMA50_BELOW_SMA200',
          sma50 >= sma200 ? 'SMA50 is above SMA200' : 'SMA50 is below SMA200',
          'TECHNICAL'
        ));
      }
    }
    
    // Candlestick Rejection & Breakouts
    if (latest && high52 !== null && latest.adjusted_close >= high52 * 0.97) {
      if (currentClosePos !== null && currentClosePos < 0.3) {
         negativeSignals.push(this.signal('FALSE_BREAKOUT_REJECTION', 'price tagged 52-week high but closed in the bottom 30% of the daily range (Trap)', 'TECHNICAL'));
      } else {
         signals.push(this.signal('NEAR_52_WEEK_HIGH', 'price is near a 52-week high', 'TECHNICAL'));
      }
    }
    if (latest && low52 !== null && latest.adjusted_close <= low52 * 1.03) {
      if (currentClosePos !== null && currentClosePos > 0.7) {
         signals.push(this.signal('FALSE_BREAKDOWN_REJECTION', 'price tagged 52-week low but closed in the top 30% of the daily range (Trap)', 'TECHNICAL'));
      } else {
         negativeSignals.push(this.signal('NEAR_52_WEEK_LOW', 'price is near a 52-week low', 'TECHNICAL'));
      }
    }

    // Mean Reversion is stronger in range-bound markets
    if (rsiNow !== null && rsiPrev !== null && rsiPrev < 30 && rsiNow > rsiPrev) {
      signals.push(this.signal(isRangeBound ? 'STRONG_RSI_RECOVERY' : 'RSI_RECOVERING', 'RSI is recovering from oversold levels', 'TECHNICAL'));
    }
    if (rsiNow !== null && rsiPrev !== null && rsiPrev > 70 && rsiNow < rsiPrev) {
      negativeSignals.push(this.signal(isRangeBound ? 'STRONG_RSI_REVERSAL' : 'RSI_OVERBOUGHT_REVERSAL', 'RSI is reversing from overbought levels', 'TECHNICAL'));
    }
    
    // Volatility-Adjusted Volume Breakout with Institutional Footprint (OBV)
    const averageVolume = this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number'));
    if (latest?.volume && averageVolume && latest.volume >= averageVolume * 1.5) {
      const priceMove = previous ? Math.abs(latest.adjusted_close - previous.adjusted_close) : 0;
      
      if (currentAtr !== null && priceMove > (currentAtr * 1.5)) {
        if (previous && latest.adjusted_close < previous.adjusted_close) {
          if (obvTrendingDown) {
            negativeSignals.push(this.signal('CONFIRMED_DOWN_VOLUME_SELLOFF', 'heavy selloff exceeding 1.5x ATR with institutional distribution (OBV)', 'TECHNICAL'));
          } else {
            negativeSignals.push(this.signal('DOWN_VOLUME_SELLOFF', 'heavy down-volume selloff exceeding 1.5x ATR', 'TECHNICAL'));
          }
        } else {
          if (obvTrendingUp) {
            signals.push(this.signal('CONFIRMED_VOLUME_BREAKOUT', 'volume breakout exceeding 1.5x ATR with institutional accumulation (OBV)', 'TECHNICAL'));
          } else {
            signals.push(this.signal('VOLUME_BREAKOUT', 'volume breakout confirms the move exceeding 1.5x ATR', 'TECHNICAL'));
          }
        }
      } else if (currentAtr === null) {
        // Fallback if ATR is not available
        (previous && latest.adjusted_close < previous.adjusted_close ? negativeSignals : signals).push(this.signal(
          previous && latest.adjusted_close < previous.adjusted_close ? 'DOWN_VOLUME_SELLOFF' : 'VOLUME_BREAKOUT',
          previous && latest.adjusted_close < previous.adjusted_close ? 'heavy down-volume selloff' : 'volume breakout confirms the move',
          'TECHNICAL'
        ));
      }
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateMomentum(prices: SignalPricePoint[], relativeToPeers: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const oneMonth = this.returnAtOffset(prices, 21);
    const threeMonth = this.returnAtOffset(prices, 63);
    const sixMonth = this.returnAtOffset(prices, 126);

    this.pushReturnSignal(oneMonth, 'ONE_MONTH_MOMENTUM', '1M momentum is positive', '1M momentum is negative', signals, negativeSignals);
    this.pushReturnSignal(threeMonth, 'THREE_MONTH_MOMENTUM', '3M momentum is positive', '3M momentum is negative', signals, negativeSignals);
    if (oneMonth !== null && threeMonth !== null && sixMonth !== null && oneMonth > threeMonth / 3 && threeMonth > sixMonth / 2) {
      signals.push(this.signal('SIX_MONTH_ACCELERATION', '6M trend is accelerating', 'MOMENTUM'));
    }
    if (relativeToPeers !== null) {
      (relativeToPeers >= 0 ? signals : negativeSignals).push(this.signal(
        relativeToPeers >= 0 ? 'OUTPERFORMING_PEERS' : 'UNDERPERFORMING_PEERS',
        relativeToPeers >= 0 ? 'stock is outperforming peer average' : 'stock is underperforming peer average',
        'MOMENTUM'
      ));
    }

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  evaluateFundamentals(fundamental: any, peerAveragePe: number | null, peerAverageYield: number | null) {
    const signals: SignalItem[] = [];
    const negativeSignals: SignalItem[] = [];
    const eps = this.optionalNumber(fundamental?.eps);
    const netIncome = this.optionalNumber(fundamental?.net_income);
    const peRatio = this.optionalNumber(fundamental?.pe_ratio);
    const dividendYield = this.optionalNumber(fundamental?.dividend_yield);
    const marketCap = this.optionalNumber(fundamental?.market_cap);

    if (eps !== null) (eps > 0 ? signals : negativeSignals).push(this.signal(eps > 0 ? 'POSITIVE_EPS' : 'NEGATIVE_EPS', eps > 0 ? 'EPS is positive' : 'EPS is negative', 'FUNDAMENTAL'));
    if (netIncome !== null) (netIncome > 0 ? signals : negativeSignals).push(this.signal(netIncome > 0 ? 'POSITIVE_NET_INCOME' : 'NEGATIVE_NET_INCOME', netIncome > 0 ? 'net income is positive' : 'net income is negative', 'FUNDAMENTAL'));
    if (peRatio !== null && peerAveragePe !== null && peRatio > 0) {
      (peRatio <= peerAveragePe ? signals : negativeSignals).push(this.signal(peRatio <= peerAveragePe ? 'PE_BELOW_PEERS' : 'PE_ABOVE_PEERS', peRatio <= peerAveragePe ? 'P/E is below peer average' : 'P/E is above peer average', 'FUNDAMENTAL'));
    }
    if (dividendYield !== null && peerAverageYield !== null) {
      (dividendYield >= peerAverageYield ? signals : negativeSignals).push(this.signal(dividendYield >= peerAverageYield ? 'YIELD_ABOVE_PEERS' : 'YIELD_BELOW_PEERS', dividendYield >= peerAverageYield ? 'dividend yield is above peer average' : 'dividend yield is below peer average', 'FUNDAMENTAL'));
    }
    if (marketCap !== null || fundamental) signals.push(this.signal('FUNDAMENTALS_AVAILABLE', 'market cap or fundamentals are available', 'FUNDAMENTAL'));

    return { score: this.categoryScore(signals.length, negativeSignals.length), signals, negativeSignals };
  }

  private shouldAttachStrategyMatches(options: Pick<SignalQuery, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable'>) {
    return Boolean(
      options.includeStrategyMatches ||
      options.strategyCode ||
      options.onlyStrategyEligible ||
      options.excludeNoiseFiltered ||
      options.hasStrategyMatch ||
      options.hasBlockedStrategies ||
      options.frameworkBackedDecisionAvailable
    );
  }

  private signalPassesStrategyFilters(
    signal: SignalResultDto,
    options: Pick<SignalQuery, 'onlyStrategyEligible' | 'excludeNoiseFiltered' | 'hasStrategyMatch' | 'hasBlockedStrategies' | 'frameworkBackedDecisionAvailable'>
  ) {
    const matchCount = signal.strategyMatches?.length || 0;
    const blocked = signal.blockedStrategies || [];
    if (options.onlyStrategyEligible && matchCount === 0) return false;
    if (options.hasStrategyMatch && matchCount === 0) return false;
    if (options.hasBlockedStrategies && blocked.length === 0) return false;
    if (options.frameworkBackedDecisionAvailable && matchCount === 0) return false;
    if (options.excludeNoiseFiltered && matchCount === 0 && blocked.length > 0 && blocked.every((item) => item.noiseFiltersTriggered.length > 0)) return false;
    return true;
  }

  private withTriggerContract(signal: SignalResultDto, instrument?: any): SignalResultDto {
    return {
      ...signal,
      triggerContract: this.triggerContractFor(signal, instrument),
    };
  }

  private triggerContractFor(signal: SignalResultDto, instrument?: any): SignalTriggerContractDto {
    const unavailable = new Set<string>();
    const incompleteReasons: string[] = [];
    const primaryStrategy = signal.strategyMatches?.[0] || null;
    const assetClass = this.stringOrNull(instrument?.assetType ?? instrument?.asset_type);
    const region = this.stringOrNull(instrument?.region);
    const strategyId = primaryStrategy?.strategyCode ?? null;
    const strategyVersion = primaryStrategy?.strategyVersion ?? null;
    const sourceProvenPriceEvidence = primaryStrategy?.triggerPriceEvidence?.status === 'SOURCE_PROVEN'
      ? primaryStrategy.triggerPriceEvidence
      : null;
    const attemptedPriceEvidence = primaryStrategy?.triggerPriceEvidence ?? null;
    const triggerTimestamp = primaryStrategy
      ? sourceProvenPriceEvidence?.triggerTimestamp ?? null
      : signal.sourcePriceDate ?? signal.sourceDataDate ?? null;
    const dataQualityStatus = signal.dataQualityEligibility?.signalReadinessStatus ?? null;
    const entryRuleId = sourceProvenPriceEvidence?.entryRuleIds[0] ?? null;
    const timeframe = sourceProvenPriceEvidence?.timeframe ?? primaryStrategy?.timeframe ?? null;

    const mark = (field: string, reason: string) => {
      unavailable.add(field);
      incompleteReasons.push(`${field}: ${reason}`);
    };

    if (!signal.id) mark('signal_id', 'persisted signal id is unavailable in this DTO.');
    if (!assetClass) mark('asset_class', 'instrument asset class is unavailable from the current signal record.');
    if (!region) mark('region', 'instrument market region is unavailable from the current signal record.');
    if (!strategyId) mark('strategy_id', 'no Strategy Framework match is attached to this signal.');
    if (!strategyVersion) mark('strategy_version', 'no Strategy Framework version is attached to this signal.');
    if (!sourceProvenPriceEvidence) {
      mark('trigger_price', primaryStrategy?.triggerPriceEvidence?.unavailableReason || 'source-proven rule-trigger price is unavailable from attached Strategy Framework context.');
    }
    if (!triggerTimestamp) {
      mark('trigger_timestamp', attemptedPriceEvidence?.unavailableReason || 'source-proven trigger timestamp is unavailable from attached Strategy Framework context.');
    }
    if (!timeframe) mark('timeframe', 'rule timeframe is unavailable from attached Strategy Framework context.');
    if (!entryRuleId) mark('entry_rule_id', 'source-proven entry rule id is unavailable from attached Strategy Framework context.');
    mark('exit_rule_id', 'exit rule id is not persisted in the current signal record.');
    mark('invalidation_rule_id', 'invalidation rule id is not persisted in the current signal record.');
    if (!dataQualityStatus) mark('data_quality_status', 'Data Quality readiness snapshot is unavailable from the current signal record.');
    mark('lifecycle_status', 'trigger lifecycle state is not persisted in the current signal record.');
    mark('created_at', 'persistence created timestamp is not exposed by the current signal record.');
    mark('updated_at', 'persistence updated timestamp is not exposed by the current signal record.');

    const contractStatus = signal.auditStatus === 'LEGACY_MISSING'
      ? 'LEGACY_INCOMPLETE'
      : (unavailable.size > 0 ? 'CONTRACT_INCOMPLETE' : 'COMPLETE');

    return {
      contractVersion: 'TriggerObjectV1',
      contractStatus,
      signal_id: signal.id ?? null,
      instrument_id: signal.instrument_id,
      symbol: signal.symbol,
      asset_class: assetClass,
      region,
      strategy_id: strategyId,
      strategy_version: strategyVersion,
      trigger_type: this.triggerTypeFor(signal.direction),
      trigger_price: sourceProvenPriceEvidence?.triggerPrice ?? null,
      trigger_timestamp: triggerTimestamp,
      timeframe,
      entry_rule_id: entryRuleId,
      exit_rule_id: null,
      invalidation_rule_id: null,
      reason_summary: signal.explanation,
      passed_conditions: signal.triggered_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
      failed_conditions: signal.negative_signals.map((item) => ({ code: item.code, label: item.label, category: item.category })),
      data_quality_status: dataQualityStatus,
      lifecycle_status: null,
      created_at: null,
      updated_at: null,
      audit: {
        auditStatus: signal.auditStatus,
        generationRunId: signal.generationRunId ?? null,
        modelVersion: signal.modelVersion ?? null,
        rulesetVersion: signal.rulesetVersion ?? null,
      },
      trigger_price_evidence: this.toTriggerPriceEvidenceDto(sourceProvenPriceEvidence, attemptedPriceEvidence),
      unavailable_fields: Array.from(unavailable),
      incomplete_reasons: incompleteReasons,
    };
  }

  private triggerTypeFor(direction: SignalDirection): SignalTriggerType {
    if (direction === 'BULLISH') return 'bullish_entry_trigger';
    if (direction === 'BEARISH') return 'bearish_trigger';
    return 'risk_warning';
  }

  private toTriggerPriceEvidenceDto(sourceProven: SignalTriggerPriceEvidence | null, attempted: SignalTriggerPriceEvidence | null) {
    const evidence = sourceProven ?? attempted;
    return {
      status: evidence?.status ?? 'UNAVAILABLE',
      source_module: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceModule : null,
      source_field: evidence?.status === 'SOURCE_PROVEN' ? evidence.sourceField : null,
      source_timestamp: evidence?.status === 'SOURCE_PROVEN' ? evidence.triggerTimestamp : null,
      strategy_id: evidence?.strategyCode ?? null,
      strategy_version: evidence?.strategyVersion ?? null,
      timeframe: evidence?.timeframe ?? null,
      entry_rule_ids: evidence?.entryRuleIds ?? [],
      compatibility_only: evidence?.compatibilityOnly ?? true,
      unavailable_reason: evidence?.status === 'UNAVAILABLE' ? evidence.unavailableReason : undefined,
    };
  }

  private stringOrNull(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private async attachStrategyMatches(
    signal: SignalResultDto,
    prices: SignalPricePoint[],
    instrument: any,
    options: Pick<SignalRunRequest, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered'>,
    ratingCache = new Map<string, Promise<StrategyPerformanceSummaryDto | null>>()
  ): Promise<SignalResultDto> {
    const strategies = this.strategiesForMatch(options.strategyCode);
    const context = this.strategyContextForSignal(signal, prices, instrument);
    const strategyMatches: SignalStrategyMatchSummary[] = [];
    const blockedStrategies: SignalBlockedStrategySummary[] = [];

    for (const strategy of strategies) {
      try {
        const result = new StrategyFrameworkEvaluator(strategy).evaluateSignalCandidate(context);
        const rating = await this.latestStrategyPerformance(strategy.code, context.region || 'IN', context.assetType || 'STOCK', ratingCache);
        if (result.eligibleForSignalGeneration && result.blockers.length === 0) strategyMatches.push(this.summarizeMatch(result, strategy, rating, context));
        else blockedStrategies.push(this.summarizeBlocked(result, strategy.name));
      } catch (error: any) {
        blockedStrategies.push({
          strategyCode: strategy?.code || options.strategyCode || 'UNKNOWN',
          strategyName: strategy?.name,
          strategyVersion: strategy?.version || 'UNKNOWN',
          blockers: ['Strategy Framework matching failed.'],
          warnings: [],
          dataGaps: [error?.message || 'Strategy Framework evaluation unavailable.'],
          noiseFiltersTriggered: [],
          reason: 'Strategy Framework matching failed.',
        });
      }
    }

    return { ...signal, strategyMatches, blockedStrategies };
  }

  private strategiesForMatch(strategyCode?: string) {
    if (strategyCode && strategyCode !== 'ALL') {
      return [this.strategyRegistry.get(strategyCode)].filter(Boolean) as any[];
    }
    return this.strategyRegistry.active();
  }

  private strategyContextForSignal(signal: SignalResultDto, prices: SignalPricePoint[], instrument: any): StrategyContext {
    const closes = prices.map((price) => price.adjusted_close);
    return {
      instrumentId: signal.instrument_id,
      symbol: signal.symbol,
      companyName: signal.company_name,
      assetType: instrument?.assetType || instrument?.asset_type || 'STOCK',
      region: this.canonicalRegion(instrument?.region || signal.country),
      exchange: instrument?.exchange ?? null,
      sector: signal.sector,
      country: signal.country,
      latestPrice: signal.currentPrice ?? prices[0]?.adjusted_close ?? null,
      previousClose: signal.previousClose ?? prices[1]?.adjusted_close ?? null,
      prices,
      sma50: this.sma(prices, 50),
      sma200: this.sma(prices, 200),
      rsi: this.rsi(prices, 14),
      return20d: this.returnAtOffset(prices, 20),
      high52Week: this.periodHigh(prices, 252),
      low52Week: this.periodLow(prices, 252),
      volatility: this.stddev(closes.slice(0, 63)),
      averageVolume20: this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number')),
      rawSignal: signal,
      dataQuality: {
        signalReadinessStatus: signal.data_status === 'MISSING' ? 'NOT_READY' : signal.data_status === 'PARTIAL' ? 'LIMITED' : 'READY',
        coverageStatus: signal.data_status === 'MISSING' ? 'UNUSABLE' : signal.data_status === 'PARTIAL' ? 'PARTIAL' : 'GOOD',
        liquidityStatus: 'UNKNOWN',
        eligibleForSignals: signal.data_status !== 'MISSING',
        eligibleForBacktesting: prices.length >= 252,
      },
      marketGate: 'UNKNOWN',
    };
  }

  private summarizeMatch(result: StrategySignalOutput, strategy: { name: string; timeframe?: string | null; category?: string | null }, rating: StrategyPerformanceSummaryDto | null, context: StrategyContext): SignalStrategyMatchSummary {
    return {
      strategyCode: result.strategyCode,
      strategyName: strategy.name,
      strategyVersion: result.strategyVersion,
      decision: result.decision,
      direction: result.direction,
      score: result.score,
      confidence: result.confidence,
      reasons: result.reasons,
      entryRulesPassed: result.entryRulesPassed,
      timeframe: strategy.timeframe ?? null,
      triggerPriceEvidence: this.triggerPriceEvidenceFor(result, strategy, context),
      readinessLabel: rating?.readinessLabel ?? null,
      ratingGrade: rating?.ratingGrade ?? null,
    };
  }

  private triggerPriceEvidenceFor(result: StrategySignalOutput, strategy: { timeframe?: string | null; category?: string | null }, context: StrategyContext): SignalTriggerPriceEvidence {
    const timeframe = strategy.timeframe ?? null;
    const latestPricePoint = context.prices?.[0] ?? null;
    const signalSourceDate = context.rawSignal?.sourcePriceDate ?? context.rawSignal?.sourceDataDate ?? null;
    const triggerTimestamp = latestPricePoint?.date ?? null;
    const triggerPrice = latestPricePoint?.adjusted_close ?? null;
    const entryRuleIds = result.entryRulesPassed.filter(Boolean);
    const missingReasons: string[] = [];
    if (strategy.category !== 'ENTRY') missingReasons.push(`Strategy category is ${strategy.category || 'UNKNOWN'}, not ENTRY.`);
    if (result.direction !== 'BULLISH') missingReasons.push(`Strategy direction is ${result.direction}, not BULLISH.`);
    if (typeof triggerPrice !== 'number' || !Number.isFinite(triggerPrice)) missingReasons.push('Source price row adjusted close is unavailable.');
    if (!triggerTimestamp) missingReasons.push('Local source price row timestamp is unavailable.');
    if (triggerTimestamp && signalSourceDate && !this.sameUtcDay(triggerTimestamp, signalSourceDate)) {
      missingReasons.push('Latest source price row does not match the signal source price date.');
    }
    if (entryRuleIds.length === 0) missingReasons.push('No passed entry rule id is available.');
    if (!timeframe) missingReasons.push('Strategy timeframe is unavailable.');

    if (missingReasons.length > 0) {
      return {
        status: 'UNAVAILABLE',
        triggerPrice: null,
        triggerTimestamp: null,
        sourceModule: 'signal-generation-engine',
        sourceField: null,
        strategyCode: result.strategyCode,
        strategyVersion: result.strategyVersion,
        timeframe,
        entryRuleIds,
        compatibilityOnly: true,
        unavailableReason: missingReasons.join(' '),
      };
    }

    return {
      status: 'SOURCE_PROVEN',
      triggerPrice: triggerPrice!,
      triggerTimestamp,
      sourceModule: 'signal-generation-engine',
      sourceField: 'strategyContext.prices[0].adjusted_close',
      strategyCode: result.strategyCode,
      strategyVersion: result.strategyVersion,
      timeframe,
      entryRuleIds,
      compatibilityOnly: true,
    };
  }

  private sameUtcDay(left: string, right: string): boolean {
    const leftDate = new Date(left);
    const rightDate = new Date(right);
    if (!Number.isFinite(leftDate.getTime()) || !Number.isFinite(rightDate.getTime())) return false;
    return leftDate.toISOString().slice(0, 10) === rightDate.toISOString().slice(0, 10);
  }

  private summarizeBlocked(result: StrategySignalOutput, strategyName: string): SignalBlockedStrategySummary {
    const reason = result.blockers[0] || result.noiseFiltersTriggered[0] || result.dataGaps[0] || result.warnings[0] || 'Strategy conditions were not met.';
    return {
      strategyCode: result.strategyCode,
      strategyName,
      strategyVersion: result.strategyVersion,
      blockers: result.blockers,
      warnings: result.warnings,
      dataGaps: result.dataGaps,
      noiseFiltersTriggered: result.noiseFiltersTriggered,
      reason,
    };
  }

  private latestStrategyPerformance(
    strategyCode: string,
    region: string,
    assetType: string,
    cache: Map<string, Promise<StrategyPerformanceSummaryDto | null>>
  ) {
    const key = `${strategyCode}|${region}|${assetType}`;
    if (!cache.has(key)) {
      cache.set(key, this.getStrategyFrameworkPerformanceService().performance(strategyCode, { region, assetType }).then((summaries) => summaries[0] || null).catch(() => null));
    }
    return cache.get(key)!;
  }

  private getStrategyFrameworkPerformanceService() {
    if (this.strategyFrameworkService) return this.strategyFrameworkService;
    const { StrategyFrameworkService } = require('../strategy-framework/strategy-framework.service') as typeof import('../strategy-framework/strategy-framework.service');
    return new StrategyFrameworkService();
  }

  sma(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length < period) return null;
    return this.average(prices.slice(0, period).map((price) => price.adjusted_close));
  }

  rsi(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period) return null;
    
    // Wilder's RSI smoothing
    const chronological = [...prices].slice(0, period * 2 + 1).reverse();
    if (chronological.length < period + 1) return null;

    let avgGain = 0;
    let avgLoss = 0;

    // Initial average
    for (let i = 1; i <= period; i++) {
      const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
      if (change >= 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;

    // Smoothing
    for (let i = period + 1; i < chronological.length; i++) {
      const change = chronological[i].adjusted_close - chronological[i - 1].adjusted_close;
      const currentGain = change >= 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  adx(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period * 2) return null;
    const chronological = [...prices].slice(0, period * 2 + 1).reverse();
    
    let trueRanges: number[] = [];
    let plusDM: number[] = [];
    let minusDM: number[] = [];

    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];
      
      if (current.high === null || current.low === null || previous.high === null || previous.low === null) {
        trueRanges.push(0);
        plusDM.push(0);
        minusDM.push(0);
        continue;
      }

      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.adjusted_close),
        Math.abs(current.low - previous.adjusted_close)
      );
      trueRanges.push(tr);

      const upMove = current.high - previous.high;
      const downMove = previous.low - current.low;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }
    }

    if (trueRanges.length < period * 2) return null;

    let smoothedTR = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
    let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

    let dxArray: number[] = [];

    for (let i = period; i < trueRanges.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / period) + trueRanges[i];
      smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i];
      smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i];

      const plusDI = (smoothedPlusDM / smoothedTR) * 100;
      const minusDI = (smoothedMinusDM / smoothedTR) * 100;

      const dx = (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100;
      dxArray.push(dx || 0);
    }

    if (dxArray.length < period) return null;

    let adxVal = dxArray.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < dxArray.length; i++) {
      adxVal = (adxVal * (period - 1) + dxArray[i]) / period;
    }

    return adxVal;
  }

  atr(prices: SignalPricePoint[], period: number): number | null {
    if (prices.length <= period) return null;
    const chronological = [...prices].slice(0, period * 2 + 1).reverse();
    if (chronological.length < period + 1) return null;

    let trueRanges: number[] = [];
    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];
      if (current.high === null || current.low === null) {
        trueRanges.push(0);
        continue;
      }
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.adjusted_close),
        Math.abs(current.low - previous.adjusted_close)
      );
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return null;
    
    let atrVal = trueRanges.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
      atrVal = (atrVal * (period - 1) + trueRanges[i]) / period;
    }

    return atrVal;
  }

  closePosition(price: SignalPricePoint | undefined): number | null {
    if (!price || price.high === null || price.low === null || price.high === price.low) return null;
    return (price.adjusted_close - price.low) / (price.high - price.low);
  }

  periodHigh(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.max(...values) : null;
  }

  periodLow(prices: SignalPricePoint[], period: number): number | null {
    const values = prices.slice(0, period).map((price) => price.adjusted_close);
    return values.length > 0 ? Math.min(...values) : null;
  }

  compositeScore(technical: number, momentum: number, fundamentals: number): number {
    return Math.round((technical * TECHNICAL_WEIGHT + momentum * MOMENTUM_WEIGHT + fundamentals * FUNDAMENTAL_WEIGHT) * 100);
  }

  directionForScore(score: number): SignalDirection {
    if (score >= 70) return 'BULLISH';
    if (score >= 40) return 'NEUTRAL';
    return 'BEARISH';
  }

  explain(direction: SignalDirection, triggeredSignals: SignalItem[], negativeSignals: SignalItem[]): string {
    const primary = direction === 'BEARISH' ? negativeSignals : triggeredSignals;
    const fallback = direction === 'BEARISH' ? triggeredSignals : negativeSignals;
    const reasons = (primary.length > 0 ? primary : fallback).slice(0, 4).map((signal) => signal.label);
    if (reasons.length === 0) return `${direction} because there is not enough market data for a strong signal.`;
    return `${direction.charAt(0)}${direction.slice(1).toLowerCase()} because ${this.joinReasons(reasons)}.`;
  }

  private async resolveRunUniverse(request: SignalRunRequest, batchSize: number, offset: number): Promise<{ instrumentIds: string[]; totalCount: number }> {
    if (request.instrumentId) return { instrumentIds: [request.instrumentId], totalCount: 1 };
    if (request.instrumentIds?.length) {
      const instrumentIds = [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
      return { instrumentIds, totalCount: instrumentIds.length };
    }
    if (request.symbol) {
      const instruments = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 25, region: request.region, assetType: request.assetType });
      const match = instruments.instruments.find((instrument: any) => instrument.symbol === request.symbol);
      return { instrumentIds: match ? [match.id] : [], totalCount: match ? 1 : 0 };
    }
    const page = Math.floor(offset / batchSize) + 1;
    const instruments = await this.marketDataService.listInstruments({
      page,
      pageSize: batchSize,
      region: request.region,
      assetType: request.assetType,
      sector: request.sector,
      country: request.country,
    });
    return {
      instrumentIds: instruments.instruments.map((instrument: any) => instrument.id),
      totalCount: instruments.pagination?.total ?? instruments.instruments.length,
    };
  }

  private scopeFor(input: Pick<SignalQuery | SignalRunRequest, 'region' | 'assetType'>) {
    return {
      region: input.region || 'GLOBAL',
      assetType: input.assetType || 'STOCK',
    };
  }

  private normalizeUtcDay(value: Date): Date {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  private async generateBatchWithConcurrency(
    instrumentIds: string[],
    request: SignalRunRequest & {
      generationRunId?: string;
      dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility>;
    },
    maxConcurrency: number,
    providerThrottleMs: number,
    batchContext?: SignalGenerationBatchContext
  ): Promise<Array<{ instrumentId: string; result: SignalResultDto | null; error?: string }>> {
    const results: Array<{ instrumentId: string; result: SignalResultDto | null; error?: string }> = new Array(instrumentIds.length);
    let nextIndex = 0;
    let nextStartAt = Date.now();

    const acquireStartSlot = async () => {
      if (providerThrottleMs <= 0) return;
      const now = Date.now();
      const waitMs = Math.max(0, nextStartAt - now);
      nextStartAt = Math.max(now, nextStartAt) + providerThrottleMs;
      if (waitMs > 0) await this.sleep(waitMs);
    };

    const worker = async () => {
      while (nextIndex < instrumentIds.length) {
        const index = nextIndex;
        nextIndex += 1;
        const instrumentId = instrumentIds[index];
        try {
          await acquireStartSlot();
          results[index] = { instrumentId, result: await this.generateForInstrument(instrumentId, { ...request, batchContext }) };
        } catch (error: any) {
          results[index] = { instrumentId, result: null, error: error?.message || 'signal generation failed' };
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(maxConcurrency, instrumentIds.length) }, worker));
    return results.filter(Boolean);
  }

  private async loadSignalGenerationBatchContext(
    instrumentIds: string[],
    request: Pick<SignalRunRequest, 'region' | 'assetType' | 'researchContextMode'>
  ): Promise<SignalGenerationBatchContext | undefined> {
    if (instrumentIds.length <= 1) return undefined;
    const serviceAny = this.marketDataService as any;
    const marketScope = { region: request.region, assetType: request.assetType };
    const [instruments, priceWindows, fundamentals] = await Promise.all([
      typeof serviceAny.getInstrumentsByIds === 'function'
        ? serviceAny.getInstrumentsByIds(instrumentIds).catch(() => [])
        : Promise.resolve([]),
      typeof serviceAny.listRecentPriceWindowsByInstrumentIds === 'function'
        ? serviceAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, SIGNAL_GENERATION_PRICE_WINDOW, marketScope).catch(() => new Map())
        : Promise.resolve(new Map()),
      request.researchContextMode === 'LIGHTWEIGHT' && typeof serviceAny.storedFundamentalsByInstrumentIds === 'function'
        ? serviceAny.storedFundamentalsByInstrumentIds(instrumentIds, marketScope).catch(() => new Map())
        : Promise.resolve(new Map()),
    ]);
    return {
      instrumentsById: new Map((instruments as any[]).map((instrument) => [instrument.id, instrument])),
      priceWindowsByInstrumentId: priceWindows instanceof Map ? priceWindows : new Map(),
      fundamentalsByInstrumentId: fundamentals instanceof Map ? fundamentals : new Map(),
      strategyPerformanceCache: new Map(),
    };
  }

  private getFundamentalsForGeneration(instrumentId: string, marketScope: Pick<SignalRunRequest, 'region' | 'assetType'>, useFullResearchContext: boolean) {
    if (useFullResearchContext || typeof (this.marketDataService as any).storedFundamentalsByInstrumentId !== 'function') {
      return this.marketDataService.fundamentalsByInstrumentId(instrumentId, marketScope);
    }
    return (this.marketDataService as any).storedFundamentalsByInstrumentId(instrumentId, marketScope);
  }

  private async persistSignalResult(result: SignalResultDto) {
    if (typeof (this.repository as any).createSignalResultWithStatus === 'function') {
      return (this.repository as any).createSignalResultWithStatus(result);
    }
    return {
      result: await this.repository.createSignalResult(result),
      status: 'CREATED' as const,
    };
  }

  private getDataQualityEligibilityMap(
    instrumentIds: string[],
    filtered: Awaited<ReturnType<DataQualityEngineService['filterEligibleInstruments']>>
  ): Record<string, SignalDataQualityEligibility> {
    const evaluations = filtered.evaluationsByInstrumentId || {};
    const excluded = new Set(filtered.excludedInstrumentIds);
    const eligible = new Set(filtered.eligibleInstrumentIds);
    return Object.fromEntries(instrumentIds.map((instrumentId) => {
      const evaluation = evaluations[instrumentId];
      return [instrumentId, this.toEligibilitySnapshot(true, eligible.has(instrumentId), excluded.has(instrumentId), evaluation)];
    }));
  }

  private dataQualityEligibilityFor(instrumentId: string, options: { useDataQualityFilter?: boolean; dataQualityEvaluationsByInstrumentId?: Record<string, SignalDataQualityEligibility> }): SignalDataQualityEligibility {
    if (!options.useDataQualityFilter) return { filterApplied: false, eligible: null };
    return options.dataQualityEvaluationsByInstrumentId?.[instrumentId] || {
      filterApplied: true,
      eligible: null,
      excludedReason: 'Data quality evaluation snapshot unavailable.',
    };
  }

  private toEligibilitySnapshot(filterApplied: boolean, eligible: boolean, excluded: boolean, evaluation: any): SignalDataQualityEligibility {
    if (!evaluation) {
      return {
        filterApplied,
        eligible: excluded ? false : (eligible ? true : null),
        excludedReason: excluded ? 'Missing data quality evaluation.' : 'Missing data quality evaluation; configured behavior allowed processing.',
      };
    }
    return {
      filterApplied,
      eligible,
      coverageStatus: evaluation.coverageStatus,
      signalReadinessStatus: evaluation.signalReadinessStatus,
      liquidityStatus: evaluation.liquidityStatus,
      excludedReason: excluded ? this.dataQualityExcludedReason(evaluation) : undefined,
    };
  }

  private dataQualityExcludedReason(evaluation: any): string {
    if (!evaluation.eligibleForSignals) return 'Not eligible for signals.';
    if (evaluation.signalReadinessStatus && evaluation.signalReadinessStatus !== 'READY') return `Signal readiness is ${evaluation.signalReadinessStatus}.`;
    if (evaluation.coverageStatus === 'UNUSABLE') return 'Coverage is unusable.';
    if (evaluation.liquidityStatus === 'ILLIQUID') return 'Liquidity is illiquid.';
    return 'Data quality filter excluded this instrument.';
  }

  private scoringInputSummary(prices: SignalPricePoint[], latestFundamental: any, strategyContextLoaded: boolean): SignalScoringInputSummary {
    return {
      priceBarsUsed: prices.length,
      latestCloseDate: prices[0]?.date ?? null,
      hasSma50: this.sma(prices, 50) !== null,
      hasSma200: this.sma(prices, 200) !== null,
      hasVolume: prices.some((price) => typeof price.volume === 'number'),
      fundamentalsAvailable: Boolean(latestFundamental),
      strategyContextLoaded,
    };
  }

  private latestDate(values: Array<string | null | undefined>): Date | null {
    const timestamps = values
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((value) => Number.isFinite(value.getTime()));
    if (timestamps.length === 0) return null;
    return timestamps.reduce((latest, value) => value > latest ? value : latest, timestamps[0]);
  }

  private canonicalRegion(value?: string | null) {
    return normalizeMarketRegion(value) || 'IN';
  }

  private filtersApplied(query: SignalQuery): Record<string, unknown> {
    return Object.fromEntries(Object.entries({
      direction: query.direction,
      confidence: query.confidence,
      minScore: query.minScore,
      sector: query.sector,
      country: query.country,
      region: query.region,
      assetType: query.assetType,
      modelVersion: query.modelVersion,
      signalType: query.signalType,
      search: query.search,
      strategyCode: query.strategyCode,
      onlyStrategyEligible: query.onlyStrategyEligible,
      excludeNoiseFiltered: query.excludeNoiseFiltered,
      hasStrategyMatch: query.hasStrategyMatch,
      hasBlockedStrategies: query.hasBlockedStrategies,
    }).filter(([, value]) => value !== undefined && value !== ''));
  }

  private async directionCountsFor(query: SignalQuery): Promise<Record<SignalDirection, number>> {
    if (typeof (this.repository as any).directionCounts !== 'function') {
      return { BULLISH: 0, NEUTRAL: 0, BEARISH: 0 };
    }
    return (this.repository as any).directionCounts(query);
  }

  private trustedReadSignals(signals: SignalResultDto[]): SignalResultDto[] {
    return signals.filter((signal) => this.isTrustedReadSignal(signal));
  }

  private trustedReadTotal(total: number, loadedCount: number, trustedCount: number) {
    return trustedCount === loadedCount ? total : trustedCount;
  }

  private isTrustedReadSignal(signal: SignalResultDto): boolean {
    const dataQuality = signal.dataQualityEligibility;
    return signal.auditStatus === 'CURRENT'
      && dataQuality?.filterApplied === true
      && dataQuality.eligible === true
      && dataQuality.signalReadinessStatus === 'READY';
  }

  private clampInt(value: unknown, fallback: number, min: number, max: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(numeric)));
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private categoryScore(positive: number, negative: number): number {
    const total = positive + negative;
    if (total === 0) return 0.5;
    // Laplace smoothing with 0.5 to avoid extreme scores with very low total signal counts
    return (positive + 0.5) / (total + 1.0);
  }

  private confidenceFor(prices: SignalPricePoint[], fundamental: any, signalCount: number): SignalConfidence {
    // Check if the data is stale (more than 3 business days old)
    const latestDate = prices[0]?.date ? new Date(prices[0].date) : null;
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 5); // 5 cal days for safety margin on weekends
    const isStale = latestDate ? latestDate < threeDaysAgo : true;

    if (prices.length >= 200 && fundamental && signalCount >= 6 && !isStale) return 'HIGH';
    if (prices.length >= 50 && signalCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private pushReturnSignal(value: number | null, code: string, positiveLabel: string, negativeLabel: string, signals: SignalItem[], negativeSignals: SignalItem[]) {
    if (value === null) return;
    (value >= 0.0001 ? signals : negativeSignals).push(this.signal(value >= 0.0001 ? code : `${code}_NEGATIVE`, value >= 0.0001 ? positiveLabel : negativeLabel, 'MOMENTUM'));
  }

  private returnAtOffset(prices: SignalPricePoint[], offset: number): number | null {
    if (prices.length <= offset) return null;
    const oldValue = prices[offset].adjusted_close;
    if (oldValue <= 0) return null;
    return (prices[0].adjusted_close - oldValue) / oldValue;
  }

  private toPricePoints(prices: any[]): SignalPricePoint[] {
    return prices
      .map((price) => ({
        date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
        open: this.optionalNumber(price.open),
        high: this.optionalNumber(price.high),
        low: this.optionalNumber(price.low),
        close: Number(price.close),
        adjusted_close: Number(price.adjusted_close ?? price.close),
        volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
      }))
      .filter((price) => Number.isFinite(price.adjusted_close))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private optionalNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private signal(code: string, label: string, category: SignalItem['category']): SignalItem {
    return { code, label, category };
  }

  private joinReasons(reasons: string[]): string {
    if (reasons.length === 1) return reasons[0];
    return `${reasons.slice(0, -1).join(', ')}, and ${reasons[reasons.length - 1]}`;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private stddev(values: number[]): number | null {
    if (values.length < 2) return null;
    const avg = this.average(values) ?? 0;
    return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1));
  }

  obv(prices: SignalPricePoint[]): number[] {
    if (prices.length === 0) return [];
    const chronological = [...prices].reverse();
    let currentOBV = 0;
    const obvArray: number[] = [currentOBV];

    for (let i = 1; i < chronological.length; i++) {
      const current = chronological[i];
      const previous = chronological[i - 1];
      if (current.volume === null) {
        obvArray.push(currentOBV);
        continue;
      }
      
      if (current.adjusted_close > previous.adjusted_close) {
        currentOBV += current.volume;
      } else if (current.adjusted_close < previous.adjusted_close) {
        currentOBV -= current.volume;
      }
      obvArray.push(currentOBV);
    }
    
    return obvArray.reverse();
  }

  isObvTrendingUp(prices: SignalPricePoint[], period: number = 10): boolean {
    const obvArray = this.obv(prices);
    if (obvArray.length < period) return false;
    return obvArray[0] > obvArray[period - 1];
  }

  isObvTrendingDown(prices: SignalPricePoint[], period: number = 10): boolean {
    const obvArray = this.obv(prices);
    if (obvArray.length < period) return false;
    return obvArray[0] < obvArray[period - 1];
  }
}

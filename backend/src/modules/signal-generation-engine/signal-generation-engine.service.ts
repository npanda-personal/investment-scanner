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
} from './signal-generation-engine.types';

const TECHNICAL_WEIGHT = 0.4;
const MOMENTUM_WEIGHT = 0.35;
const FUNDAMENTAL_WEIGHT = 0.25;

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
    return {
      signals: enriched,
      items: enriched,
      total,
      totalCount: total,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + signals.length < total,
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
    return {
      signals: enriched,
      items: enriched,
      total,
      totalCount: total,
      limit: query.limit,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + signals.length < total,
      filtersApplied: this.filtersApplied(query),
      scope: this.scopeFor(query),
      directionCounts,
    };
  }

  async latestForInstrument(instrumentId: string): Promise<SignalResultDto | null> {
    const latest = await this.repository.latestForInstrument(instrumentId);
    if (latest) return this.enrichSignal(latest);
    const generated = await this.generateForInstrument(instrumentId);
    return generated ? this.enrichSignal(generated) : null;
  }

  async run(request: SignalRunRequest): Promise<SignalRunResponse> {
    const startedAt = Date.now();
    const generatedAt = new Date().toISOString();
    const errors: string[] = [];
    const warnings: string[] = [];
    const results: SignalResultDto[] = [];
    const batchSize = request.instrumentId || request.symbol ? 1 : this.clampInt(request.batchSize ?? request.limit, 25, 1, 100);
    const offset = request.instrumentId || request.symbol ? 0 : this.clampInt(request.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const resolved = await this.resolveRunUniverse(request, batchSize, offset);
    const resolvedInstrumentIds = resolved.instrumentIds;
    let instrumentIds = resolvedInstrumentIds;
    let dataQuality: SignalRunResponse['dataQuality'] = {
      filterApplied: Boolean(request.useDataQualityFilter),
      beforeFilter: resolvedInstrumentIds.length,
      afterFilter: resolvedInstrumentIds.length,
      excludedByDataQuality: 0,
      missingQualityEvaluationCount: 0,
      eligibleInstrumentCount: resolvedInstrumentIds.length,
      attemptedGenerationCount: resolvedInstrumentIds.length,
    };

    if (request.useDataQualityFilter) {
      const filtered = await this.dataQualityService.filterEligibleInstruments(resolvedInstrumentIds, {
        minSignalReadinessScore: request.minSignalReadinessScore ?? 70,
        allowedReadinessStatuses: request.allowedReadinessStatuses,
        includeLimited: request.includeLimited,
        skipUnusable: request.skipUnusable ?? true,
        missingQualityBehavior: request.missingQualityBehavior ?? 'WARN_AND_PROCESS',
      }).catch((error: any) => {
        warnings.push(`Data quality filter unavailable: ${error?.message || 'unknown error'}`);
        return null;
      });
      if (filtered) {
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

    for (const instrumentId of instrumentIds) {
      try {
        const result = await this.generateForInstrument(instrumentId, request);
        if (result) results.push(result);
      } catch (error: any) {
        errors.push(`${instrumentId}: ${error.message || 'signal generation failed'}`);
      }
    }
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

    return {
      generated: generatedCount,
      skipped: skippedCount,
      errors,
      warnings,
      dataQuality,
      results,
      generated_at: generatedAt,
      processedCount,
      totalCount: resolved.totalCount,
      batchSize,
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
      scope: this.scopeFor(request),
      latestGeneratedAt: results[results.length - 1]?.generated_at ?? null,
      durationMs: Date.now() - startedAt,
      eligibleInstrumentCount: instrumentIds.length,
      attemptedGenerationCount,
    };
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

  async generateForInstrument(instrumentId: string, options: Pick<SignalRunRequest, 'strategyCode' | 'includeStrategyMatches' | 'onlyStrategyEligible' | 'excludeNoiseFiltered'> = {}): Promise<SignalResultDto | null> {
    const [instrument, pricesResponse, fundamentalsResponse, research] = await Promise.all([
      this.marketDataService.getInstrument(instrumentId),
      this.marketDataService.listPricesByInstrumentId(instrumentId, 5000),
      this.marketDataService.fundamentalsByInstrumentId(instrumentId),
      this.researchService.workbench(instrumentId, '3M'),
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
      modelVersion: 'signal-engine-v1',
      source: 'signal-generation-engine',
      data_status: prices.length >= 50 ? (prices.length >= 200 ? 'COMPLETE' : 'PARTIAL') : 'MISSING',
      warnings,
    };

    if (options.includeStrategyMatches || options.strategyCode || options.onlyStrategyEligible || options.excludeNoiseFiltered) {
      result = await this.attachStrategyMatches(result, prices, instrument, options);
      if (!this.signalPassesStrategyFilters(result, options)) return null;
    }

    const saved = await this.persistSignalResult(result);
    return {
      ...saved.result,
      writeStatus: saved.status,
      strategyMatches: result.strategyMatches,
      blockedStrategies: result.blockedStrategies,
    };
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
        
        const result = {
          ...signal,
          currentPrice,
          previousClose,
          dailyChange,
          dailyChangePercent: dailyChange !== null && previousClose !== null && previousClose > 0 ? dailyChange / previousClose : null,
          currency: instrument?.currency ?? signal.currency ?? null,
          priceTimestamp: (latest as any)?.date ? new Date((latest as any).date).toISOString() : null,
        };
        if (!includeStrategyContext) return result;
        const history = await this.marketDataService.listPricesByInstrumentId(signal.instrument_id, 500).catch(() => null);
        const prices = this.toPricePoints(history?.prices || []);
        return this.attachStrategyMatches(result, prices, instrument, options, ratingCache);
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
      })).filter((signal) => this.signalPassesStrategyFilters(signal, options));
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
        if (result.eligibleForSignalGeneration && result.blockers.length === 0) strategyMatches.push(this.summarizeMatch(result, strategy.name, rating));
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

  private summarizeMatch(result: StrategySignalOutput, strategyName: string, rating: StrategyPerformanceSummaryDto | null): SignalStrategyMatchSummary {
    return {
      strategyCode: result.strategyCode,
      strategyName,
      strategyVersion: result.strategyVersion,
      decision: result.decision,
      direction: result.direction,
      score: result.score,
      confidence: result.confidence,
      reasons: result.reasons,
      entryRulesPassed: result.entryRulesPassed,
      readinessLabel: rating?.readinessLabel ?? null,
      ratingGrade: rating?.ratingGrade ?? null,
    };
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

  private async persistSignalResult(result: SignalResultDto) {
    if (typeof (this.repository as any).createSignalResultWithStatus === 'function') {
      return (this.repository as any).createSignalResultWithStatus(result);
    }
    return {
      result: await this.repository.createSignalResult(result),
      status: 'CREATED' as const,
    };
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

  private clampInt(value: unknown, fallback: number, min: number, max: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(numeric)));
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

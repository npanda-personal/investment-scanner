import { MarketDataFoundationService } from '../market-data-foundation';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { DataQualityEngineService } from '../data-quality-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { PortfolioManagementService } from '../portfolio-management';
import { WatchlistManagementService } from '../watchlist-management';
import { StrategyFrameworkEvaluator, StrategyFrameworkRegistry, StrategyFrameworkService } from '../strategy-framework';
import type { StrategyContext, StrategySignalOutput } from '../strategy-framework';
import type { SignalResultDto } from '../signal-generation-engine';
import { StrategyDecisionEngineRepository } from './strategy-decision-engine.repository';
import type {
  AllowedAction,
  DecisionAction,
  DecisionConfidence,
  EntryZoneType,
  MarketCondition,
  MarketGate,
  MarketGateResponse,
  StrategyDecision,
  StrategyDecisionDto,
  StrategyEvaluateRequest,
  StrategyEvaluateResponse,
  StrategyName,
  StrategyQuery,
  RiskReviewLevel,
} from './strategy-decision-engine.types';

const MODEL_VERSION = 'strategy-decision-v1';
const DEFAULT_EVALUATION_WORKER_CONCURRENCY = 5;
const MAX_EVALUATION_WORKER_CONCURRENCY = 8;
const REVIEW_STRATEGY_CATEGORIES = new Set(['ENTRY', 'EXIT']);

type StrategyEvaluationBatchContext = {
  pricesByInstrumentId: Map<string, any[]>;
  calibrationByInstrumentId: Map<string, any>;
  dataQualityByInstrumentId: Map<string, any>;
  smartMoneyByInstrumentId: Map<string, any>;
};

export class StrategyDecisionEngineService {
  constructor(
    private readonly repository = new StrategyDecisionEngineRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly contextService = new MarketContextIntelligenceService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly calibrationService = new SignalCalibrationEngineService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService(),
    private readonly portfolioService = new PortfolioManagementService(),
    private readonly watchlistService = new WatchlistManagementService(),
    private readonly strategyRegistry = new StrategyFrameworkRegistry(),
    private readonly strategyFrameworkService = new StrategyFrameworkService()
  ) {}

  async marketGate(region?: string): Promise<MarketGateResponse> {
    const persistedOnly = typeof (this.contextService as any).latestPersistedSummary === 'function';
    const summary = persistedOnly
      ? await this.latestPersistedMarketSummary(region)
      : await this.contextService.summary({ region }).catch(() => null);
    const [regime, breadth] = summary?.regime && summary?.breadth
      ? [summary.regime, summary.breadth]
      : persistedOnly
        ? [null, null]
        : await Promise.all([
            this.contextService.regime(region).catch(() => null),
            this.contextService.breadth(region).catch(() => null),
          ]);

    const reasons: string[] = [];
    const blockers: string[] = [];
    let marketCondition: MarketCondition = 'UNKNOWN';
    let marketGate: MarketGate = 'UNKNOWN';
    let allowedActions: AllowedAction[] = ['MANAGE_EXISTING_POSITIONS_ONLY'];

    if (!summary || summary.dataStatus === 'MISSING') {
      reasons.push('Market context data is missing.');
      return {
        marketCondition,
        marketGate,
        allowedActions,
        marketScore: 0,
        reasons,
        blockers,
        dataStatus: 'MISSING',
        updatedAt: new Date().toISOString(),
      };
    }

    return this.marketGateFromSummary(summary, regime, breadth);
  }

  private marketGateFromSummary(summary: any, regime: any, breadth: any): MarketGateResponse {
    const reasons: string[] = [];
    const blockers: string[] = [];
    let marketCondition: MarketCondition = 'UNKNOWN';
    let marketGate: MarketGate = 'UNKNOWN';
    let allowedActions: AllowedAction[] = ['MANAGE_EXISTING_POSITIONS_ONLY'];
    const score = regime?.score ?? 0;
    const isRiskOn = regime?.regime === 'RISK_ON';
    const isRiskOff = regime?.regime === 'RISK_OFF';
    const breadthAbove50 = breadth?.percentAboveSma50 ?? 0;

    if (isRiskOn && breadthAbove50 >= 0.6) {
      marketCondition = 'HEALTHY';
      marketGate = 'OPEN';
      allowedActions = ['NEW_LONG_TRADES_ALLOWED', 'ONLY_HIGH_QUALITY_SETUPS'];
      reasons.push('Market regime is Risk-On and breadth is healthy.');
    } else if (isRiskOff || breadthAbove50 <= 0.3) {
      marketCondition = 'BAD';
      marketGate = 'CLOSED';
      allowedActions = ['MANAGE_EXISTING_POSITIONS_ONLY'];
      blockers.push('Market regime is Risk-Off or breadth is weak.');
      if (isRiskOff) reasons.push('High bearish risk detected.');
    } else {
      marketCondition = 'MIXED';
      marketGate = 'SELECTIVE';
      allowedActions = ['ONLY_HIGH_QUALITY_SETUPS', 'MANAGE_EXISTING_POSITIONS_ONLY'];
      reasons.push('Market conditions are mixed; selectivity is required.');
    }

    return {
      marketCondition,
      marketGate,
      allowedActions,
      marketScore: score,
      reasons,
      blockers,
      dataStatus: summary?.dataStatus || 'MISSING',
      updatedAt: new Date().toISOString(),
    };
  }

  private canBuildMarketGateFromSummary(summary: any): boolean {
    return Boolean(summary && summary.dataStatus !== 'MISSING' && summary.regime && summary.breadth);
  }

  private evaluationWorkerConcurrency(request: StrategyEvaluateRequest): number {
    const configured = request.workerConcurrency ?? Number(process.env.STRATEGY_DECISION_ENGINE_WORKERS_COUNT);
    if (!Number.isFinite(configured)) return DEFAULT_EVALUATION_WORKER_CONCURRENCY;
    return Math.min(MAX_EVALUATION_WORKER_CONCURRENCY, Math.max(1, Math.floor(configured)));
  }

  async evaluate(request: StrategyEvaluateRequest): Promise<StrategyEvaluateResponse> {
    const started = Date.now();
    const batchSize = request.batchSize || 25;
    const offset = request.offset || 0;
    const workerConcurrency = this.evaluationWorkerConcurrency(request);
    const universe = await this.resolveEvaluationUniverse(request, batchSize, offset);
    const instrumentIds = universe.instrumentIds;
    
    const results: StrategyDecisionDto[] = [];
    const marketSummary = await this.latestPersistedMarketSummary(request.region);
    const gate = this.canBuildMarketGateFromSummary(marketSummary)
      ? this.marketGateFromSummary(marketSummary, marketSummary.regime, marketSummary.breadth)
      : await this.marketGate(request.region);
    const instruments = await this.getEvaluationInstruments(instrumentIds);
    const instrumentsById = new Map(instruments.map((instrument: any) => [instrument.id, instrument]));
    const strategies = this.strategiesForRequest(request);
    const portfolio = request.portfolioId
      ? await this.portfolioService.getPortfolioDetail(request.portfolioId).catch(() => null)
      : null;
    const batchContext = await this.loadEvaluationBatchContext(instrumentIds, request);
    const strategyRatings = new Map<string, Promise<StrategyDecisionDto['strategyRating']>>();
    const decisionsToPersist: StrategyDecisionDto[] = [];
    let failedCount = 0;

    for (let i = 0; i < instrumentIds.length; i += workerConcurrency) {
      const chunk = instrumentIds.slice(i, i + workerConcurrency);
      const chunkResults = await Promise.all(chunk.map(async (instrumentId) => {
        try {
          const rawSignal = universe.rawSignalsByInstrumentId.get(instrumentId);
          const decisions = await this.evaluateInstrumentStrategies(instrumentId, strategies, gate, {
            portfolioId: request.portfolioId,
            region: request.region,
            marketSummary,
            rawSignal,
            instrument: instrumentsById.get(instrumentId),
            portfolio,
            prices: batchContext.pricesByInstrumentId.get(instrumentId),
            calibrated: batchContext.calibrationByInstrumentId.get(instrumentId) ?? null,
            quality: batchContext.dataQualityByInstrumentId.get(instrumentId) ?? null,
            smartMoney: batchContext.smartMoneyByInstrumentId.get(instrumentId) ?? null,
            strategyRatings,
          });
          return decisions.filter((decision): decision is StrategyDecisionDto => Boolean(decision));
        } catch (error: any) {
          console.error(`Evaluation failed for ${instrumentId}:`, error);
          failedCount += 1;
          return [];
        }
      }));

      const chunkResultsFlattened = chunkResults.flat();
      decisionsToPersist.push(...chunkResultsFlattened);
    }

    if (decisionsToPersist.length > 0) {
      try {
        results.push(...await this.persistDecisionBatch(decisionsToPersist));
      } catch (error: any) {
        console.error('Strategy decision persistence failed:', error);
        failedCount += decisionsToPersist.length;
      }
    }

    const totalCount = universe.totalCount;
    const nextOffset = offset + batchSize < totalCount ? offset + batchSize : null;

    return {
      processedCount: instrumentIds.length,
      totalCount,
      batchSize,
      offset,
      nextOffset,
      hasMore: nextOffset !== null,
      generatedCount: results.length,
      skippedCount: 0,
      failedCount,
      warnings: [],
      durationMs: Date.now() - started,
      results,
    };
  }

  async candidates(query: StrategyQuery) {
    return this.repository.candidates(query);
  }

  async funnelDiagnostics(query: { region?: string; assetType?: string; strategyCode?: string; generatedDate?: string; from?: string; to?: string; frameworkBacked?: boolean; includeLegacy?: boolean; includeHistory?: boolean }) {
    return this.repository.funnelDiagnostics(query);
  }

  async exits(portfolioId?: string, region?: string, assetType?: string) {
    return this.repository.exits(portfolioId, region, assetType);
  }

  async watchlist(watchlistId: string) {
    const detail = await this.watchlistService.detail(watchlistId);
    if (!detail) return [];
    const instrumentIds = detail.items.map(i => i.instrumentId);
    const results = await Promise.all(instrumentIds.map(id => this.latestForInstrument(id)));
    return results.filter(r => r !== null);
  }

  async portfolio(portfolioId: string) {
    const detail = await this.portfolioService.getPortfolioDetail(portfolioId);
    if (!detail) return [];
    const instrumentIds = detail.holdings.map(h => h.instrumentId);
    const results = await Promise.all(instrumentIds.map(id => this.latestForInstrument(id, 'DEFENSIVE_EXIT')));
    return results.filter(r => r !== null);
  }

  async model() {
    const strategies = this.strategyRegistry.list();
    return {
      modelVersion: MODEL_VERSION,
      strategies: strategies.map((strategy) => ({
        code: strategy.code,
        name: strategy.name,
        description: strategy.description,
        category: strategy.category,
        style: strategy.style,
        status: strategy.status,
        version: strategy.version,
        evaluationSupported: this.isReviewStrategy(strategy),
        thresholds: {
          tradeCandidate: Number(strategy.parameters.minScore ?? 70),
          watch: 50,
          wait: 40,
        },
        weights: Object.fromEntries([
          ...strategy.entryRules,
          ...strategy.exitRules,
          ...strategy.noiseFilters,
        ].filter((rule) => typeof rule.weight === 'number').map((rule) => [rule.code, rule.weight as number])),
      })),
      marketGateRules: {
        HEALTHY: 'Risk-On regime and breadth > 60%',
        MIXED: 'Breadth 30-60%',
        BAD: 'Risk-Off regime or breadth < 30%'
      },
      languageSafetyRules: [
        'Use "candidate", "consider review", "risk level".',
        'Avoid financial advice terms like "buy" or "sell".'
      ]
    };
  }

  async history(instrumentId: string) {
    return this.repository.history(instrumentId);
  }

  async evaluateInstrumentStrategy(
    instrumentId: string,
    strategyName: StrategyName,
    gate: MarketGateResponse,
    portfolioId?: string
  ): Promise<StrategyDecisionDto | null> {
    const context = await this.buildDecisionContext(instrumentId, gate, { portfolioId });
    if (!context?.instrument) return null;

    const frameworkDecision = await this.evaluateWithStrategyFramework(strategyName, context).catch(() => null);
    if (frameworkDecision) return frameworkDecision;

    if (strategyName === 'TREND_MOMENTUM') return this.evaluateTrendMomentum(context);
    if (strategyName === 'PULLBACK_IN_UPTREND') return this.evaluatePullback(context);
    if (strategyName === 'DEFENSIVE_EXIT') return this.evaluateDefensiveExit(context);
    
    return null;
  }

  async latestForInstrument(instrumentId: string, strategy?: string, region?: string): Promise<StrategyDecisionDto | null> {
    const latest = await this.repository.latestForInstrument(instrumentId, strategy);
    if (latest) return latest;
    
    // If not found, run evaluate for this single instrument
    const gate = await this.marketGate(region);
    const result = await this.evaluateInstrumentStrategy(instrumentId, (strategy as any) || 'TREND_MOMENTUM', gate);
    if (result) {
      return this.repository.create(result);
    }
    return null;
  }

  private async evaluateInstrumentStrategies(
    instrumentId: string,
    strategies: StrategyName[],
    gate: MarketGateResponse,
    options: {
      portfolioId?: string;
      region?: string;
      marketSummary?: any;
      rawSignal?: SignalResultDto;
      instrument?: any;
      portfolio?: any;
      prices?: any[];
      calibrated?: any | null;
      quality?: any | null;
      smartMoney?: any | null;
      strategyRatings?: Map<string, Promise<StrategyDecisionDto['strategyRating']>>;
    } = {}
  ): Promise<StrategyDecisionDto[]> {
    const context = await this.buildDecisionContext(instrumentId, gate, options);
    if (!context?.instrument) return [];
    const decisions: StrategyDecisionDto[] = [];
    for (const strategy of strategies) {
      const decision = await this.evaluateStrategyWithContext(strategy, context, options.strategyRatings);
      if (decision) decisions.push(decision);
    }
    return decisions;
  }

  private async evaluateStrategyWithContext(
    strategyName: StrategyName,
    context: any,
    strategyRatings?: Map<string, Promise<StrategyDecisionDto['strategyRating']>>
  ): Promise<StrategyDecisionDto | null> {
    const frameworkDecision = await this.evaluateWithStrategyFramework(strategyName, context, strategyRatings).catch(() => null);
    if (frameworkDecision) return frameworkDecision;

    if (strategyName === 'TREND_MOMENTUM') return this.evaluateTrendMomentum(context);
    if (strategyName === 'PULLBACK_IN_UPTREND') return this.evaluatePullback(context);
    if (strategyName === 'DEFENSIVE_EXIT') return this.evaluateDefensiveExit(context);
    
    return null;
  }

  private async buildDecisionContext(
    instrumentId: string,
    gate: MarketGateResponse,
    options: {
      portfolioId?: string;
      region?: string;
      marketSummary?: any;
      rawSignal?: SignalResultDto;
      instrument?: any;
      portfolio?: any;
      prices?: any[];
      calibrated?: any | null;
      quality?: any | null;
      smartMoney?: any | null;
    } = {}
  ): Promise<any | null> {
    const [instrument, pricesRes, rawSignal, calibrated, quality, smartMoney, marketSummary, portfolio] = await Promise.all([
      options.instrument ? Promise.resolve(options.instrument) : this.marketDataService.getInstrument(instrumentId, { region: options.region }).catch(() => null),
      options.prices !== undefined ? Promise.resolve({ prices: options.prices }) : this.marketDataService.listPricesByInstrumentId(instrumentId, 500, undefined, undefined, { region: options.region }).catch(() => ({ prices: [] })),
      options.rawSignal ? Promise.resolve(options.rawSignal) : this.signalService.latestForInstrument(instrumentId).catch(() => null),
      options.calibrated !== undefined ? Promise.resolve(options.calibrated) : this.latestPersistedCalibration(instrumentId),
      options.quality !== undefined ? Promise.resolve(options.quality) : this.latestPersistedDataQuality(instrumentId),
      options.smartMoney !== undefined ? Promise.resolve(options.smartMoney) : this.latestPersistedSmartMoney(instrumentId),
      options.marketSummary !== undefined ? Promise.resolve(options.marketSummary) : this.contextService.summary({ region: options.region }).catch(() => null),
      options.portfolio ? Promise.resolve(options.portfolio) : options.portfolioId ? this.portfolioService.getPortfolioDetail(options.portfolioId).catch(() => null) : Promise.resolve(null),
    ]);

    if (!instrument) return null;

    const pricePoints = this.toPricePoints(pricesRes?.prices || []);
    const closes = pricePoints.map((price) => price.adjusted_close);
    const latestPrice = closes[0] ?? null;
    const sma50 = this.calculateSma(closes, 50);
    const sma200 = this.calculateSma(closes, 200);
    const rsi = this.calculateRsi(closes, 14);
    const sectorContexts = [
      ...(Array.isArray((marketSummary as any)?.topSectors) ? (marketSummary as any).topSectors : []),
      ...(Array.isArray((marketSummary as any)?.weakSectors) ? (marketSummary as any).weakSectors : []),
    ];
    const sectorContext = sectorContexts.find((item: any) => item.sector === instrument.sector) || null;
    const holding = portfolio?.holdings?.find((item: any) => item.instrumentId === instrumentId) || null;
    const dataGaps: string[] = [];

    if (pricePoints.length === 0) dataGaps.push('Price history is missing.');
    if (!rawSignal) dataGaps.push('Raw signal is missing.');
    if (!quality) dataGaps.push('Data quality evaluation is missing.');
    if (!smartMoney) dataGaps.push('Smart-money context is missing.');
    if (!marketSummary || gate.marketGate === 'UNKNOWN') dataGaps.push('Market context is missing or unknown.');
    if (!sectorContext && instrument.sector) dataGaps.push('Sector context is missing.');

    return {
      instrument,
      prices: closes,
      pricePoints,
      latestPrice,
      sma50,
      sma200,
      rsi,
      rawSignal,
      calibrated,
      quality,
      smartMoney,
      gate,
      portfolioId: options.portfolioId,
      holding,
      sectors: sectorContexts,
      sectorContext,
      dataGaps,
      marketSummary,
    };
  }

  private async evaluateWithStrategyFramework(
    strategyName: StrategyName,
    ctx: any,
    strategyRatings?: Map<string, Promise<StrategyDecisionDto['strategyRating']>>
  ): Promise<StrategyDecisionDto | null> {
    const definition = this.strategyRegistry.get(strategyName);
    if (!definition) return null;
    const strategyContext = this.toStrategyFrameworkContext(ctx);
    const evaluator = new StrategyFrameworkEvaluator(definition);
    const frameworkResult = definition.category === 'EXIT'
      ? evaluator.evaluateExit(strategyContext)
      : evaluator.evaluateEntry(strategyContext);
    const rating = await this.latestStrategyRating(definition.code, strategyContext.region || 'IN', strategyContext.assetType || 'STOCK', strategyRatings);
    return this.adaptFrameworkResult(ctx, frameworkResult, rating);
  }

  private toStrategyFrameworkContext(ctx: any): StrategyContext {
    const closes = ctx.prices as number[];
    return {
      instrumentId: ctx.instrument.id,
      symbol: ctx.instrument.symbol,
      companyName: ctx.instrument.company_name ?? ctx.instrument.name ?? null,
      exchange: ctx.instrument.exchange ?? null,
      country: ctx.instrument.country ?? null,
      sector: ctx.instrument.sector ?? null,
      industry: ctx.instrument.industry ?? null,
      currency: ctx.instrument.currency ?? null,
      assetType: ctx.instrument.asset_type || ctx.instrument.assetType || 'STOCK',
      region: ctx.instrument.region || ctx.instrument.country || 'IN',
      latestPrice: ctx.latestPrice,
      previousClose: closes[1] ?? null,
      prices: ctx.pricePoints,
      bars: ctx.pricePoints.map((price: any) => ({ date: price.date, close: price.adjusted_close, volume: price.volume })),
      sma50: ctx.sma50,
      sma200: ctx.sma200,
      rsi: ctx.rsi,
      return20d: closes.length > 20 && closes[20] > 0 ? (closes[0] - closes[20]) / closes[20] : null,
      high52Week: closes.length > 0 ? Math.max(...closes.slice(0, 252)) : null,
      low52Week: closes.length > 0 ? Math.min(...closes.slice(0, 252)) : null,
      volatility: this.volatility(closes.slice(0, 63)),
      averageVolume20: this.average(ctx.pricePoints.slice(0, 20).map((price: any) => price.volume).filter((value: unknown): value is number => typeof value === 'number')),
      rawSignal: ctx.rawSignal,
      calibratedSignal: ctx.calibrated ? {
        calibratedScore: ctx.calibrated.calibratedScore,
        calibratedDirection: ctx.calibrated.calibratedDirection ?? ctx.rawSignal?.direction ?? 'NEUTRAL',
        calibratedConfidence: ctx.calibrated.calibratedConfidence ?? 'MEDIUM',
      } : null,
      dataQuality: ctx.quality ? {
        coverageStatus: ctx.quality.coverageStatus,
        signalReadinessStatus: ctx.quality.signalReadinessStatus,
        liquidityStatus: ctx.quality.liquidityStatus,
        signalReadinessScore: ctx.quality.signalReadinessScore,
        eligibleForSignals: ctx.quality.eligibleForSignals,
        eligibleForBacktesting: ctx.quality.eligibleForBacktesting,
      } : null,
      marketGate: ctx.gate.marketGate,
      marketRegime: ctx.marketSummary?.regime?.regime ?? null,
      sectorLeadership: ctx.sectorContext?.leadershipStatus ?? null,
      sectorRelativeStrengthScore: ctx.sectorContext?.relativeStrengthScore ?? null,
      smartMoneyStatus: ctx.smartMoney?.status ?? null,
      smartMoneyScore: ctx.smartMoney?.smartMoneyScore ?? null,
      holding: ctx.holding ? {
        quantity: ctx.holding.quantity,
        unrealizedPnLPercent: ctx.holding.unrealizedPnLPercent,
        allocationPercent: ctx.holding.allocationPercent,
      } : null,
    };
  }

  private adaptFrameworkResult(ctx: any, result: StrategySignalOutput, rating: StrategyDecisionDto['strategyRating']): StrategyDecisionDto {
    const mapped = this.mapFrameworkDecision(result);
    const dataGaps = [...new Set([...(ctx.dataGaps || []), ...result.dataGaps])];
    const warnings = [...result.warnings];
    const blockers = [...result.blockers];

    if (ctx.gate.marketGate === 'CLOSED' && result.strategyCode !== 'DEFENSIVE_EXIT') {
      if (!blockers.some((item) => item.includes('Market gate'))) blockers.push('Market gate is closed; no new long candidates.');
      mapped.decision = 'AVOID';
      mapped.action = 'AVOID_NEW_ENTRY';
    } else if (ctx.gate.marketGate === 'SELECTIVE' && result.strategyCode !== 'DEFENSIVE_EXIT') {
      warnings.push('Market is selective; only high-quality setups should be reviewed.');
      if (mapped.decision === 'TRADE_CANDIDATE' && result.score < 85) {
        mapped.decision = 'WATCH';
        mapped.action = 'WAIT_FOR_CONFIRMATION';
      }
    } else if (ctx.gate.marketGate === 'UNKNOWN' && result.strategyCode !== 'DEFENSIVE_EXIT') {
      dataGaps.push('Market gate is unknown; no healthy-market assumption was made.');
      if (mapped.decision === 'TRADE_CANDIDATE') {
        mapped.decision = 'WATCH';
        mapped.action = 'WAIT_FOR_CONFIRMATION';
      }
    }

    const scoreBreakdown = {
      marketContext: ctx.gate.marketGate === 'OPEN' ? 20 : ctx.gate.marketGate === 'SELECTIVE' ? 10 : 0,
      signalStrength: Math.min(30, Math.round(result.score * 0.3)),
      trendTechnical: Math.min(25, result.entryRulesPassed.length * 8 + result.exitRulesTriggered.length * 8),
      dataQuality: result.eligibleForSignalGeneration ? 15 : 0,
      sectorSmartMoney: Math.min(15, Math.max(0, result.score - 70)),
      total: result.score,
      frameworkScore: result.score,
    };

    return this.buildDecisionDto(
      ctx,
      result.strategyCode as StrategyName,
      mapped.decision,
      mapped.action,
      result.score,
      scoreBreakdown,
      result.reasons,
      blockers,
      warnings,
      [...new Set(dataGaps)]
    , {
      strategyVersion: result.strategyVersion,
      frameworkBacked: true,
      frameworkDecision: result.decision,
      frameworkAction: mapped.frameworkAction,
      entryRulesPassed: result.entryRulesPassed,
      exitRulesTriggered: result.exitRulesTriggered,
      noiseFiltersTriggered: result.noiseFiltersTriggered,
      strategyRating: rating,
      readinessLabel: rating?.readinessLabel || null,
    });
  }

  private mapFrameworkDecision(result: StrategySignalOutput): { decision: StrategyDecision; action: DecisionAction; frameworkAction: string } {
    if (result.decision === 'ENTRY_CANDIDATE' || result.decision === 'SIGNAL') return { decision: 'TRADE_CANDIDATE', action: 'CONSIDER_ENTRY', frameworkAction: 'CONSIDER_ENTRY' };
    if (result.decision === 'WATCH') return { decision: 'WATCH', action: 'WAIT_FOR_CONFIRMATION', frameworkAction: 'WAIT_FOR_CONFIRMATION' };
    if (result.decision === 'WAIT') return { decision: 'WAIT', action: 'WAIT_FOR_PULLBACK', frameworkAction: 'WAIT_FOR_PULLBACK' };
    if (result.decision === 'AVOID') return { decision: 'AVOID', action: 'AVOID_NEW_ENTRY', frameworkAction: 'AVOID_NEW_ENTRY' };
    if (result.decision === 'INSUFFICIENT_DATA') return { decision: 'INSUFFICIENT_DATA', action: 'NO_ACTION', frameworkAction: 'NO_ACTION' };
    if (result.decision === 'EXIT_CANDIDATE') return { decision: 'EXIT_CANDIDATE', action: 'REVIEW_EXIT', frameworkAction: 'REVIEW_EXIT' };
    if (result.decision === 'REDUCE_RISK') return { decision: 'REDUCE_RISK', action: 'REDUCE_EXPOSURE', frameworkAction: 'REDUCE_EXPOSURE' };
    return { decision: 'HOLD', action: 'HOLD_POSITION', frameworkAction: 'HOLD_POSITION' };
  }

  private async latestStrategyRating(
    strategyCode: string,
    region: string,
    assetType: string,
    cache?: Map<string, Promise<StrategyDecisionDto['strategyRating']>>
  ): Promise<StrategyDecisionDto['strategyRating']> {
    const key = `${strategyCode}|${region}|${assetType}`;
    if (cache?.has(key)) return cache.get(key)!;
    const promise = this.strategyFrameworkService.performance(strategyCode, { region, assetType }).catch(() => []).then((summaries) => {
    const latest = summaries[0];
    return latest ? {
      ratingScore: latest.ratingScore,
      ratingGrade: latest.ratingGrade,
      readinessLabel: latest.readinessLabel,
    } : null;
    });
    cache?.set(key, promise);
    return promise;
  }

  private latestPersistedCalibration(instrumentId: string) {
    const service = this.calibrationService as any;
    if (typeof service.latestPersistedForInstrument === 'function') {
      return service.latestPersistedForInstrument(instrumentId).catch(() => null);
    }
    return service.latestForInstrument(instrumentId).catch(() => null);
  }

  private latestPersistedDataQuality(instrumentId: string) {
    const service = this.dataQualityService as any;
    if (typeof service.getLatestEvaluationForInstrument === 'function') {
      return service.getLatestEvaluationForInstrument(instrumentId).catch(() => null);
    }
    return service.diagnostics(instrumentId).catch(() => null);
  }

  private latestPersistedSmartMoney(instrumentId: string) {
    const service = this.smartMoneyService as any;
    if (typeof service.latestPersistedStock === 'function') {
      return service.latestPersistedStock(instrumentId, '3M').catch(() => null);
    }
    return service.stock(instrumentId, '3M').catch(() => null);
  }

  private latestPersistedMarketSummary(region?: string) {
    const service = this.contextService as any;
    if (typeof service.latestPersistedSummary === 'function') {
      return service.latestPersistedSummary(region).catch(() => null);
    }
    return service.summary({ region }).catch(() => null);
  }

  private async loadEvaluationBatchContext(instrumentIds: string[], request: Pick<StrategyEvaluateRequest, 'region' | 'assetType'>): Promise<StrategyEvaluationBatchContext> {
    const marketScope = { region: request.region, assetType: request.assetType };
    const marketDataAny = this.marketDataService as any;
    const calibrationAny = this.calibrationService as any;
    const smartMoneyAny = this.smartMoneyService as any;
    const [prices, calibrations, dataQuality, smartMoney] = await Promise.all([
      typeof marketDataAny.listRecentPriceWindowsByInstrumentIds === 'function'
        ? marketDataAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, 500, marketScope).catch(() => new Map())
        : Promise.resolve(new Map()),
      typeof calibrationAny.latestPersistedForInstruments === 'function'
        ? calibrationAny.latestPersistedForInstruments(instrumentIds).catch(() => [])
        : Promise.resolve([]),
      typeof (this.dataQualityService as any).getEvaluationsForInstruments === 'function'
        ? (this.dataQualityService as any).getEvaluationsForInstruments(instrumentIds).catch(() => [])
        : Promise.resolve([]),
      typeof smartMoneyAny.latestPersistedStocks === 'function'
        ? smartMoneyAny.latestPersistedStocks(instrumentIds, '3M').catch(() => [])
        : Promise.resolve([]),
    ]);
    return {
      pricesByInstrumentId: prices instanceof Map ? prices : new Map(),
      calibrationByInstrumentId: new Map((calibrations as any[]).map((item) => [item.instrumentId, item])),
      dataQualityByInstrumentId: new Map((dataQuality as any[]).map((item) => [item.instrumentId, item])),
      smartMoneyByInstrumentId: new Map((smartMoney as any[]).map((item) => [item.instrumentId, item])),
    };
  }

  private async persistDecisionBatch(decisions: StrategyDecisionDto[]): Promise<StrategyDecisionDto[]> {
    const repositoryAny = this.repository as any;
    if (typeof repositoryAny.replaceMany === 'function') {
      return repositoryAny.replaceMany(decisions);
    }
    return Promise.all(decisions.map((decision) => this.repository.create(decision)));
  }

  private getEvaluationInstruments(instrumentIds: string[]) {
    const service = this.marketDataService as any;
    if (typeof service.getInstrumentsByIds === 'function') {
      return service.getInstrumentsByIds(instrumentIds).catch(() => []);
    }
    return Promise.resolve([]);
  }

  private evaluateTrendMomentum(ctx: any): StrategyDecisionDto {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    const dataGaps: string[] = [];
    
    let marketContextScore = 0;
    let signalStrengthScore = 0;
    let trendTechnicalScore = 0;
    let dataQualityScore = 0;
    let sectorSmartMoneyScore = 0;

    // 1. Market Gate (Weight: 15)
    if (ctx.gate.marketGate === 'OPEN') {
      marketContextScore = 15;
      reasons.push('Market gate is OPEN.');
    } else if (ctx.gate.marketGate === 'SELECTIVE') {
      marketContextScore = 8;
      warnings.push('Market gate is SELECTIVE; requiring higher quality.');
    } else if (ctx.gate.marketGate === 'CLOSED') {
      marketContextScore = 0;
      blockers.push('Market gate is CLOSED; no new long candidates.');
    } else {
      marketContextScore = 5;
      dataGaps.push('Market gate status is UNKNOWN.');
    }

    // 2. Signal Strength (Weight: 20)
    if (ctx.calibrated) {
      const calScore = ctx.calibrated.calibratedScore;
      if (calScore >= 80) signalStrengthScore = 20;
      else if (calScore >= 60) signalStrengthScore = 15;
      else if (calScore >= 40) signalStrengthScore = 10;
      reasons.push(`Calibrated signal score is ${calScore}.`);
    } else {
      dataGaps.push('Calibration data missing; using raw signal.');
      const rawScore = ctx.rawSignal?.score ?? 0;
      if (rawScore >= 80) signalStrengthScore = 15;
      else if (rawScore >= 60) signalStrengthScore = 10;
    }

    // 3. Trend Technical & MTFA (Weight: 20)
    const isAbove50 = ctx.latestPrice > (ctx.sma50 ?? 0);
    const isAbove200 = ctx.latestPrice > (ctx.sma200 ?? 0);
    
    // Multi-Timeframe Alignment (MTFA) Check
    // A daily breakout is dangerous if the weekly trend (represented by SMA200 slope and price vs SMA200) is bearish.
    const sma200_20daysAgo = this.calculateSma(ctx.prices.slice(20), 200);
    const isMacroUptrend = isAbove200 && (ctx.sma200 > (sma200_20daysAgo ?? 0));

    if (isAbove50 && isMacroUptrend) {
      trendTechnicalScore = 20;
      reasons.push('Price is above SMA50 with bullish Multi-Timeframe Alignment (Macro Uptrend).');
    } else if (isAbove50 && isAbove200) {
      trendTechnicalScore = 15;
      reasons.push('Price is above SMA50 and SMA200.');
    } else if (isAbove50) {
      trendTechnicalScore = 5;
      warnings.push('Price is above SMA50 but fails Multi-Timeframe Alignment (Below SMA200).');
      blockers.push('MTFA Failure: Macro weekly trend contradicts the daily breakout.');
    } else {
      trendTechnicalScore = 0;
      blockers.push('Price is below SMA50 support.');
    }

    // 4. Data Quality (Weight: 15)
    if (ctx.quality?.eligibleForSignals) {
      dataQualityScore = 15;
      reasons.push('Data quality is ready for signals.');
    } else {
      dataQualityScore = 0;
      blockers.push('Data quality NOT_READY for reliable signals.');
    }

    // 5. Smart Money / Confirmation (Weight: 15)
    if (ctx.smartMoney?.status === 'ACCUMULATION') {
      sectorSmartMoneyScore = 15;
      reasons.push('Smart money accumulation detected.');
    } else if (ctx.smartMoney?.status === 'DISTRIBUTION') {
      sectorSmartMoneyScore = 0;
      blockers.push('Smart money distribution detected.');
    } else {
      sectorSmartMoneyScore = 7;
      dataGaps.push('Smart money context missing.');
    }

    // 6. Sector Wind Confluence (Weight: 15)
    let sectorWindScore = 0;
    const sectors = Array.isArray(ctx.sectors) ? ctx.sectors : [];
    const sectorContext = sectors.find((s: any) => s.sector === ctx.instrument.sector);
    if (sectorContext) {
      if (sectorContext.relativeStrengthScore >= 60) {
        sectorWindScore = 15;
        reasons.push(`Strong Sector Wind: ${ctx.instrument.sector} is leading/improving.`);
      } else if (sectorContext.relativeStrengthScore <= 40) {
        sectorWindScore = 0;
        blockers.push(`Weak Sector Wind: ${ctx.instrument.sector} is lagging.`);
      } else {
        sectorWindScore = 8;
      }
    } else {
      sectorWindScore = 8;
      dataGaps.push('Sector context missing.');
    }

    const totalScore = marketContextScore + signalStrengthScore + trendTechnicalScore + dataQualityScore + sectorSmartMoneyScore + sectorWindScore;
    const scoreBreakdown = {
      marketContext: marketContextScore,
      signalStrength: signalStrengthScore,
      trendTechnical: trendTechnicalScore,
      dataQuality: dataQualityScore,
      sectorSmartMoney: sectorSmartMoneyScore,
      sectorWind: sectorWindScore,
      total: totalScore,
    };

    let decision: StrategyDecision = 'WAIT';
    let action: DecisionAction = 'NO_ACTION';

    // Thresholds
    if (blockers.length > 0) {
      decision = 'AVOID';
      action = 'AVOID_NEW_ENTRY';
    } else if (totalScore >= 80) {
      decision = 'TRADE_CANDIDATE';
      action = 'CONSIDER_ENTRY';
    } else if (totalScore >= 60) {
      decision = 'WATCH';
      action = 'WAIT_FOR_CONFIRMATION';
    } else {
      decision = 'WAIT';
      action = 'WAIT_FOR_PULLBACK';
    }

    return this.buildDecisionDto(ctx, 'TREND_MOMENTUM', decision, action, totalScore, scoreBreakdown, reasons, blockers, warnings, dataGaps);
  }

  private evaluatePullback(ctx: any): StrategyDecisionDto {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    const dataGaps: string[] = [];

    let marketContextScore = 0;
    let trendTechnicalScore = 0;
    let pullbackQualityScore = 0;
    let dataQualityScore = 0;
    let sectorSmartMoneyScore = 0;

    // 1. Market Context (Weight: 20)
    if (ctx.gate.marketGate === 'OPEN') marketContextScore = 20;
    else if (ctx.gate.marketGate === 'SELECTIVE') marketContextScore = 15;
    else if (ctx.gate.marketGate === 'CLOSED') blockers.push('Market gate is CLOSED.');

    // 2. Trend Technical (Weight: 25)
    const uptrend = (ctx.sma50 ?? 0) > (ctx.sma200 ?? 0) && ctx.latestPrice > (ctx.sma200 ?? 0);
    if (uptrend) {
      trendTechnicalScore = 25;
      reasons.push('Confirmed long-term uptrend (SMA50 > SMA200).');
    } else {
      blockers.push('Stock is not in a confirmed uptrend.');
    }

    // 3. Pullback Quality (Weight: 20)
    const near50 = ctx.sma50 && Math.abs(ctx.latestPrice - ctx.sma50) / ctx.sma50 <= 0.03;
    const rsiCool = ctx.rsi && ctx.rsi < 60 && ctx.rsi > 35;
    
    if (near50) {
      pullbackQualityScore += 10;
      reasons.push('Price is near SMA50 support.');
    }
    if (rsiCool) {
      pullbackQualityScore += 10;
      reasons.push('RSI is in the healthy pullback zone (35-60).');
    }
    if (!near50 && !rsiCool) warnings.push('Pullback is not yet at an ideal support level.');

    // 4. Data Quality (Weight: 20)
    if (ctx.quality?.eligibleForSignals) {
      dataQualityScore = 20;
    } else {
      blockers.push('Data quality NOT_READY.');
    }

    // 5. Smart Money (Weight: 15)
    if (ctx.smartMoney?.status === 'ACCUMULATION') {
      sectorSmartMoneyScore = 15;
    } else if (ctx.smartMoney?.status === 'DISTRIBUTION') {
      sectorSmartMoneyScore = 0;
      warnings.push('Smart money distribution during pullback.');
    } else {
      sectorSmartMoneyScore = 7;
      dataGaps.push('Smart money context missing.');
    }

    const totalScore = marketContextScore + trendTechnicalScore + pullbackQualityScore + dataQualityScore + sectorSmartMoneyScore;
    const scoreBreakdown = {
      marketContext: marketContextScore,
      signalStrength: 0,
      trendTechnical: trendTechnicalScore,
      pullbackQuality: pullbackQualityScore,
      dataQuality: dataQualityScore,
      sectorSmartMoney: sectorSmartMoneyScore,
      total: totalScore,
    };

    let decision: StrategyDecision = 'WAIT';
    let action: DecisionAction = 'NO_ACTION';

    if (blockers.length > 0) {
      decision = 'AVOID';
      action = 'AVOID_NEW_ENTRY';
    } else if (totalScore >= 75) {
      decision = 'TRADE_CANDIDATE';
      action = 'CONSIDER_ENTRY';
    } else {
      decision = 'WATCH';
      action = 'WAIT_FOR_PULLBACK';
    }

    return this.buildDecisionDto(ctx, 'PULLBACK_IN_UPTREND', decision, action, totalScore, scoreBreakdown, reasons, blockers, warnings, dataGaps);
  }

  private evaluateDefensiveExit(ctx: any): StrategyDecisionDto {
    const reasons: string[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    const dataGaps: string[] = [];

    let bearishSignalReliabilityScore = 0;
    let trendBreakdownScore = 0;
    let marketSectorWeaknessScore = 0;
    let portfolioRiskScore = 0;
    let smartMoneyDataWarningsScore = 0;

    // 1. Bearish Signal (Weight: 30)
    if (ctx.rawSignal?.direction === 'BEARISH') {
      bearishSignalReliabilityScore = 30;
      reasons.push('Bearish signal crossover detected.');
    }

    // 2. Trend Breakdown (Weight: 25)
    if (ctx.sma50 && ctx.latestPrice < ctx.sma50) {
      trendBreakdownScore = 25;
      reasons.push('Price dropped below SMA50 support.');
    }

    // 3. Market/Sector Weakness (Weight: 20)
    if (ctx.gate.marketGate === 'CLOSED') {
      marketSectorWeaknessScore = 20;
      reasons.push('Market gate is CLOSED (High Risk).');
    } else if (ctx.gate.marketGate === 'SELECTIVE') {
      marketSectorWeaknessScore = 10;
    }

    // 4. Portfolio Risk (Weight: 15) - Placeholder for allocation/P&L logic
    portfolioRiskScore = 5; 

    // 5. Smart Money / Data (Weight: 10)
    if (ctx.smartMoney?.status === 'DISTRIBUTION') {
      smartMoneyDataWarningsScore = 10;
      reasons.push('Smart money distribution detected.');
    }

    const totalScore = bearishSignalReliabilityScore + trendBreakdownScore + marketSectorWeaknessScore + portfolioRiskScore + smartMoneyDataWarningsScore;
    const scoreBreakdown = {
      marketContext: marketSectorWeaknessScore,
      signalStrength: bearishSignalReliabilityScore,
      trendTechnical: trendBreakdownScore,
      dataQuality: 0,
      sectorSmartMoney: smartMoneyDataWarningsScore,
      portfolioRisk: portfolioRiskScore,
      total: totalScore,
    };

    let decision: StrategyDecision = 'HOLD';
    let action: DecisionAction = 'HOLD_POSITION';

    if (totalScore >= 75) {
      decision = 'EXIT_CANDIDATE';
      action = 'REVIEW_EXIT';
    } else if (totalScore >= 45) {
      decision = 'REDUCE_RISK';
      action = 'REDUCE_EXPOSURE';
    } else if (totalScore >= 25) {
      decision = 'WATCH';
      action = 'NO_ACTION';
    }

    return this.buildDecisionDto(ctx, 'DEFENSIVE_EXIT', decision, action, totalScore, scoreBreakdown, reasons, blockers, warnings, dataGaps);
  }

  async health() {
    const count = await this.repository.count();
    const lastAt = await this.repository.latestGeneratedAt();
    return {
      status: 'ok',
      module: 'strategy-decision-engine',
      decisionsCount: count,
      latestGeneratedAt: lastAt?.toISOString() ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  private buildDecisionDto(
    ctx: any,
    strategy: StrategyName,
    decision: StrategyDecision,
    action: DecisionAction,
    score: number,
    scoreBreakdown: any,
    reasons: string[],
    blockers: string[],
    warnings: string[],
    dataGaps: string[],
    frameworkMetadata: Partial<Pick<StrategyDecisionDto, 'strategyVersion' | 'frameworkBacked' | 'frameworkDecision' | 'frameworkAction' | 'entryRulesPassed' | 'exitRulesTriggered' | 'noiseFiltersTriggered' | 'strategyRating' | 'readinessLabel'>> = {}
  ): StrategyDecisionDto {
    const invalidationRules = [
      'Market gate closes (CLOSED status).',
      'Data quality becomes NOT_READY.'
    ];
    const exitRules = [];
    
    if (strategy === 'TREND_MOMENTUM' || strategy === 'PULLBACK_IN_UPTREND') {
      invalidationRules.push('Price closes below SMA50 for 2 consecutive days.');
      invalidationRules.push('Calibrated score drops below 40.');
      exitRules.push('Exit condition met: momentum evidence weakened.');
      exitRules.push('Risk review required when smart money status turns to DISTRIBUTION.');
    }

    const sma50 = ctx.sma50;
    const entryZoneType = this.entryZoneTypeForStrategy(strategy);
    
    const entryZone = entryZoneType && sma50 ? {
      type: entryZoneType,
      referencePrice: sma50,
      preferredEntryMin: Number((sma50 * 0.99).toFixed(2)),
      preferredEntryMax: Number((sma50 * 1.02).toFixed(2)),
      rationale: entryZoneType === 'BREAKOUT' ? 'Review on strength above SMA50 support.' : 'Review on successful test of SMA50 support.'
    } : undefined;

    const riskPlan = entryZoneType && sma50 ? {
      stopLoss: (sma50 * 0.96).toFixed(2),
      targetPrice: null,
      targetPriceCompatibilityNote: 'Deprecated compatibility field. No projected price is produced; Strategy Decision uses rule-based exit and invalidation review.',
      rewardRiskRatio: null,
      riskReviewLevel: this.riskReviewLevel(decision, blockers, warnings, dataGaps),
      rationale: 'Risk review uses SMA50 support, market gate, data quality, calibrated score, and smart-money evidence. Exit and invalidation are rule-based review conditions.',
      reasonSummary: 'Candidate review is based on rule evidence, not a projected price.',
      invalidationRules,
      exitRules,
    } : undefined;

    return {
      instrumentId: ctx.instrument.id,
      symbol: ctx.instrument.symbol,
      country: ctx.instrument.country,
      exchange: ctx.instrument.exchange,
      strategy,
      decision,
      action,
      decisionScore: score,
      scoreBreakdown,
      confidence: this.calculateConfidence(ctx, dataGaps),
      marketCondition: ctx.gate.marketCondition,
      marketGate: ctx.gate.marketGate,
      reasons,
      blockers,
      warnings,
      dataGaps,
      ...frameworkMetadata,
      modelVersion: MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      entryZone,
      riskPlan,
    };
  }

  private riskReviewLevel(
    decision: StrategyDecision,
    blockers: string[],
    warnings: string[],
    dataGaps: string[]
  ): RiskReviewLevel {
    if (blockers.length > 0 || ['AVOID', 'EXIT_CANDIDATE', 'REDUCE_RISK'].includes(decision)) return 'HIGH';
    if (warnings.length > 0 || dataGaps.length > 0 || decision === 'WATCH') return 'MEDIUM';
    return 'LOW';
  }

  private calculateConfidence(ctx: any, dataGaps: string[]): DecisionConfidence {
    let confidence: DecisionConfidence = 'HIGH';

    if (ctx.prices.length < 100) confidence = 'LOW';
    else if (ctx.prices.length < 200) confidence = 'MEDIUM';

    if (!ctx.quality?.eligibleForSignals) confidence = 'LOW';
    
    if (dataGaps.length > 2) confidence = 'LOW';
    else if (dataGaps.length > 0 && confidence === 'HIGH') confidence = 'MEDIUM';

    if (ctx.gate.marketGate === 'UNKNOWN') confidence = 'LOW';

    return confidence;
  }

  private strategiesForRequest(request: StrategyEvaluateRequest): StrategyName[] {
    if (request.strategy !== 'ALL') return [request.strategy];
    return this.reviewStrategyDefinitions().map((strategy) => strategy.code);
  }

  private reviewStrategyDefinitions() {
    return this.strategyRegistry.active().filter((strategy) => this.isReviewStrategy(strategy));
  }

  private isReviewStrategy(strategy: { status: string; category: string }) {
    return strategy.status === 'ACTIVE' && REVIEW_STRATEGY_CATEGORIES.has(strategy.category);
  }

  private entryZoneTypeForStrategy(strategy: StrategyName): EntryZoneType | null {
    if (['TREND_MOMENTUM', 'BREAKOUT_CONFIRMATION'].includes(strategy)) return 'BREAKOUT';
    if (['PULLBACK_IN_UPTREND', 'MEAN_REVERSION_PULLBACK'].includes(strategy)) return 'PULLBACK';
    return null;
  }

  private async resolveEvaluationUniverse(
    request: StrategyEvaluateRequest,
    batchSize: number,
    offset: number
  ): Promise<{ instrumentIds: string[]; totalCount: number; rawSignalsByInstrumentId: Map<string, SignalResultDto> }> {
    if (request.instrumentId) return { instrumentIds: [request.instrumentId], totalCount: 1, rawSignalsByInstrumentId: new Map() };
    if (request.instrumentIds?.length) {
      const ids = [...new Set(request.instrumentIds.map((id) => String(id || '').trim()).filter(Boolean))];
      return { instrumentIds: ids.slice(offset, offset + batchSize), totalCount: ids.length, rawSignalsByInstrumentId: new Map() };
    }
    if (request.symbol) {
      const res = await this.marketDataService.listInstruments({
        search: request.symbol,
        pageSize: 5,
        region: request.region,
        assetType: request.assetType,
      });
      const requested = request.symbol.toUpperCase();
      const match = res.instruments.find((i) => {
        const instrument = i as any;
        const candidates = [
          instrument.symbol,
          instrument.display_symbol,
          instrument.displaySymbol,
          instrument.provider_symbol,
          instrument.providerSymbol,
          instrument.source_symbol,
          instrument.sourceSymbol,
        ]
          .filter(Boolean)
          .map((value) => String(value).toUpperCase());
        return candidates.includes(requested);
      }) || res.instruments[0];
      return { instrumentIds: match ? [match.id] : [], totalCount: match ? 1 : 0, rawSignalsByInstrumentId: new Map() };
    }
    if (request.portfolioId) {
      const detail = await this.portfolioService.getPortfolioDetail(request.portfolioId);
      const ids = detail?.holdings.map(h => h.instrumentId) || [];
      return { instrumentIds: ids.slice(offset, offset + batchSize), totalCount: ids.length, rawSignalsByInstrumentId: new Map() };
    }
    if (request.watchlistId) {
      const detail = await this.watchlistService.detail(request.watchlistId);
      const ids = detail?.items.map(i => i.instrumentId) || [];
      return { instrumentIds: ids.slice(offset, offset + batchSize), totalCount: ids.length, rawSignalsByInstrumentId: new Map() };
    }
    const signalQuery = { limit: batchSize, offset, region: request.region, assetType: request.assetType };
    const [signals, totalCount] = await Promise.all([
      this.signalService.latestSignalUniverse(signalQuery),
      this.signalService.latestSignalUniverseCount(signalQuery),
    ]);
    return {
      instrumentIds: signals.map((signal) => signal.instrument_id),
      totalCount,
      rawSignalsByInstrumentId: new Map(signals.map((signal) => [signal.instrument_id, signal])),
    };
  }

  private calculateSma(prices: number[], period: number): number | null {
    if (prices.length < period) return null;
    return prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  }

  private calculateRsi(prices: number[], period: number): number | null {
    if (prices.length <= period) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 0; i < period; i++) {
      const diff = prices[i] - prices[i + 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  }

  private toPricePoints(prices: any[]) {
    return prices.map((price) => ({
      date: typeof price.date === 'string' ? price.date : new Date(price.date).toISOString(),
      open: this.optionalNumber(price.open),
      high: this.optionalNumber(price.high),
      low: this.optionalNumber(price.low),
      close: Number(price.close),
      adjusted_close: Number(price.adjusted_close ?? price.close),
      volume: this.optionalNumber(price.volume),
    })).filter((price) => Number.isFinite(price.adjusted_close)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private volatility(values: number[]) {
    const returns = values.slice(1).map((value, index) => value > 0 ? (values[index] - value) / value : 0);
    if (returns.length < 2) return null;
    const avg = this.average(returns) ?? 0;
    return Math.sqrt(returns.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (returns.length - 1)) * Math.sqrt(252);
  }

  private average(values: number[]) {
    return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  }

  private optionalNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}

import { MarketDataFoundationService } from '../market-data-foundation';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { mapFrameworkDecisionToStrategyDecision } from '../../shared/types/strategy.types';
import {
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../market-context-intelligence/capital-posture.types';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { DataQualityEngineService } from '../data-quality-engine';
import type { InstrumentEligibilityRow } from '../data-quality-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { PortfolioManagementService } from '../portfolio-management';
import { WatchlistManagementService } from '../watchlist-management';
import { StrategyFrameworkService } from '../strategy-framework';
import type {
  StrategyContext,
  StrategyDefinition,
  StrategyFrameworkContextEvaluation,
  StrategySignalOutput,
} from '../strategy-framework';
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

/**
 * CB-45: minimum framework score to retain TRADE_CANDIDATE in the SELECTIVE regime.
 * Indian strategies typically score 70–80 under normal NSE conditions. A gate of 85
 * blocked almost every candidate. 75 equals the framework's own minScore for top-tier
 * long strategies — admits strong-but-not-perfect setups while remaining stricter than
 * the OPEN gate (which admits anything ≥ minScore = 70).
 */
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const SELECTIVE_MIN_SCORE: number = 75;

type StrategyEvaluationBatchContext = {
  pricesByInstrumentId: Map<string, any[]>;
  calibrationByInstrumentId: Map<string, any>;
  dataQualityByInstrumentId: Map<string, any>;
  smartMoneyByInstrumentId: Map<string, any>;
};

type StrategyDecisionFrameworkService = Pick<StrategyFrameworkService, 'list' | 'evaluateContextWithDefinitions' | 'performance'>;

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
    private readonly strategyFrameworkService: StrategyDecisionFrameworkService = new StrategyFrameworkService()
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

  /**
   * Derives MarketGate from a market summary, regime, and breadth snapshot.
   *
   * Thresholds are imported from capital-posture.types.ts (Capital Posture is the
   * single source of truth for regime/breadth gate thresholds).  Both modules now
   * share BREADTH_WEAK_THRESHOLD (RISK_ON → NEUTRAL downgrade boundary) and
   * BREADTH_VERY_WEAK_THRESHOLD (NEUTRAL → RISK_OFF downgrade boundary) so that
   * tuning Capital Posture constants automatically propagates here.
   *
   * Gate mapping (mirrors Capital Posture posture derivation):
   *   OPEN      ← RISK_ON regime AND breadth ≥ BREADTH_WEAK_THRESHOLD (0.40)
   *   CLOSED    ← RISK_OFF regime OR breadth < BREADTH_VERY_WEAK_THRESHOLD (0.25)
   *   SELECTIVE ← everything else (NEUTRAL / weak-breadth RISK_ON)
   */
  private marketGateFromSummary(summary: any, regime: any, breadth: any): MarketGateResponse {
    const reasons: string[] = [];
    const blockers: string[] = [];
    let marketCondition: MarketCondition = 'UNKNOWN';
    let marketGate: MarketGate = 'UNKNOWN';
    let allowedActions: AllowedAction[] = ['MANAGE_EXISTING_POSITIONS_ONLY'];
    const score = regime?.score ?? 0;
    const isRiskOn = regime?.regime === 'RISK_ON';
    const isRiskOff = regime?.regime === 'RISK_OFF';
    // breadthAbove50 is a fraction in [0, 1]; use Capital Posture constants for thresholds.
    const breadthAbove50 = breadth?.percentAboveSma50 ?? 0;

    if (isRiskOn && breadthAbove50 >= BREADTH_WEAK_THRESHOLD) {
      // Capital Posture: RISK_ON posture requires regime RISK_ON AND breadth ≥ BREADTH_WEAK_THRESHOLD.
      marketCondition = 'HEALTHY';
      marketGate = 'OPEN';
      allowedActions = ['NEW_LONG_TRADES_ALLOWED', 'ONLY_HIGH_QUALITY_SETUPS'];
      reasons.push('Market regime is Risk-On and breadth is healthy.');
    } else if (isRiskOff || breadthAbove50 < BREADTH_VERY_WEAK_THRESHOLD) {
      // Capital Posture: RISK_OFF posture is triggered by RISK_OFF regime OR breadth below BREADTH_VERY_WEAK_THRESHOLD.
      marketCondition = 'BAD';
      marketGate = 'CLOSED';
      allowedActions = ['MANAGE_EXISTING_POSITIONS_ONLY'];
      blockers.push('Market regime is Risk-Off or breadth is weak.');
      if (isRiskOff) reasons.push('High bearish risk detected.');
    } else {
      // Capital Posture: NEUTRAL posture — selective deployment.
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
    const strategies = await this.strategiesForRequest(request);
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
    const strategies = await this.strategyFrameworkService.list({});
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
        readinessLabel: strategy.readinessLabel ?? null,
        strategyRating: strategy.strategyRating ?? null,
        evaluationSupported: this.isReviewStrategy(strategy),
        strategyDefinitionSource: strategy.definitionSource ?? null,
        strategyDefinitionDrift: strategy.definitionDrift ?? [],
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
        // Thresholds mirror Capital Posture constants (capital-posture.types.ts).
        HEALTHY: `Risk-On regime and breadth ≥ ${BREADTH_WEAK_THRESHOLD * 100}% above 50-DMA`,
        MIXED:   `Breadth ${BREADTH_VERY_WEAK_THRESHOLD * 100}–${BREADTH_WEAK_THRESHOLD * 100}% or neutral regime`,
        BAD:     `Risk-Off regime or breadth < ${BREADTH_VERY_WEAK_THRESHOLD * 100}% above 50-DMA`,
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

    // Fix #6: Legacy evaluators fire as fallback — label results clearly.
    if (strategyName === 'TREND_MOMENTUM') {
      const result = this.evaluateTrendMomentum(context);
      result.warnings = ['[LEGACY-EVALUATOR] Result produced by legacy heuristic evaluator, not the Strategy Framework.', ...(result.warnings ?? [])];
      return result;
    }
    if (strategyName === 'PULLBACK_IN_UPTREND') {
      const result = this.evaluatePullback(context);
      result.warnings = ['[LEGACY-EVALUATOR] Result produced by legacy heuristic evaluator, not the Strategy Framework.', ...(result.warnings ?? [])];
      return result;
    }
    if (strategyName === 'DEFENSIVE_EXIT') return this.evaluateDefensiveExit(context);

    return null;
  }

  async latestForInstrument(instrumentId: string, strategy?: string, region?: string): Promise<StrategyDecisionDto | null> {
    void region;
    return this.repository.latestForInstrument(instrumentId, strategy);
  }

  private async evaluateInstrumentStrategies(
    instrumentId: string,
    strategies: StrategyName[],
    gate: MarketGateResponse,
    options: {
      portfolioId?: string;
      region?: string;
      assetType?: string;
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

    // Fix #6: Legacy evaluators fire as fallback — label results clearly so callers can distinguish
    // framework-backed decisions from the older heuristic path.
    if (strategyName === 'TREND_MOMENTUM') {
      const result = this.evaluateTrendMomentum(context);
      result.warnings = ['[LEGACY-EVALUATOR] Result produced by legacy heuristic evaluator, not the Strategy Framework.', ...(result.warnings ?? [])];
      return result;
    }
    if (strategyName === 'PULLBACK_IN_UPTREND') {
      const result = this.evaluatePullback(context);
      result.warnings = ['[LEGACY-EVALUATOR] Result produced by legacy heuristic evaluator, not the Strategy Framework.', ...(result.warnings ?? [])];
      return result;
    }
    if (strategyName === 'DEFENSIVE_EXIT') return this.evaluateDefensiveExit(context);

    return null;
  }

  private async buildDecisionContext(
    instrumentId: string,
    gate: MarketGateResponse,
    options: {
      portfolioId?: string;
      region?: string;
      assetType?: string;
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
      options.instrument ? Promise.resolve(options.instrument) : this.marketDataService.getInstrument(instrumentId, { region: options.region, assetType: options.assetType }).catch(() => null),
      options.prices !== undefined ? Promise.resolve({ prices: options.prices }) : this.marketDataService.listPricesByInstrumentId(instrumentId, 500, undefined, undefined, { region: options.region, assetType: options.assetType }).catch(() => ({ prices: [] })),
      options.rawSignal ? Promise.resolve(options.rawSignal) : this.signalService.latestForInstrument(instrumentId).catch(() => null),
      options.calibrated !== undefined ? Promise.resolve(options.calibrated) : this.latestPersistedCalibration(instrumentId),
      options.quality !== undefined ? Promise.resolve(options.quality) : this.latestPersistedDataQuality(instrumentId),
      options.smartMoney !== undefined ? Promise.resolve(options.smartMoney) : this.latestPersistedSmartMoney(instrumentId),
      options.marketSummary !== undefined ? Promise.resolve(options.marketSummary) : this.latestPersistedMarketSummary(options.region),
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
    const strategyContext = this.toStrategyFrameworkContext(ctx);
    const evaluation = await this.resolveFrameworkEvaluation(strategyName, strategyContext);
    if (!evaluation) return null;
    const rating = await this.latestStrategyRating(
      evaluation.definition,
      strategyContext.region || 'IN',
      strategyContext.assetType || 'STOCK',
      strategyRatings
    );
    return this.adaptFrameworkResult(ctx, evaluation.result, evaluation.definition, rating);
  }

  private async resolveFrameworkEvaluation(
    strategyName: StrategyName,
    strategyContext: StrategyContext
  ): Promise<StrategyFrameworkContextEvaluation | null> {
    if (typeof this.strategyFrameworkService.evaluateContextWithDefinitions !== 'function') return null;
    const [evaluation] = await this.strategyFrameworkService.evaluateContextWithDefinitions(strategyContext, String(strategyName || '').trim().toUpperCase());
    return evaluation ?? null;
  }

  /**
   * Map either an InstrumentEligibilityRow (batch path, Phase 1) or a legacy
   * DataQualityEvaluation object (single-instrument path) to the evaluator's
   * StrategyContext.dataQuality shape.
   *
   * Mapping table (evaluator field ← source):
   *   signalReadinessStatus  ← eligibilityRow.readinessStatus   (legacy: .signalReadinessStatus)
   *   eligibleForSignals     ← eligibilityRow.verdicts.signalEligible (legacy: .eligibleForSignals)
   *   signalReadinessScore   ← eligibilityRow.readinessScore    (legacy: .signalReadinessScore)
   *   eligibleForBacktesting ← eligibilityRow.verdicts.backtestEligible (legacy: .eligibleForBacktesting)
   *   liquidityStatus        ← derived from eligibilityRow.facts.liquidityScore via banding
   *                            (>=70 LIQUID, >=40 THIN, else ILLIQUID — mirrors DQE readinessScore banding,
   *                             see data-quality-engine.service.ts line ~638)
   *                            (legacy: .liquidityStatus — direct field)
   *   coverageStatus         ← FALLBACK: not stored in instrument_eligibility; defaults to 'PARTIAL'
   *                            (conservative — won't trigger the UNUSABLE block in applyCommonNoise)
   *                            (legacy: .coverageStatus — direct field, kept as fallback below)
   */
  private toEvaluatorDataQuality(quality: InstrumentEligibilityRow | Record<string, any>) {
    // Discriminate: InstrumentEligibilityRow has a `verdicts` object with `signalEligible`.
    const isEligibilityRow = quality != null &&
      typeof (quality as InstrumentEligibilityRow).verdicts === 'object' &&
      (quality as InstrumentEligibilityRow).verdicts != null;

    if (isEligibilityRow) {
      const row = quality as InstrumentEligibilityRow;
      const ls = row.facts.liquidityScore;
      // Liquidity banding mirrors DQE (data-quality-engine.service.ts ~638):
      const liquidityStatus: 'LIQUID' | 'THIN' | 'ILLIQUID' =
        ls >= 70 ? 'LIQUID' : ls >= 40 ? 'THIN' : 'ILLIQUID';
      return {
        // coverageStatus: FALLBACK — not stored in instrument_eligibility.
        // Conservative default: 'PARTIAL' avoids false COVERAGE_UNUSABLE blocks.
        coverageStatus: 'PARTIAL' as const,
        signalReadinessStatus: row.readinessStatus,
        liquidityStatus,
        signalReadinessScore: row.readinessScore,
        eligibleForSignals: row.verdicts.signalEligible,
        eligibleForBacktesting: row.verdicts.backtestEligible,
      };
    }

    // Legacy DataQualityEvaluation path (single-instrument buildDecisionContext).
    const q = quality as Record<string, any>;
    return {
      coverageStatus: q['coverageStatus'],
      signalReadinessStatus: q['signalReadinessStatus'],
      liquidityStatus: q['liquidityStatus'],
      signalReadinessScore: q['signalReadinessScore'],
      eligibleForSignals: q['eligibleForSignals'],
      eligibleForBacktesting: q['eligibleForBacktesting'],
    };
  }

  private toStrategyFrameworkContext(ctx: any): StrategyContext {
    const closes = ctx.prices as number[];
    // Resolve F&O / derivatives eligibility from the instrument record.
    // Support both camelCase (derivativesEligible) and snake_case (derivatives_eligible)
    // variants so that partial migration in the data layer does not silently hide short setups.
    const rawEligible = ctx.instrument?.derivativesEligible ?? ctx.instrument?.derivatives_eligible ?? null;
    const derivativesEligible: boolean | null =
      rawEligible === true || rawEligible === false ? rawEligible : null;
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
      dataQuality: ctx.quality ? this.toEvaluatorDataQuality(ctx.quality) : null,
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
      derivativesEligible,
    };
  }

  private adaptFrameworkResult(
    ctx: any,
    result: StrategySignalOutput,
    definition: StrategyDefinition,
    rating: StrategyDecisionDto['strategyRating']
  ): StrategyDecisionDto {
    const mapped = this.mapFrameworkDecision(result);
    const dataGaps = [...new Set([...(ctx.dataGaps || []), ...result.dataGaps])];
    const warnings = [...result.warnings];
    const blockers = [...result.blockers];

    // SHORT-style strategies (e.g. BREAKDOWN_MOMENTUM) have their strongest thesis when the
    // market gate is CLOSED / RISK_OFF — do NOT veto them with the long-entry CLOSED override.
    const isShortStrategy =
      result.strategyCode === 'BREAKDOWN_MOMENTUM' ||
      definition.style?.toUpperCase().includes('SHORT');

    if (ctx.gate.marketGate === 'CLOSED' && result.strategyCode !== 'DEFENSIVE_EXIT' && !isShortStrategy) {
      if (!blockers.some((item) => item.includes('Market gate'))) blockers.push('Market gate is closed; no new long candidates.');
      mapped.decision = 'AVOID';
      mapped.action = 'AVOID_NEW_ENTRY';
    } else if (ctx.gate.marketGate === 'SELECTIVE' && result.strategyCode !== 'DEFENSIVE_EXIT') {
      warnings.push('Market is selective; only high-quality setups should be reviewed.');
      if (mapped.decision === 'TRADE_CANDIDATE' && result.score < SELECTIVE_MIN_SCORE) {
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
      [...new Set(dataGaps)],
      {
      strategyName: definition.name,
      strategyVersion: result.strategyVersion,
      frameworkBacked: true,
      frameworkDecision: result.decision,
      frameworkAction: mapped.frameworkAction,
      entryRulesPassed: result.entryRulesPassed,
      exitRulesTriggered: result.exitRulesTriggered,
      invalidationRulesTriggered: result.invalidationRulesTriggered,
      noiseFiltersTriggered: result.noiseFiltersTriggered,
      strategyRating: rating,
      readinessLabel: rating?.readinessLabel || definition.readinessLabel || null,
      strategyDefinitionSource: definition.definitionSource ?? null,
      strategyDefinitionDrift: definition.definitionDrift ?? [],
    });
  }

  private mapFrameworkDecision(result: StrategySignalOutput): { decision: StrategyDecision; action: DecisionAction; frameworkAction: string } {
    const decision = mapFrameworkDecisionToStrategyDecision(result.decision);
    if (decision === 'TRADE_CANDIDATE') return { decision, action: 'CONSIDER_ENTRY', frameworkAction: 'CONSIDER_ENTRY' };
    if (decision === 'WATCH') return { decision, action: 'WAIT_FOR_CONFIRMATION', frameworkAction: 'WAIT_FOR_CONFIRMATION' };
    if (decision === 'WAIT') return { decision, action: 'WAIT_FOR_PULLBACK', frameworkAction: 'WAIT_FOR_PULLBACK' };
    if (decision === 'AVOID') return { decision, action: 'AVOID_NEW_ENTRY', frameworkAction: 'AVOID_NEW_ENTRY' };
    if (decision === 'INSUFFICIENT_DATA') return { decision, action: 'NO_ACTION', frameworkAction: 'NO_ACTION' };
    if (decision === 'EXIT_CANDIDATE') return { decision, action: 'REVIEW_EXIT', frameworkAction: 'REVIEW_EXIT' };
    if (decision === 'REDUCE_RISK') return { decision, action: 'REDUCE_EXPOSURE', frameworkAction: 'REDUCE_EXPOSURE' };
    return { decision: 'HOLD', action: 'HOLD_POSITION', frameworkAction: 'HOLD_POSITION' };
  }

  private async latestStrategyRating(
    definition: StrategyDefinition,
    region: string,
    assetType: string,
    cache?: Map<string, Promise<StrategyDecisionDto['strategyRating']>>
  ): Promise<StrategyDecisionDto['strategyRating']> {
    const definitionRating = this.ratingFromDefinition(definition);
    if (definitionRating) return definitionRating;
    const strategyCode = definition.code;
    const key = `${strategyCode}|${region}|${assetType}`;
    if (cache?.has(key)) return cache.get(key)!;
    if (typeof this.strategyFrameworkService.performance !== 'function') return null;
    const promise = this.strategyFrameworkService.performance(strategyCode, { region, assetType }).catch(() => []).then((summaries) => {
      const latest = summaries[0];
      return latest ? {
        ratingScore: latest.ratingScore,
        ratingGrade: latest.ratingGrade,
        readinessLabel: latest.readinessLabel || definition.readinessLabel,
      } : null;
    });
    cache?.set(key, promise);
    return promise;
  }

  private ratingFromDefinition(definition: StrategyDefinition): StrategyDecisionDto['strategyRating'] {
    const raw = definition.strategyRating;
    if (!raw || typeof raw !== 'object') return null;
    const ratingScore = Number((raw as any).ratingScore ?? (raw as any).score);
    const ratingGrade = String((raw as any).ratingGrade ?? (raw as any).grade ?? '').trim().toUpperCase();
    if (!Number.isFinite(ratingScore) || !ratingGrade) return null;
    return {
      ratingScore: Math.round(ratingScore),
      ratingGrade,
      readinessLabel: definition.readinessLabel ?? (String((raw as any).readinessLabel || '') || undefined),
    };
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
    return Promise.resolve(null);
  }

  private latestPersistedMarketSummary(region?: string) {
    const service = this.contextService as any;
    if (typeof service.latestPersistedSummary === 'function') {
      return service.latestPersistedSummary(region).catch(() => null);
    }
    return Promise.resolve(null);
  }

  private async loadEvaluationBatchContext(instrumentIds: string[], request: Pick<StrategyEvaluateRequest, 'region' | 'assetType'>): Promise<StrategyEvaluationBatchContext> {
    const marketScope = { region: request.region, assetType: request.assetType };
    const marketDataAny = this.marketDataService as any;
    const calibrationAny = this.calibrationService as any;
    const smartMoneyAny = this.smartMoneyService as any;
    const [prices, calibrations, eligibilityRows, smartMoney] = await Promise.all([
      typeof marketDataAny.listRecentPriceWindowsByInstrumentIds === 'function'
        ? marketDataAny.listRecentPriceWindowsByInstrumentIds(instrumentIds, 500, marketScope).catch(() => new Map())
        : Promise.resolve(new Map()),
      typeof calibrationAny.latestPersistedForInstruments === 'function'
        ? calibrationAny.latestPersistedForInstruments(instrumentIds).catch(() => [])
        : Promise.resolve([]),
      // Phase 1 consumer flip: source data-quality context from instrument_eligibility
      // (one bulk query, no N+1). Legacy getEvaluationsForInstruments replaced.
      this.dataQualityService.getEligibility(instrumentIds).catch(() => [] as InstrumentEligibilityRow[]),
      typeof smartMoneyAny.latestPersistedStocks === 'function'
        ? smartMoneyAny.latestPersistedStocks(instrumentIds, '3M').catch(() => [])
        : Promise.resolve([]),
    ]);
    return {
      pricesByInstrumentId: prices instanceof Map ? prices : new Map(),
      calibrationByInstrumentId: new Map((calibrations as any[]).map((item) => [item.instrumentId, item])),
      dataQualityByInstrumentId: new Map((eligibilityRows as InstrumentEligibilityRow[]).map((row) => [row.instrumentId, row])),
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
    // Prefer calibrated direction (consistent with signalDirection() in the evaluator); fall back to raw.
    const signalDirection = ctx.calibrated?.calibratedDirection ?? ctx.rawSignal?.direction ?? 'NEUTRAL';
    if (signalDirection === 'BEARISH') {
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

    // 4. Portfolio Risk (Weight: 15)
    // Derived from the real holding's unrealized P&L and/or allocation weight.
    // Scoring intent: a deeper drawdown or an over-sized position carries more exit urgency.
    //
    // Field availability logic:
    //   ctx.holding.unrealizedPnLPercent  — present when the holding is loaded (portfolioId set)
    //   ctx.holding.allocationPercent     — present when the holding is loaded
    //
    // If the holding is present but fields are missing/non-finite, we still derive a partial
    // score rather than phantom-inject a constant.
    //
    // If no holding data is available at all (no portfolioId, or the holding was not found in
    // the portfolio), we zero the weight and renormalize: the remaining four dimensions still
    // sum correctly to reflect exit urgency without injecting phantom points.
    const holding = ctx.holding ?? null;
    if (holding !== null) {
      let rawPnl   = typeof holding.unrealizedPnLPercent === 'number' && Number.isFinite(holding.unrealizedPnLPercent)
        ? holding.unrealizedPnLPercent
        : null;
      let rawAlloc = typeof holding.allocationPercent === 'number' && Number.isFinite(holding.allocationPercent)
        ? holding.allocationPercent
        : null;

      // Guard against percent-integer inputs (e.g. -20 instead of -0.20).
      // Thresholds assume the fractional range [-1, 1] for P&L and [0, 1] for allocation.
      // If a value is outside [-1, 1] we treat it as a percent-integer and normalise.
      if (rawPnl !== null && (rawPnl < -1 || rawPnl > 1)) {
        rawPnl = rawPnl / 100;
        warnings.push(`unrealizedPnLPercent appeared to be a percent-integer; normalised to ${rawPnl.toFixed(4)}.`);
      }
      if (rawAlloc !== null && (rawAlloc < 0 || rawAlloc > 1)) {
        rawAlloc = rawAlloc / 100;
        warnings.push(`allocationPercent appeared to be a percent-integer; normalised to ${rawAlloc.toFixed(4)}.`);
      }
      const pnlPct   = rawPnl;
      const allocPct = rawAlloc;

      // P&L sub-score (0–10): deeper loss → higher urgency.
      //   pnlPct < -20% → 10, -10% to -20% → 7, -5% to -10% → 4, 0 to -5% → 2, > 0 → 0
      let pnlScore = 0;
      if (pnlPct !== null) {
        if (pnlPct <= -0.20)      pnlScore = 10;
        else if (pnlPct <= -0.10) pnlScore = 7;
        else if (pnlPct <= -0.05) pnlScore = 4;
        else if (pnlPct <   0)    pnlScore = 2;
        // pnlPct >= 0 → 0 (profitable position has no P&L urgency contribution)
        reasons.push(`Holding unrealized P&L: ${(pnlPct * 100).toFixed(1)}%.`);
      }

      // Allocation sub-score (0–5): over-sized position adds concentration risk.
      //   allocationPct > 15% → 5, 10–15% → 3, 5–10% → 1, ≤ 5% → 0
      let allocScore = 0;
      if (allocPct !== null) {
        if      (allocPct > 0.15) allocScore = 5;
        else if (allocPct > 0.10) allocScore = 3;
        else if (allocPct > 0.05) allocScore = 1;
      }

      portfolioRiskScore = pnlScore + allocScore; // 0–15, no phantom constant
      if (pnlPct === null && allocPct === null) {
        // Holding present but fields genuinely unavailable — zero weight, document the gap.
        portfolioRiskScore = 0;
        dataGaps.push('Holding found but unrealizedPnLPercent and allocationPercent are unavailable; portfolio-risk sub-score zeroed.');
      }
    } else {
      // No holding context available (no portfolioId or instrument not in portfolio).
      // Zero the weight; do NOT inject a phantom constant.
      portfolioRiskScore = 0;
      dataGaps.push('No holding data available; portfolio-risk sub-score zeroed (not phantom-scored).');
    }

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
    frameworkMetadata: Partial<Pick<StrategyDecisionDto, 'strategyName' | 'strategyVersion' | 'frameworkBacked' | 'frameworkDecision' | 'frameworkAction' | 'entryRulesPassed' | 'exitRulesTriggered' | 'invalidationRulesTriggered' | 'noiseFiltersTriggered' | 'strategyRating' | 'readinessLabel' | 'strategyDefinitionSource' | 'strategyDefinitionDrift'>> = {}
  ): StrategyDecisionDto {
    const invalidationRules = [
      'Market gate closes (CLOSED status).',
      'Data quality becomes NOT_READY.'
    ];
    const exitRules = [];
    const frameworkInvalidationRules = frameworkMetadata.invalidationRulesTriggered || [];
    
    if (strategy === 'TREND_MOMENTUM' || strategy === 'PULLBACK_IN_UPTREND') {
      invalidationRules.push('Price closes below SMA50 for 2 consecutive days.');
      invalidationRules.push('Calibrated score drops below 40.');
      exitRules.push('Exit condition met: momentum evidence weakened.');
      exitRules.push('Risk review required when smart money status turns to DISTRIBUTION.');
    }
    for (const rule of frameworkInvalidationRules) {
      invalidationRules.push(`Strategy Framework invalidation rule triggered: ${rule}.`);
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

    const shouldIncludeRiskPlan = Boolean((entryZoneType && sma50) || frameworkInvalidationRules.length > 0);
    const riskPlan = shouldIncludeRiskPlan ? {
      stopLoss: entryZoneType && sma50 ? (sma50 * 0.96).toFixed(2) : 'Not applicable; framework invalidation evidence only.',
      targetPrice: null,
      targetPriceCompatibilityNote: 'Deprecated compatibility field. Strategy Decision uses rule-based exit and invalidation review.',
      rewardRiskRatio: null,
      riskReviewLevel: this.riskReviewLevel(decision, blockers, warnings, dataGaps),
      rationale: entryZoneType && sma50
        ? 'Risk review uses SMA50 support, market gate, data quality, calibrated score, and smart-money evidence. Exit and invalidation are rule-based review conditions.'
        : 'Risk review uses Strategy Framework invalidation evidence. No projected outcome is produced.',
      reasonSummary: 'Candidate review is based on rule evidence.',
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

  private async strategiesForRequest(request: StrategyEvaluateRequest): Promise<StrategyName[]> {
    if (request.strategy !== 'ALL') return [request.strategy];
    return (await this.reviewStrategyDefinitions()).map((strategy) => strategy.code);
  }

  private async reviewStrategyDefinitions() {
    return (await this.strategyFrameworkService.list({})).filter((strategy) => this.isReviewStrategy(strategy));
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

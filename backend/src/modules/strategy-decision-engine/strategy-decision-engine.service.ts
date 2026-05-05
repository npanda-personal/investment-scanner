import { MarketDataFoundationService } from '../market-data-foundation';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { DataQualityEngineService } from '../data-quality-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { PortfolioManagementService } from '../portfolio-management';
import { WatchlistManagementService } from '../watchlist-management';
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
} from './strategy-decision-engine.types';

const MODEL_VERSION = 'strategy-decision-v1';

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
    private readonly watchlistService = new WatchlistManagementService()
  ) {}

  async marketGate(region?: string): Promise<MarketGateResponse> {
    const [summary, regime, breadth] = await Promise.all([
      this.contextService.summary({ region }),
      this.contextService.regime(),
      this.contextService.breadth(),
    ]);

    const reasons: string[] = [];
    const blockers: string[] = [];
    let marketCondition: MarketCondition = 'UNKNOWN';
    let marketGate: MarketGate = 'UNKNOWN';
    let allowedActions: AllowedAction[] = ['MANAGE_EXISTING_POSITIONS_ONLY'];

    if (summary.dataStatus === 'MISSING') {
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

    const score = regime.score;
    const isRiskOn = regime.regime === 'RISK_ON';
    const isRiskOff = regime.regime === 'RISK_OFF';
    const breadthAbove50 = breadth.percentAboveSma50 ?? 0;

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
      dataStatus: summary.dataStatus,
      updatedAt: new Date().toISOString(),
    };
  }

  async evaluate(request: StrategyEvaluateRequest): Promise<StrategyEvaluateResponse> {
    const started = Date.now();
    const allInstrumentIds = await this.resolveUniverse(request);
    
    const batchSize = request.batchSize || 25;
    const offset = request.offset || 0;
    const instrumentIds = allInstrumentIds.slice(offset, offset + batchSize);
    
    const results: StrategyDecisionDto[] = [];
    const gate = await this.marketGate(request.region);

    // Controlled concurrency: Process 5 instruments at a time
    const concurrency = 5;
    for (let i = 0; i < instrumentIds.length; i += concurrency) {
      const chunk = instrumentIds.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(async (instrumentId) => {
        try {
          let strategies: StrategyName[] = [];
          if (request.strategy === 'ALL') {
            strategies = ['TREND_MOMENTUM', 'PULLBACK_IN_UPTREND'];
            if (request.portfolioId) strategies.push('DEFENSIVE_EXIT');
          } else {
            strategies = [request.strategy];
          }

          const instrumentResults: StrategyDecisionDto[] = [];
          for (const strategy of strategies) {
            const decision = await this.evaluateInstrumentStrategy(instrumentId, strategy, gate, request.portfolioId);
            if (decision) {
              const persisted = await this.repository.create(decision);
              instrumentResults.push(persisted);
            }
          }
          return instrumentResults;
        } catch (error: any) {
          console.error(`Evaluation failed for ${instrumentId}:`, error);
          return [];
        }
      }));

      const chunkResultsFlattened = chunkResults.flat();
      results.push(...chunkResultsFlattened);
    }

    const totalCount = allInstrumentIds.length;
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
      failedCount: 0,
      warnings: [],
      durationMs: Date.now() - started,
      results,
    };
  }

  async candidates(query: StrategyQuery) {
    return this.repository.candidates(query);
  }

  async exits(portfolioId?: string, region?: string) {
    return this.repository.exits(portfolioId, region);
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
    return {
      modelVersion: MODEL_VERSION,
      strategies: [
        {
          name: 'TREND_MOMENTUM',
          description: 'High-confidence momentum plays in strong markets.',
          thresholds: { tradeCandidate: 80, watch: 60, wait: 40 },
          weights: {
            marketContext: 20,
            signalStrength: 30,
            trendTechnical: 20,
            dataQuality: 15,
            sectorSmartMoney: 15
          }
        },
        {
          name: 'PULLBACK_IN_UPTREND',
          description: 'Entry candidates near SMA50 support in confirmed uptrends.',
          thresholds: { tradeCandidate: 75, watch: 50 },
          weights: {
            marketContext: 20,
            trendTechnical: 25,
            pullbackQuality: 20,
            dataQuality: 20,
            sectorSmartMoney: 15
          }
        },
        {
          name: 'DEFENSIVE_EXIT',
          description: 'Identifies high-risk holdings for review.',
          thresholds: { exitCandidate: 75, reduceRisk: 45, watch: 25 },
          weights: {
            bearishSignalReliability: 30,
            trendBreakdown: 25,
            marketSectorWeakness: 20,
            portfolioRisk: 15,
            smartMoneyDataWarnings: 10
          }
        },
      ],
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
    const [instrument, pricesRes, rawSignal, calibrated, quality, smartMoney] = await Promise.all([
      this.marketDataService.getInstrument(instrumentId),
      this.marketDataService.listPricesByInstrumentId(instrumentId, 300),
      this.signalService.latestForInstrument(instrumentId),
      this.calibrationService.latestForInstrument(instrumentId),
      this.dataQualityService.diagnostics(instrumentId),
      this.smartMoneyService.stock(instrumentId, '3M'),
    ]);

    if (!instrument || !pricesRes) return null;

    const prices = pricesRes.prices.map(p => Number(p.adjusted_close ?? p.close));
    const sma50 = this.calculateSma(prices, 50);
    const sma200 = this.calculateSma(prices, 200);
    const rsi = this.calculateRsi(prices, 14);
    const latestPrice = prices[0];

    const context = {
      instrument,
      prices,
      latestPrice,
      sma50,
      sma200,
      rsi,
      rawSignal,
      calibrated,
      quality,
      smartMoney,
      gate,
      portfolioId,
    };

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
      blockers.push('Market gate is CLOSED; no new long trades.');
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
    const sectorContext = ctx.sectors.find((s: any) => s.sector === ctx.instrument.sector);
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
    dataGaps: string[]
  ): StrategyDecisionDto {
    const invalidationRules = [
      'Market gate closes (CLOSED status).',
      'Data quality becomes NOT_READY.'
    ];
    const exitRules = [];
    
    if (strategy === 'TREND_MOMENTUM' || strategy === 'PULLBACK_IN_UPTREND') {
      invalidationRules.push('Price closes below SMA50 for 2 consecutive days.');
      invalidationRules.push('Calibrated score drops below 40.');
      exitRules.push('Target price achieved.');
      exitRules.push('Smart money status turns to DISTRIBUTION.');
    }

    const latestPrice = ctx.latestPrice;
    const sma50 = ctx.sma50;
    
    // Trade Plan Preview Generation
    const entryZone = strategy !== 'DEFENSIVE_EXIT' && sma50 ? {
      type: (strategy === 'TREND_MOMENTUM' ? 'BREAKOUT' : 'PULLBACK') as EntryZoneType,
      referencePrice: sma50,
      preferredEntryMin: Number((sma50 * 0.99).toFixed(2)),
      preferredEntryMax: Number((sma50 * 1.02).toFixed(2)),
      rationale: strategy === 'TREND_MOMENTUM' ? 'Enter on strength above SMA50 support.' : 'Enter on successful test of SMA50 support.'
    } : undefined;

    const riskPlan = strategy !== 'DEFENSIVE_EXIT' && sma50 ? {
      stopLoss: (sma50 * 0.96).toFixed(2),
      targetPrice: (latestPrice * 1.15).toFixed(2),
      rewardRiskRatio: 3.5,
      rationale: 'Stop loss placed below SMA50. Target based on 15% standard momentum expectation.',
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
      modelVersion: MODEL_VERSION,
      generatedAt: new Date().toISOString(),
      entryZone,
      riskPlan,
    };
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

  private async resolveUniverse(request: StrategyEvaluateRequest): Promise<string[]> {
    if (request.instrumentId) return [request.instrumentId];
    if (request.symbol) {
      const res = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 1, region: request.region });
      const match = res.instruments.find(i => i.symbol === request.symbol);
      return match ? [match.id] : [];
    }
    if (request.portfolioId) {
      const detail = await this.portfolioService.getPortfolioDetail(request.portfolioId);
      return detail?.holdings.map(h => h.instrumentId) || [];
    }
    if (request.watchlistId) {
      const detail = await this.watchlistService.detail(request.watchlistId);
      return detail?.items.map(i => i.instrumentId) || [];
    }
    // Default: Top signals universe
    const signals = await this.signalService.topSignals({ limit: 50, region: request.region, assetType: request.assetType });
    return signals.signals.map(s => s.instrument_id);
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
}

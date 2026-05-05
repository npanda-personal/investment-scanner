import type { BacktestStrategyConfig } from '../backtesting-strategy-lab';
import type {
  RegisteredBacktestInput,
  StrategyContext,
  StrategyDefinition,
  StrategyEvaluator,
  StrategyPerformanceSummaryDto,
  StrategyRatingGrade,
  StrategySignalOutput,
  StrategyTimeframe,
} from './strategy-framework.types';

const YEARS_BY_TIMEFRAME: Record<StrategyTimeframe, number> = { '1Y': 1, '3Y': 3, '5Y': 5, '10Y': 10, '15Y': 15 };

export class StrategyFrameworkEvaluator implements StrategyEvaluator {
  constructor(private readonly definition: StrategyDefinition) {}

  evaluateSignalCandidate(context: StrategyContext): StrategySignalOutput {
    if (this.definition.category === 'EXIT') return this.evaluateExit(context);
    return this.evaluateEntry(context);
  }

  evaluateEntry(context: StrategyContext): StrategySignalOutput {
    const state = this.baseState(context);
    this.applyCommonNoise(context, state);

    switch (this.definition.code) {
      case 'TREND_MOMENTUM':
        this.scoreTrendMomentum(context, state);
        break;
      case 'PULLBACK_IN_UPTREND':
        this.scorePullback(context, state);
        break;
      case 'BREAKOUT_CONFIRMATION':
        this.scoreBreakout(context, state);
        break;
      case 'QUALITY_TREND':
        this.scoreQualityTrend(context, state);
        break;
      case 'SMART_MONEY_ACCUMULATION':
        this.scoreSmartMoney(context, state);
        break;
      case 'SECTOR_LEADER_MOMENTUM':
        this.scoreSectorLeader(context, state);
        break;
      case 'RISK_OFF_AVOIDANCE':
        this.scoreRiskOff(context, state);
        break;
      case 'MEAN_REVERSION_PULLBACK':
        this.scoreMeanReversion(context, state);
        break;
      case 'LOW_QUALITY_DATA_REJECTION':
        this.scoreDataQualityFilter(context, state);
        break;
      default:
        state.dataGaps.push('Strategy evaluator is not implemented.');
    }

    return this.finish(context, state, false);
  }

  evaluateExit(context: StrategyContext): StrategySignalOutput {
    const state = this.baseState(context);
    this.applyCommonNoise(context, state, { skipClosedMarketBlock: true });

    const bearish = this.signalDirection(context) === 'BEARISH';
    if (bearish) this.add(state, 30, 'Bearish signal is present.', 'BEARISH_SIGNAL', 'exit');
    if (this.isBelow(context.latestPrice, context.sma50)) this.add(state, 25, 'Price is below SMA50.', 'PRICE_BELOW_SMA50', 'exit');
    if (['CLOSED', 'SELECTIVE'].includes(String(context.marketGate || ''))) this.add(state, 20, `Market gate is ${context.marketGate}.`, 'WEAK_MARKET', 'exit');
    if (context.smartMoneyStatus === 'DISTRIBUTION') this.add(state, 15, 'Smart-money distribution increases risk level.', 'SMART_MONEY_DISTRIBUTION', 'exit');
    if (!context.holding) state.warnings.push('Holding context is missing; output is a review candidate only.');

    return this.finish(context, state, true);
  }

  getBacktestConfig(input: RegisteredBacktestInput): BacktestStrategyConfig {
    const years = YEARS_BY_TIMEFRAME[input.timeframe];
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - years);
    const entry = String(this.definition.parameters.backtestEntryRule || 'SIGNAL_DIRECTION_BULLISH');
    const exit = String(this.definition.parameters.backtestExitRule || 'PRICE_BELOW_SMA50');
    return {
      strategyCode: this.definition.code,
      strategyVersion: this.definition.version,
      timeframe: input.timeframe,
      region: input.region || 'IN',
      assetType: input.assetType || 'STOCK',
      universe: input.universe || { type: 'ALL' },
      entryRule: { type: entry as any, threshold: 70 },
      exitRule: { type: exit as any, threshold: 40, holdingDays: 45 },
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      initialCapital: input.initialCapital ?? 100000,
      positionSizeType: input.positionSizeType ?? 'EQUAL_WEIGHT',
      fixedAmountPerTrade: input.fixedAmountPerTrade,
      maxPositions: input.maxPositions ?? 10,
      transactionCostPercent: input.transactionCostPercent ?? 0.001,
      useDataQualityFilter: true,
      minSignalReadinessScore: 65,
      excludeNotReady: true,
      excludeIlliquid: true,
      excludeMissingQuality: false,
    } as BacktestStrategyConfig;
  }

  static rate(summary: Omit<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility'>): Pick<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility'> {
    if (summary.tradeCount < 10 || summary.cagr === null || summary.sharpe === null) {
      return { ratingScore: 20, ratingGrade: 'UNPROVEN', automationEligibility: 'NOT_ELIGIBLE' };
    }

    let score = 0;
    score += clamp((summary.cagr + 0.05) * 220, 0, 30);
    score += clamp((0.35 + summary.maxDrawdown) * 80, 0, 20);
    score += clamp((summary.sharpe + 0.2) * 16, 0, 20);
    score += clamp((summary.winRate ?? 0) * 18, 0, 15);
    score += clamp((summary.profitFactor ?? 0) * 5, 0, 10);
    score += summary.tradeCount >= 30 ? 5 : 2;
    const ratingScore = Math.round(clamp(score, 0, 100));
    const ratingGrade: StrategyRatingGrade = ratingScore >= 80 ? 'EXCELLENT' : ratingScore >= 65 ? 'GOOD' : ratingScore >= 45 ? 'AVERAGE' : ratingScore >= 25 ? 'WEAK' : 'UNPROVEN';
    const automationEligibility = ratingGrade === 'EXCELLENT' && summary.tradeCount >= 50 && (summary.maxDrawdown ?? -1) > -0.3
      ? 'LIVE_TRADING_ELIGIBLE_FUTURE'
      : ratingGrade === 'EXCELLENT' || ratingGrade === 'GOOD'
        ? 'PAPER_TRADING_ELIGIBLE'
        : ratingGrade === 'AVERAGE'
          ? 'WATCHLIST_ONLY'
          : 'NOT_ELIGIBLE';
    return { ratingScore, ratingGrade, automationEligibility };
  }

  private scoreTrendMomentum(context: StrategyContext, state: MutableState) {
    if (this.isAbove(context.latestPrice, context.sma50)) this.add(state, 15, 'Price is above SMA50.', 'PRICE_ABOVE_SMA50');
    else state.blockers.push('Price is below SMA50 support.');
    if (this.isAbove(context.latestPrice, context.sma200)) this.add(state, 15, 'Price is above SMA200.', 'PRICE_ABOVE_SMA200');
    else state.blockers.push('Price is below SMA200 trend filter.');
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 20, 'Bullish signal aligns with trend strategy.', 'BULLISH_SIGNAL');
    if (this.signalScore(context) >= 70) this.add(state, 10, 'Signal score is strong enough for review.', 'SIGNAL_STRENGTH');
    this.scoreSectorAndSmartMoney(context, state);
  }

  private scorePullback(context: StrategyContext, state: MutableState) {
    if (this.isAbove(context.sma50, context.sma200) && this.isAbove(context.latestPrice, context.sma200)) this.add(state, 25, 'Long-term uptrend is intact.', 'SMA50_ABOVE_SMA200');
    else state.blockers.push('Stock is not in a confirmed long-term uptrend.');
    const extension = this.extension(context.latestPrice, context.sma50);
    if (extension !== null && Math.abs(extension) <= 0.05) this.add(state, 20, 'Price is near SMA50 support.', 'NEAR_SMA50');
    if (extension !== null && extension > 0.12) this.block(state, 'OVEREXTENDED', 'Price is overextended above SMA50.');
    if (context.rsi !== null && context.rsi !== undefined && context.rsi >= 35 && context.rsi <= 60) this.add(state, 15, 'RSI is in a cooled pullback zone.', 'RSI_COOLED');
    else state.warnings.push('RSI is not in the preferred 35-60 pullback zone.');
    if (['OPEN', 'SELECTIVE'].includes(String(context.marketGate || ''))) this.add(state, 10, 'Market is healthy enough for selective pullbacks.', 'MARKET_HEALTHY');
  }

  private scoreBreakout(context: StrategyContext, state: MutableState) {
    const nearHigh = context.latestPrice && context.high52Week ? context.latestPrice >= context.high52Week * 0.97 : false;
    if (nearHigh) this.add(state, 25, 'Price is near a 52-week high.', 'NEAR_HIGH');
    else state.dataGaps.push('52-week high context is missing or breakout is not present.');
    const latestVolume = context.prices?.[0]?.volume ?? context.bars?.at(-1)?.volume ?? null;
    if (latestVolume && context.averageVolume20 && latestVolume >= context.averageVolume20 * 1.5) this.add(state, 25, 'Volume confirms the breakout.', 'VOLUME_BREAKOUT');
    else state.warnings.push('Volume breakout confirmation is missing.');
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 20, 'Bullish signal confirms breakout direction.', 'BULLISH_SIGNAL');
    const extension = this.extension(context.latestPrice, context.sma50);
    if (extension !== null && extension > 0.18) this.block(state, 'OVEREXTENDED', 'Breakout is too extended above SMA50.');
  }

  private scoreQualityTrend(context: StrategyContext, state: MutableState) {
    if (this.isAbove(context.latestPrice, context.sma50) && this.isAbove(context.latestPrice, context.sma200)) this.add(state, 30, 'Trend is bullish.', 'TREND_UP');
    if (context.rawSignal?.triggered_signals?.some((item) => item.category === 'FUNDAMENTAL')) this.add(state, 20, 'Fundamental inputs are available.', 'FUNDAMENTALS_AVAILABLE');
    else state.dataGaps.push('Fundamental strength is only partially supported in the MVP.');
    if (context.dataQuality?.coverageStatus === 'UNUSABLE') this.block(state, 'POOR_DATA_QUALITY', 'Coverage is unusable.');
  }

  private scoreSmartMoney(context: StrategyContext, state: MutableState) {
    if (context.smartMoneyStatus === 'ACCUMULATION') this.add(state, 35, 'Smart-money accumulation detected.', 'ACCUMULATION');
    else if (context.smartMoneyStatus === 'DISTRIBUTION') this.block(state, 'DISTRIBUTION', 'Smart-money distribution blocks long setup.');
    else state.dataGaps.push('Smart-money accumulation context is missing or neutral.');
    if (this.isAbove(context.latestPrice, context.sma50)) this.add(state, 20, 'Price confirms accumulation above SMA50.', 'PRICE_CONFIRMATION');
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 15, 'Bullish signal supports accumulation setup.', 'BULLISH_SIGNAL');
  }

  private scoreSectorLeader(context: StrategyContext, state: MutableState) {
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 25, 'Stock signal is bullish.', 'BULLISH_SIGNAL');
    if (['LEADING', 'IMPROVING'].includes(String(context.sectorLeadership || ''))) this.add(state, 30, `Sector is ${String(context.sectorLeadership).toLowerCase()}.`, 'SECTOR_LEADING');
    else if (context.sectorLeadership === 'LAGGING') this.block(state, 'SECTOR_LAGGING', 'Sector is lagging.');
    else state.dataGaps.push('Sector leadership context is missing.');
    if ((context.sectorRelativeStrengthScore ?? 0) >= 60) this.add(state, 10, 'Sector relative strength is positive.', 'RELATIVE_STRENGTH');
  }

  private scoreRiskOff(context: StrategyContext, state: MutableState) {
    if (context.marketGate === 'CLOSED' || context.marketRegime === 'RISK_OFF') {
      this.block(state, 'RISK_OFF_MARKET', 'Risk-off or closed market gate blocks new long entries.');
      state.score = 100;
    } else {
      this.add(state, 60, 'Market gate does not block new long entries.', 'MARKET_GATE_CLEAR');
    }
  }

  private scoreMeanReversion(context: StrategyContext, state: MutableState) {
    if (this.isAbove(context.latestPrice, context.sma200)) this.add(state, 20, 'Long-term trend is not broken.', 'NOT_BROKEN_TREND');
    else this.block(state, 'FALLING_KNIFE', 'Price is below SMA200, so mean reversion remains draft/blocked.');
    if (context.rsi !== null && context.rsi !== undefined && context.rsi >= 30 && context.rsi <= 45) this.add(state, 25, 'RSI is in recovery zone.', 'RSI_RECOVERY');
    state.warnings.push('Mean reversion strategy is DRAFT until more historical validation exists.');
  }

  private scoreDataQualityFilter(context: StrategyContext, state: MutableState) {
    if (!context.dataQuality) {
      state.dataGaps.push('Data quality evaluation is missing.');
      return;
    }
    if (context.dataQuality.coverageStatus === 'UNUSABLE') this.block(state, 'COVERAGE_UNUSABLE', 'Coverage is unusable.');
    if (context.dataQuality.signalReadinessStatus === 'NOT_READY') this.block(state, 'READINESS_NOT_READY', 'Signal readiness is not ready.');
    if (context.dataQuality.liquidityStatus === 'ILLIQUID') this.block(state, 'ILLIQUID', 'Instrument is illiquid.');
    if (state.blockers.length === 0) this.add(state, 80, 'Data quality is usable for downstream strategies.', 'DATA_QUALITY_READY');
  }

  private scoreSectorAndSmartMoney(context: StrategyContext, state: MutableState) {
    if (['LEADING', 'IMPROVING'].includes(String(context.sectorLeadership || ''))) this.add(state, 10, 'Sector is supportive.', 'SECTOR_NOT_WEAK');
    else if (['LAGGING', 'WEAKENING'].includes(String(context.sectorLeadership || ''))) this.block(state, 'SECTOR_WEAK', 'Sector context is weak.');
    else state.dataGaps.push('Sector context is missing.');
    if (context.smartMoneyStatus === 'ACCUMULATION') this.add(state, 10, 'Smart-money accumulation supports setup.', 'SMART_MONEY_ACCUMULATION');
    if (context.smartMoneyStatus === 'DISTRIBUTION') this.block(state, 'SMART_MONEY_DISTRIBUTION', 'Smart-money distribution contradicts setup.');
  }

  private applyCommonNoise(context: StrategyContext, state: MutableState, options: { skipClosedMarketBlock?: boolean } = {}) {
    if (!context.latestPrice) state.dataGaps.push('Latest price is missing.');
    if (!context.sma50 && this.requires('sma50')) state.dataGaps.push('SMA50 is missing.');
    if (!context.sma200 && this.requires('sma200')) state.dataGaps.push('SMA200 is missing.');
    if (!context.rawSignal && this.requires('rawSignal')) state.dataGaps.push('Raw signal is missing.');
    if (context.dataQuality?.signalReadinessStatus === 'NOT_READY') this.block(state, 'DATA_NOT_READY', 'Data quality is not ready.');
    if (context.dataQuality?.coverageStatus === 'UNUSABLE') this.block(state, 'COVERAGE_UNUSABLE', 'Data coverage is unusable.');
    if (context.dataQuality?.liquidityStatus === 'ILLIQUID') this.block(state, 'ILLIQUID', 'Liquidity is illiquid.');
    if (!options.skipClosedMarketBlock && context.marketGate === 'CLOSED' && this.definition.category === 'ENTRY') this.block(state, 'MARKET_CLOSED', 'Market gate is closed.');
    if (context.reliability?.status === 'LOW' || context.reliability?.noiseLevel === 'HIGH') this.block(state, 'LOW_RELIABILITY', 'Signal reliability is low/noisy.');
  }

  private finish(context: StrategyContext, state: MutableState, exit: boolean): StrategySignalOutput {
    const score = Math.round(clamp(state.score, 0, 100));
    const hasMissingCore = state.dataGaps.length > 0 && score < 40;
    let decision: StrategySignalOutput['decision'] = 'WAIT';
    if (hasMissingCore) decision = 'INSUFFICIENT_DATA';
    else if (state.blockers.length > 0) decision = this.definition.category === 'FILTER' || this.definition.category === 'GATE' ? 'AVOID' : 'AVOID';
    else if (exit) decision = score >= 60 ? 'EXIT_CANDIDATE' : score >= 40 ? 'REDUCE_RISK' : 'HOLD';
    else if (this.definition.category === 'FILTER' || this.definition.category === 'GATE') decision = score >= 50 ? 'SIGNAL' : 'AVOID';
    else if (score >= Number(this.definition.parameters.minScore ?? 70)) decision = 'ENTRY_CANDIDATE';
    else if (score >= 50) decision = 'WATCH';

    const confidence = state.dataGaps.length > 2 || score < 40 ? 'LOW' : state.warnings.length > 0 || state.dataGaps.length > 0 ? 'MEDIUM' : 'HIGH';
    const direction = exit || this.signalDirection(context) === 'BEARISH' ? 'BEARISH' : score >= 50 ? 'BULLISH' : 'NEUTRAL';
    return {
      strategyCode: this.definition.code,
      strategyVersion: this.definition.version,
      instrumentId: context.instrumentId ?? null,
      symbol: context.symbol ?? null,
      decision,
      direction,
      score,
      confidence,
      reasons: state.reasons,
      blockers: state.blockers,
      warnings: this.definition.status === 'DRAFT' ? ['Strategy is DRAFT and not automation eligible.', ...state.warnings] : state.warnings,
      dataGaps: state.dataGaps,
      entryRulesPassed: state.entryRulesPassed,
      exitRulesTriggered: state.exitRulesTriggered,
      noiseFiltersTriggered: state.noiseFiltersTriggered,
      marketGateStatus: context.marketGate ?? null,
      eligibleForSignalGeneration: ['ENTRY_CANDIDATE', 'WATCH', 'SIGNAL'].includes(decision) && state.blockers.length === 0,
      eligibleForBacktest: !hasMissingCore && this.definition.category !== 'GATE',
      eligibleForAutomationFuture: false,
    };
  }

  private baseState(_context: StrategyContext): MutableState {
    return { score: 0, reasons: [], blockers: [], warnings: [], dataGaps: [], entryRulesPassed: [], exitRulesTriggered: [], noiseFiltersTriggered: [] };
  }

  private add(state: MutableState, score: number, reason: string, rule: string, bucket: 'entry' | 'exit' = 'entry') {
    state.score += score;
    state.reasons.push(reason);
    if (bucket === 'exit') state.exitRulesTriggered.push(rule);
    else state.entryRulesPassed.push(rule);
  }

  private block(state: MutableState, code: string, reason: string) {
    state.blockers.push(reason);
    state.noiseFiltersTriggered.push(code);
  }

  private requires(input: string) {
    return this.definition.requiredInputs.some((item) => item.toLowerCase().includes(input.toLowerCase()));
  }

  private signalScore(context: StrategyContext): number {
    return context.calibratedSignal?.calibratedScore ?? context.rawSignal?.score ?? 0;
  }

  private signalDirection(context: StrategyContext): string {
    return context.calibratedSignal?.calibratedDirection ?? context.rawSignal?.direction ?? 'NEUTRAL';
  }

  private isAbove(left?: number | null, right?: number | null) {
    return typeof left === 'number' && typeof right === 'number' && left > right;
  }

  private isBelow(left?: number | null, right?: number | null) {
    return typeof left === 'number' && typeof right === 'number' && left < right;
  }

  private extension(price?: number | null, reference?: number | null) {
    return typeof price === 'number' && typeof reference === 'number' && reference > 0 ? (price - reference) / reference : null;
  }
}

interface MutableState {
  score: number;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  dataGaps: string[];
  entryRulesPassed: string[];
  exitRulesTriggered: string[];
  noiseFiltersTriggered: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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
      case 'BREAKDOWN_MOMENTUM':
        this.scoreBreakdownMomentum(context, state);
        break;
      default:
        state.dataGaps.push('Strategy evaluator is not implemented.');
    }

    return this.finish(context, state, false);
  }

  evaluateExit(context: StrategyContext): StrategySignalOutput {
    const state = this.baseState(context);
    this.applyCommonNoise(context, state, { skipClosedMarketBlock: true, skipDataQualityBlock: true });

    const bearish = this.signalDirection(context) === 'BEARISH';
    if (bearish) this.add(state, 30, 'Bearish signal is present.', 'BEARISH_SIGNAL', 'exit');
    if (this.isBelow(context.latestPrice, context.sma50)) this.add(state, 25, 'Price is below SMA50.', 'PRICE_BELOW_SMA50', 'exit');
    if (['CLOSED', 'SELECTIVE'].includes(String(context.marketGate || ''))) this.add(state, 20, `Market gate is ${context.marketGate}.`, 'WEAK_MARKET', 'exit');
    if (context.smartMoneyStatus === 'DISTRIBUTION') this.add(state, 15, 'Smart-money distribution increases risk level.', 'SMART_MONEY_DISTRIBUTION', 'exit');
    this.evaluateCommonLongExit(context, state);
    if (!context.holding) {
      state.warnings.push('Holding context is missing; output is a review candidate only.');
      if (this.definition.category === 'EXIT' && state.score >= 60) state.score = 55;
    }

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
      mode: 'REGISTERED_STRATEGY',
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
      slippagePercent: input.slippagePercent ?? 0,
      maxHoldingDays: input.maxHoldingDays ?? numericParameter(this.definition.parameters.maxHoldingDays),
      stopLossPercent: input.stopLossPercent ?? numericParameter(this.definition.parameters.stopLossPercent),
      trailingStopPercent: input.trailingStopPercent ?? numericParameter(this.definition.parameters.trailingStopPercent),
      useDataQualityFilter: true,
      minSignalReadinessScore: 65,
      excludeNotReady: true,
      excludeIlliquid: true,
      excludeMissingQuality: true,
    } as BacktestStrategyConfig;
  }

  static rate(summary: Omit<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility' | 'readinessLabel' | 'ratingReasons' | 'ratingWarnings' | 'ratingCapsApplied'> & { dataCoverageScore?: number; strategyStatus?: string }): Pick<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility' | 'readinessLabel' | 'ratingReasons' | 'ratingWarnings' | 'ratingCapsApplied'> {
    const ratingReasons: string[] = [];
    const ratingWarnings: string[] = [];
    const ratingCapsApplied: string[] = [];
    if (summary.tradeCount < 10 || summary.cagr === null || summary.sharpe === null) {
      if (summary.tradeCount < 10) ratingReasons.push('Too few completed trades for a proven rating.');
      if (summary.cagr === null) ratingReasons.push('CAGR is unavailable.');
      if (summary.sharpe === null) ratingReasons.push('Sharpe is unavailable.');
      ratingCapsApplied.push('UNPROVEN_SAMPLE_OR_METRICS');
      return { ratingScore: 20, ratingGrade: 'UNPROVEN', automationEligibility: 'NOT_ELIGIBLE', readinessLabel: 'RESEARCH_ONLY', ratingReasons, ratingWarnings, ratingCapsApplied };
    }

    let score = 0;
    score += clamp((summary.cagr + 0.05) * 220, 0, 30);
    score += clamp((0.35 + summary.maxDrawdown) * 80, 0, 20);
    score += clamp((summary.sharpe + 0.2) * 16, 0, 20);
    score += clamp((summary.winRate ?? 0) * 18, 0, 15);
    score += clamp((summary.profitFactor ?? 0) * 5, 0, 10);
    score += summary.tradeCount >= 30 ? 5 : 2;
    score += clamp(((summary as any).dataCoverageScore ?? 1) * 5, 0, 5);
    if (summary.maxDrawdown <= -0.35) {
      score -= 15;
      ratingReasons.push('High drawdown penalized the rating.');
      ratingWarnings.push('Max drawdown exceeded the severe threshold.');
    }
    if (summary.tradeCount < 30) ratingReasons.push('Sample size is moderate; rating remains conservative.');
    const coverage = summary.dataCoveragePercent ?? ((summary as any).dataCoverageScore ?? 1);
    if (coverage < 0.8) {
      ratingReasons.push('Partial data coverage reduced confidence.');
      ratingWarnings.push('Data coverage is below the preferred threshold.');
    }
    if ((summary.excessCagr ?? 0) < -0.02) {
      score -= 12;
      ratingReasons.push('Strategy materially underperformed the benchmark baseline.');
      ratingWarnings.push('Benchmark underperformance capped confidence.');
    }
    if ((summary.endOfTestExitPercent ?? 0) >= 0.4) {
      score -= 10;
      ratingReasons.push('Many trades exited only at end of test, suggesting weak exit rules.');
      ratingWarnings.push('End-of-test exits are too dominant.');
    }
    if ((summary.averageHoldingDays ?? 0) > 252) {
      score -= 8;
      ratingReasons.push('Average holding period is high for a daily swing strategy.');
    }
    if ((summary.exposurePercent ?? 0.5) < 0.05) {
      score -= 5;
      ratingWarnings.push('Low exposure suggests the strategy may be inactive.');
    }
    const ratingScore = Math.round(clamp(score, 0, 100));
    let ratingGrade: StrategyRatingGrade = ratingScore >= 80 ? 'EXCELLENT' : ratingScore >= 65 ? 'GOOD' : ratingScore >= 45 ? 'AVERAGE' : ratingScore >= 25 ? 'WEAK' : 'UNPROVEN';
    if (summary.strategyStatus === 'DRAFT') {
      ratingGrade = capGrade(ratingGrade, 'UNPROVEN');
      ratingCapsApplied.push('DRAFT_STRATEGY_UNPROVEN');
    }
    if (summary.tradeCount < 20) {
      ratingGrade = capGrade(ratingGrade, 'UNPROVEN');
      ratingCapsApplied.push('LOW_TRADE_COUNT_UNPROVEN');
    } else if (summary.tradeCount < 30) {
      ratingGrade = capGrade(ratingGrade, 'AVERAGE');
      ratingCapsApplied.push('MODERATE_TRADE_COUNT_AVERAGE');
    }
    if (coverage < 0.5) {
      ratingGrade = capGrade(ratingGrade, 'UNPROVEN');
      ratingCapsApplied.push('POOR_DATA_COVERAGE_UNPROVEN');
    } else if (coverage < 0.8) {
      ratingGrade = capGrade(ratingGrade, 'WEAK');
      ratingCapsApplied.push('PARTIAL_DATA_COVERAGE_WEAK');
    }
    if (summary.maxDrawdown <= -0.45) {
      ratingGrade = capGrade(ratingGrade, 'WEAK');
      ratingCapsApplied.push('SEVERE_DRAWDOWN_WEAK');
    } else if (summary.maxDrawdown <= -0.3) {
      ratingGrade = capGrade(ratingGrade, 'AVERAGE');
      ratingCapsApplied.push('HIGH_DRAWDOWN_AVERAGE');
    }
    if ((summary.excessCagr ?? 0) < -0.05) {
      ratingGrade = capGrade(ratingGrade, 'WEAK');
      ratingCapsApplied.push('BENCHMARK_UNDERPERFORMANCE_WEAK');
    }
    if ((summary.endOfTestExitPercent ?? 0) >= 0.6) {
      ratingGrade = capGrade(ratingGrade, 'WEAK');
      ratingCapsApplied.push('END_OF_TEST_EXIT_DOMINANCE_WEAK');
    }
    const automationEligibility = ratingGrade === 'EXCELLENT' || ratingGrade === 'GOOD'
        ? 'PAPER_TEST_CANDIDATE'
        : ratingGrade === 'AVERAGE'
          ? 'WATCHLIST_ONLY'
          : 'NOT_ELIGIBLE';
    const readinessLabel = (ratingGrade === 'EXCELLENT' || ratingGrade === 'GOOD') && summary.tradeCount >= 30 && summary.maxDrawdown > -0.3
      ? 'PAPER_TEST_CANDIDATE'
      : ratingGrade === 'AVERAGE'
        ? 'WATCHLIST_CANDIDATE'
        : ratingGrade === 'UNPROVEN'
          ? 'RESEARCH_ONLY'
          : 'NOT_AUTOMATION_READY';
    if (ratingReasons.length === 0) ratingReasons.push('Rating combines return, drawdown, Sharpe, win rate, profit factor, sample size, and data coverage.');
    return { ratingScore, ratingGrade, automationEligibility, readinessLabel, ratingReasons, ratingWarnings, ratingCapsApplied };
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
    if (extension !== null && extension >= 0 && extension <= 0.05) this.add(state, 20, 'Price is near SMA50 support after reclaim.', 'NEAR_SMA50');
    else if (extension !== null && extension < 0) this.block(state, 'RECLAIM_FAILED', 'Price remains below SMA50; pullback reclaim is not confirmed.');
    if (extension !== null && extension > 0.12) this.block(state, 'OVEREXTENDED', 'Price is overextended above SMA50.');
    if (this.isAbove(context.latestPrice, context.sma50)) this.add(state, 15, 'Price has reclaimed SMA50.', 'RECLAIM_SMA50');
    if (this.isAbove(context.latestPrice, context.previousClose)) this.add(state, 10, 'Latest close confirms a bounce from the pullback.', 'BOUNCE_CONFIRMATION');
    else state.warnings.push('Bounce confirmation is missing.');
    if (context.rsi !== null && context.rsi !== undefined && context.rsi >= 40 && context.rsi <= 65) this.add(state, 15, 'RSI has recovered into the preferred pullback-reclaim zone.', 'RSI_RECOVERY');
    else state.warnings.push('RSI has not recovered into the preferred 40-65 pullback-reclaim zone.');
    if (['OPEN', 'SELECTIVE'].includes(String(context.marketGate || ''))) this.add(state, 10, 'Market is healthy enough for selective pullbacks.', 'MARKET_HEALTHY');
  }

  private scoreBreakout(context: StrategyContext, state: MutableState) {
    const bars = context.bars || [];
    if (bars.length >= 20) this.add(state, 15, 'Multi-week base evidence is available before breakout.', 'BASE_DURATION_CONFIRMED');
    else state.dataGaps.push('Breakout base duration evidence is missing.');
    if (this.hasVolatilityContraction(bars)) this.add(state, 15, 'Recent range contraction supports the breakout setup.', 'VOLATILITY_CONTRACTION');
    else state.warnings.push('Volatility contraction evidence is missing or weak.');
    const priorHigh = bars.length > 1 ? Math.max(...bars.slice(1, 252).map((bar) => bar.close)) : null;
    const clearsResistance = typeof context.latestPrice === 'number' && typeof priorHigh === 'number'
      ? context.latestPrice > priorHigh
      : Boolean(context.latestPrice && context.high52Week && context.latestPrice >= context.high52Week * 0.99);
    if (clearsResistance) this.add(state, 20, 'Close clears prior resistance/high.', 'RESISTANCE_CLOSE');
    else state.dataGaps.push('Resistance-close breakout evidence is missing or not confirmed.');
    const latestVolume = context.prices?.[0]?.volume ?? context.bars?.[0]?.volume ?? null;
    if (latestVolume && context.averageVolume20 && latestVolume >= context.averageVolume20 * 1.5) this.add(state, 25, 'Volume confirms the breakout.', 'VOLUME_BREAKOUT');
    else state.warnings.push('Volume breakout confirmation is missing.');
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 20, 'Bullish signal confirms breakout direction.', 'BULLISH_SIGNAL');
    this.requireContext(context, state, 'sectorLeadership', 'SECTOR_CONTEXT_MISSING', 'Sector leadership context is missing for breakout confirmation.');
    this.requireContext(context, state, 'sectorRelativeStrengthScore', 'SECTOR_RS_MISSING', 'Sector relative-strength score is missing for breakout confirmation.');
    this.requireContext(context, state, 'smartMoneyStatus', 'SMART_MONEY_CONTEXT_MISSING', 'Smart-money context is missing for breakout confirmation.');
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
    if (context.smartMoneyStatus === 'ACCUMULATION') this.add(state, 30, 'Price-volume accumulation detected.', 'ACCUMULATION');
    else if (context.smartMoneyStatus === 'DISTRIBUTION') this.block(state, 'DISTRIBUTION', 'Smart-money distribution blocks long setup.');
    else state.dataGaps.push('Smart-money accumulation context is missing or neutral.');
    if (typeof context.smartMoneyScore === 'number' && context.smartMoneyScore >= 70) this.add(state, 20, 'Price-volume accumulation score is strong enough.', 'SMART_MONEY_SCORE_READY');
    else this.block(state, 'INSUFFICIENT_SMART_MONEY_DATA', 'Smart-money score is missing or below the evidence threshold.');
    if (this.isAbove(context.latestPrice, context.sma50)) this.add(state, 20, 'Price confirms accumulation above SMA50.', 'PRICE_CONFIRMATION');
    if (typeof context.averageVolume20 === 'number' && context.averageVolume20 > 0) this.add(state, 10, 'Recent volume context is available.', 'VOLUME_CONTEXT_READY');
    else state.dataGaps.push('Recent volume context is missing for smart-money review.');
  }

  private scoreSectorLeader(context: StrategyContext, state: MutableState) {
    if (this.signalDirection(context) === 'BULLISH') this.add(state, 25, 'Stock signal is bullish.', 'BULLISH_SIGNAL');
    if (this.isAbove(context.latestPrice, context.sma50)) this.add(state, 15, 'Price is above SMA50.', 'PRICE_ABOVE_SMA50');
    else state.blockers.push('Price is below SMA50, so relative-strength continuation is not confirmed.');
    if (this.isAbove(context.latestPrice, context.sma200)) this.add(state, 15, 'Price is above SMA200.', 'PRICE_ABOVE_SMA200');
    else state.blockers.push('Price is below SMA200 trend filter.');
    if (['LEADING', 'IMPROVING'].includes(String(context.sectorLeadership || ''))) this.add(state, 25, `Sector is ${String(context.sectorLeadership).toLowerCase()}.`, 'SECTOR_LEADING');
    else if (context.sectorLeadership === 'LAGGING') this.block(state, 'SECTOR_LAGGING', 'Sector is lagging.');
    else state.dataGaps.push('Sector leadership context is missing.');
    if ((context.sectorRelativeStrengthScore ?? 0) >= 60) this.add(state, 15, 'Sector relative strength is positive.', 'RELATIVE_STRENGTH');
    else state.dataGaps.push('Sector relative-strength score is missing or below threshold.');
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
    if (context.dataQuality.liquidityStatus === 'THIN') this.block(state, 'THIN_LIQUIDITY', 'Liquidity is thin.');
    if (!context.dataQuality.liquidityStatus || context.dataQuality.liquidityStatus === 'UNKNOWN') this.block(state, 'LIQUIDITY_UNKNOWN', 'Liquidity evidence is unknown.');
    if (state.blockers.length === 0) this.add(state, 80, 'Data quality is usable for downstream strategies.', 'DATA_QUALITY_READY');
  }

  /**
   * SHORT_ENTRY: Breakdown Momentum
   *
   * Mirror of scoreTrendMomentum but for bearish setups.
   * F&O gate: the `derivativesEligible` field on the context is treated as a noise filter.
   * Language: entry/stop/cover — no buy/sell wording.
   */
  private scoreBreakdownMomentum(context: StrategyContext, state: MutableState) {
    // F&O gate: derivativesEligible must be explicitly true; block cash-only instruments
    const derivativesEligible = (context as any).derivativesEligible;
    if (derivativesEligible === false) {
      this.block(state, 'NOT_DERIVATIVES_ELIGIBLE', 'Cash-only (non-derivatives-eligible) instrument cannot be short-reviewed.');
      return;
    }
    // When derivativesEligible is undefined/null (not provided), block as well — short review requires explicit F&O eligibility
    if (derivativesEligible == null) {
      this.block(state, 'NOT_DERIVATIVES_ELIGIBLE', 'Derivatives eligibility is not confirmed; short-review requires F&O-eligible instruments.');
      return;
    }

    // Downtrend evidence
    if (this.isBelow(context.latestPrice, context.sma50)) this.add(state, 15, 'Price is below SMA50 — downtrend evidence.', 'PRICE_BELOW_SMA50');
    else state.blockers.push('Price is above SMA50; downtrend evidence is absent for short-review.');
    if (this.isBelow(context.latestPrice, context.sma200)) this.add(state, 15, 'Price is below SMA200 — long-term downtrend confirmation.', 'PRICE_BELOW_SMA200');
    else state.warnings.push('Price is above SMA200; long-term downtrend is not confirmed.');
    // Bearish signal
    if (this.signalDirection(context) === 'BEARISH') this.add(state, 20, 'Bearish signal aligns with breakdown strategy.', 'BEARISH_SIGNAL');
    if (this.signalScore(context) >= 70) this.add(state, 10, 'Signal score is strong enough for short-review.', 'SIGNAL_STRENGTH');
    // Sector and smart money context
    this.scoreShortSectorAndSmartMoney(context, state);
  }

  private scoreShortSectorAndSmartMoney(context: StrategyContext, state: MutableState) {
    // For shorts, lagging sector supports setup; leading sector contradicts it
    if (['LAGGING', 'WEAKENING'].includes(String(context.sectorLeadership || ''))) {
      this.add(state, 10, 'Sector is lagging or weakening — supports short-review setup.', 'SECTOR_NOT_LEADING');
    } else if (['LEADING', 'IMPROVING'].includes(String(context.sectorLeadership || ''))) {
      state.warnings.push('Sector is leading or improving, which contradicts the short-review setup.');
    } else {
      state.dataGaps.push('Sector context is missing.');
      this.block(state, 'SECTOR_CONTEXT_MISSING', 'Sector context is missing.');
    }
    // Distribution supports short; accumulation blocks it
    if (context.smartMoneyStatus === 'DISTRIBUTION') {
      this.add(state, 10, 'Smart-money distribution supports short-review setup.', 'SMART_MONEY_DISTRIBUTION');
    } else if (context.smartMoneyStatus === 'ACCUMULATION') {
      this.block(state, 'ACCUMULATION', 'Smart-money accumulation contradicts short-entry setup.');
    } else if (!context.smartMoneyStatus) {
      state.dataGaps.push('Smart-money context is missing.');
      this.block(state, 'SMART_MONEY_CONTEXT_MISSING', 'Smart-money context is missing.');
    }
  }

  private scoreSectorAndSmartMoney(context: StrategyContext, state: MutableState) {
    if (['LEADING', 'IMPROVING'].includes(String(context.sectorLeadership || ''))) this.add(state, 10, 'Sector is supportive.', 'SECTOR_NOT_WEAK');
    else if (['LAGGING', 'WEAKENING'].includes(String(context.sectorLeadership || ''))) this.block(state, 'SECTOR_WEAK', 'Sector context is weak.');
    else {
      state.dataGaps.push('Sector context is missing.');
      this.block(state, 'SECTOR_CONTEXT_MISSING', 'Sector context is missing.');
    }
    if (context.smartMoneyStatus === 'ACCUMULATION') this.add(state, 10, 'Smart-money accumulation supports setup.', 'SMART_MONEY_ACCUMULATION');
    if (context.smartMoneyStatus === 'DISTRIBUTION') this.block(state, 'SMART_MONEY_DISTRIBUTION', 'Smart-money distribution contradicts setup.');
    if (!context.smartMoneyStatus) {
      state.dataGaps.push('Smart-money context is missing.');
      this.block(state, 'SMART_MONEY_CONTEXT_MISSING', 'Smart-money context is missing.');
    }
  }

  private requireContext(context: StrategyContext, state: MutableState, key: keyof StrategyContext, code: string, message: string) {
    if (context[key] === null || context[key] === undefined || context[key] === '') {
      state.dataGaps.push(message);
      this.block(state, code, message);
    }
  }

  private evaluateCommonLongExit(context: StrategyContext, state: MutableState) {
    if (!context.dataQuality || context.dataQuality.signalReadinessStatus === 'NOT_READY' || context.dataQuality.coverageStatus === 'UNUSABLE') {
      this.addInvalidation(state, 'DQ_EVIDENCE_INVALIDATED', 'Data quality deterioration invalidates trusted long-entry evidence.');
      this.add(state, 20, 'Data quality deterioration requires exit review.', 'DQ_FAIL_EXIT', 'exit');
    }
    if (context.marketGate === 'CLOSED' || context.marketRegime === 'RISK_OFF') {
      this.addInvalidation(state, 'MARKET_GATE_INVALIDATED', 'Market gate deterioration invalidates new long-entry review.');
      this.add(state, 20, 'Market gate or regime has turned risk-off.', 'MARKET_RISK_OFF_EXIT', 'exit');
    }
    const latestBelowSma50 = this.isBelow(context.latestPrice, context.sma50);
    const previousBelowSma50 = typeof context.sma50 === 'number' && typeof context.previousClose === 'number' && context.previousClose < context.sma50;
    if (latestBelowSma50 && previousBelowSma50) {
      this.addInvalidation(state, 'SUPPORT_INVALIDATED', 'Two-bar support loss invalidates the active long setup.');
      this.add(state, 25, 'Two-bar structural break below SMA50 is present.', 'STRUCTURAL_BREAK_EXIT', 'exit');
    }
    if (['LAGGING', 'WEAKENING'].includes(String(context.sectorLeadership || '')) || (typeof context.sectorRelativeStrengthScore === 'number' && context.sectorRelativeStrengthScore < 45)) {
      this.add(state, 15, 'Relative strength or sector context has decayed.', 'RELATIVE_STRENGTH_DECAY_EXIT', 'exit');
    }
    if (context.smartMoneyStatus === 'DISTRIBUTION') {
      this.addInvalidation(state, 'DISTRIBUTION_EXIT', 'Distribution invalidates the accumulation thesis.');
      this.add(state, 15, 'Distribution warning is active.', 'DISTRIBUTION_WARNING_EXIT', 'exit');
    }
    if (this.signalScore(context) > 0 && this.signalScore(context) < 45) {
      this.add(state, 15, 'Signal score has decayed below review threshold.', 'SIGNAL_DECAY_EXIT', 'exit');
    }
  }

  private applyCommonNoise(context: StrategyContext, state: MutableState, options: { skipClosedMarketBlock?: boolean; skipDataQualityBlock?: boolean } = {}) {
    if (!context.latestPrice && (this.definition.category === 'ENTRY' || this.definition.category === 'EXIT' || this.requires('latestPrice'))) state.dataGaps.push('Latest price is missing.');
    if (!context.sma50 && this.requires('sma50')) state.dataGaps.push('SMA50 is missing.');
    if (!context.sma200 && this.requires('sma200')) state.dataGaps.push('SMA200 is missing.');
    if (!context.rawSignal && this.requires('rawSignal')) state.dataGaps.push('Raw signal is missing.');
    if (!options.skipDataQualityBlock && (this.definition.category === 'ENTRY' || this.requires('dataQuality'))) {
      if (!context.dataQuality) this.block(state, 'DATA_QUALITY_MISSING', 'Data quality evaluation is missing.');
      if (context.dataQuality && !context.dataQuality.signalReadinessStatus) this.block(state, 'DATA_QUALITY_MISSING', 'Data quality readiness evidence is missing.');
      if (context.dataQuality?.signalReadinessStatus !== undefined && context.dataQuality.signalReadinessStatus !== 'READY') this.block(state, 'DATA_NOT_READY', `Data quality readiness is ${context.dataQuality.signalReadinessStatus}.`);
      if (context.dataQuality && context.dataQuality.eligibleForSignals !== true) this.block(state, context.dataQuality.eligibleForSignals === false ? 'DATA_NOT_READY' : 'DATA_QUALITY_MISSING', context.dataQuality.eligibleForSignals === false ? 'Data quality marks this instrument ineligible for signals.' : 'Data quality signal eligibility evidence is missing.');
    }
    if (!options.skipDataQualityBlock && context.dataQuality?.coverageStatus === 'UNUSABLE') this.block(state, 'COVERAGE_UNUSABLE', 'Data coverage is unusable.');
    if (!options.skipDataQualityBlock && context.dataQuality?.liquidityStatus === 'ILLIQUID') this.block(state, 'ILLIQUID', 'Liquidity is illiquid.');
    if (!options.skipDataQualityBlock && this.definition.category === 'ENTRY') {
      const marketGate = String(context.marketGate || 'UNKNOWN').toUpperCase();
      if (marketGate === 'UNKNOWN') this.block(state, 'MARKET_GATE_UNKNOWN', 'Market gate context is unknown.');
      const liquidity = String(context.dataQuality?.liquidityStatus || 'UNKNOWN').toUpperCase();
      if (liquidity === 'UNKNOWN') this.block(state, 'LIQUIDITY_UNKNOWN', 'Liquidity context is unknown.');
      if (liquidity === 'THIN') this.block(state, 'THIN_LIQUIDITY', 'Liquidity is thin.');
      this.requireDeclaredInput(context, state, 'marketRegime', 'MARKET_REGIME_MISSING', 'Market regime context is missing.');
      this.requireDeclaredInput(context, state, 'sectorLeadership', 'SECTOR_CONTEXT_MISSING', 'Sector leadership context is missing.');
      this.requireDeclaredInput(context, state, 'sectorRelativeStrengthScore', 'SECTOR_RS_MISSING', 'Sector relative-strength score is missing.');
      this.requireDeclaredInput(context, state, 'smartMoneyStatus', 'SMART_MONEY_CONTEXT_MISSING', 'Smart-money context is missing.');
    }
    if (!options.skipClosedMarketBlock && context.marketGate === 'CLOSED' && this.definition.category === 'ENTRY') this.block(state, 'MARKET_CLOSED', 'Market gate is closed.');
    if (context.reliability?.status === 'LOW' || context.reliability?.noiseLevel === 'HIGH') this.block(state, 'LOW_RELIABILITY', 'Signal reliability is low/noisy.');
  }

  private finish(context: StrategyContext, state: MutableState, exit: boolean): StrategySignalOutput {
    const score = Math.round(clamp(state.score, 0, 100));
    const hasMissingCore = state.dataGaps.length > 0 && score < 40;
    let decision: StrategySignalOutput['decision'] = 'WAIT';
    if (hasMissingCore) decision = 'INSUFFICIENT_DATA';
    else if (state.blockers.length > 0) decision = 'AVOID';
    else if (exit) decision = score >= 60 ? 'EXIT_CANDIDATE' : score >= 40 ? 'REDUCE_RISK' : 'HOLD';
    else if (this.definition.category === 'FILTER' || this.definition.category === 'GATE') decision = 'WAIT';
    else if (this.definition.category === 'ENTRY' && state.dataGaps.length > 0) decision = score >= 50 ? 'WATCH' : 'INSUFFICIENT_DATA';
    else if (score >= Number(this.definition.parameters.minScore ?? 70)) decision = 'ENTRY_CANDIDATE';
    else if (score >= 50) decision = 'WATCH';

    const confidence = state.dataGaps.length > 2 || score < 40 ? 'LOW' : state.warnings.length > 0 || state.dataGaps.length > 0 ? 'MEDIUM' : 'HIGH';
    const direction = this.definition.category === 'FILTER' || this.definition.category === 'GATE'
      ? 'NEUTRAL'
      : exit || this.signalDirection(context) === 'BEARISH'
        ? 'BEARISH'
        : decision === 'ENTRY_CANDIDATE'
          ? 'BULLISH'
          : 'NEUTRAL';
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
      invalidationRulesTriggered: state.invalidationRulesTriggered,
      noiseFiltersTriggered: state.noiseFiltersTriggered,
      marketGateStatus: context.marketGate ?? null,
      eligibleForSignalGeneration: decision === 'ENTRY_CANDIDATE' && state.blockers.length === 0 && this.definition.category === 'ENTRY',
      eligibleForBacktest: decision === 'ENTRY_CANDIDATE' && this.definition.status === 'ACTIVE' && this.definition.category === 'ENTRY',
      eligibleForAutomationFuture: false,
    };
  }

  private baseState(_context: StrategyContext): MutableState {
    return { score: 0, reasons: [], blockers: [], warnings: [], dataGaps: [], entryRulesPassed: [], exitRulesTriggered: [], invalidationRulesTriggered: [], noiseFiltersTriggered: [] };
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

  private addInvalidation(state: MutableState, code: string, reason: string) {
    if (!state.invalidationRulesTriggered.includes(code)) state.invalidationRulesTriggered.push(code);
    state.reasons.push(reason);
  }

  private requires(input: string) {
    return this.definition.requiredInputs.some((item) => item.toLowerCase().includes(input.toLowerCase()));
  }

  private requireDeclaredInput(context: StrategyContext, state: MutableState, key: keyof StrategyContext, code: string, message: string) {
    if (!this.requires(key)) return;
    if (context[key] === null || context[key] === undefined || context[key] === '') {
      state.dataGaps.push(message);
      this.block(state, code, message);
    }
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

  private hasVolatilityContraction(bars: Array<{ close: number; volume?: number | null }>): boolean {
    if (bars.length < 21) return false;
    const baseBars = bars.slice(1);
    const recent = this.rangePercent(baseBars.slice(0, 10));
    const prior = this.rangePercent(baseBars.slice(10, 20));
    return recent !== null && prior !== null && recent <= prior * 0.85;
  }

  private rangePercent(bars: Array<{ close: number }>): number | null {
    const closes = bars.map((bar) => bar.close).filter((value) => Number.isFinite(value));
    if (closes.length === 0) return null;
    const low = Math.min(...closes);
    if (low <= 0) return null;
    return (Math.max(...closes) - low) / low;
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
  invalidationRulesTriggered: string[];
  noiseFiltersTriggered: string[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function numericParameter(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function capGrade(current: StrategyRatingGrade, cap: StrategyRatingGrade): StrategyRatingGrade {
  return ratingRank(current) > ratingRank(cap) ? cap : current;
}

function ratingRank(grade: StrategyRatingGrade): number {
  return { UNPROVEN: 0, WEAK: 1, AVERAGE: 2, GOOD: 3, EXCELLENT: 4 }[grade];
}

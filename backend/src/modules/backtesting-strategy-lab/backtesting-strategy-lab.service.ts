import { MarketDataFoundationService } from '../market-data-foundation';
import { SubscriptionBillingService } from '../subscription-billing';
import { WatchlistManagementService } from '../watchlist-management';
import { DataQualityEngineService } from '../data-quality-engine';
import { StrategyFrameworkEvaluator, StrategyFrameworkRegistry, StrategyFrameworkService } from '../strategy-framework';
import { BacktestingStrategyLabRepository } from './backtesting-strategy-lab.repository';
import type {
  BacktestMetrics,
  BacktestRunDto,
  BacktestStrategyConfig,
  BacktestTrade,
  CreateBacktestStrategyRequest,
  EquityCurvePoint,
  HistoricalBar,
  RunBacktestRequest,
  UpdateBacktestStrategyRequest,
} from './backtesting-strategy-lab.types';
import { validateConfig, validateStrategyInput } from './backtesting-strategy-lab.validation';

interface Position { instrumentId: string; symbol: string; entryDate: string; entryPrice: number; quantity: number; entryBarIndex: number; cost: number; entryReasons?: string[]; highestClose: number }
interface ResolvedUniverse {
  instruments: Array<{ instrumentId: string; symbol: string }>;
  totalAvailable?: number;
  capped?: boolean;
  cap?: number;
}

const EXIT_REASONS = {
  END_OF_TEST: 'END_OF_TEST',
  STOP_LOSS: 'STOP_LOSS',
  TRAILING_STOP: 'TRAILING_STOP',
  TAKE_PROFIT: 'TAKE_PROFIT',
  MAX_HOLDING_PERIOD: 'MAX_HOLDING_PERIOD',
  STRATEGY_EXIT: 'STRATEGY_EXIT',
} as const;

export class BacktestingStrategyLabService {
  constructor(
    private readonly repository = new BacktestingStrategyLabRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly watchlistService = new WatchlistManagementService(),
    private readonly subscriptionService = new SubscriptionBillingService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly strategyRegistry = new StrategyFrameworkRegistry(),
    private readonly strategyFrameworkService = new StrategyFrameworkService()
  ) {}

  listStrategies(userId = 'default-user') { return this.repository.listStrategies(userId); }
  getStrategy(id: string, userId = 'default-user') { return this.repository.getStrategy(id, userId); }
  deleteStrategy(id: string, userId = 'default-user') { return this.repository.deleteStrategy(id, userId); }
  listRuns(userId = 'default-user') { return this.repository.listRuns(userId); }
  getRun(id: string, userId = 'default-user') { return this.repository.getRun(id, userId); }
  deleteRun(id: string, userId = 'default-user') { return this.repository.deleteRun(id, userId); }

  async createStrategy(input: CreateBacktestStrategyRequest, userId = 'default-user') {
    this.throwIfErrors(validateStrategyInput(input));
    return this.repository.createStrategy(input, userId);
  }

  async updateStrategy(id: string, input: UpdateBacktestStrategyRequest, userId = 'default-user') {
    const existing = await this.repository.getStrategy(id, userId);
    if (!existing) throw new Error('Strategy not found');
    this.throwIfErrors(validateStrategyInput({ ...existing, ...input, config: input.config ?? existing.config }, false));
    return this.repository.updateStrategy(id, input, userId);
  }

  async run(request: RunBacktestRequest, userId = 'default-user'): Promise<BacktestRunDto> {
    await this.subscriptionService.assertAllowed('RUN_BACKTEST', userId);
    const strategy = request.strategyId ? await this.repository.getStrategy(request.strategyId, userId) : null;
    if (request.strategyId && !strategy) throw new Error('Strategy not found');
    const config = this.normalizeConfig(request.config ?? strategy?.config);
    this.throwIfErrors(validateConfig(config));
    if (this.isRegisteredConfig(config!)) this.strategyFrameworkService.getDefinition(config!.strategyCode!);
    try {
      const result = await this.simulate(config!);
      let run = await this.repository.createRun({
        strategyId: request.strategyId ?? null,
        config: config!,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        metrics: result.metrics,
        equityCurve: result.equityCurve,
        trades: result.trades,
        error: null,
      }, userId);
      if (this.isRegisteredConfig(config!) && run.metrics) {
        const summary = await this.strategyFrameworkService.persistBacktestPerformance({
          strategyCode: config!.strategyCode!,
          strategyVersion: config!.strategyVersion,
          timeframe: config!.timeframe!,
          region: config!.region || 'IN',
          assetType: config!.assetType || 'STOCK',
          universeKey: this.universeKey(config!.universe),
          initialCapital: config!.initialCapital,
          backtestRunId: run.id,
          metrics: run.metrics,
          dataCoverageScore: this.coverageScore(run.metrics.dataCoverage),
        });
        run = await this.repository.updateRunMetrics(run.id, {
          ...run.metrics,
          frameworkStrategyName: this.strategyFrameworkService.getDefinition(config!.strategyCode!).name,
          frameworkRating: {
            ratingScore: summary.ratingScore,
            ratingGrade: summary.ratingGrade,
            readinessLabel: this.safeReadiness(summary.readinessLabel),
            ratingReasons: summary.ratingReasons || [],
            ratingWarnings: summary.ratingWarnings || [],
            ratingCapsApplied: summary.ratingCapsApplied || [],
            performanceSummaryId: summary.id,
          },
        });
      }
      await this.subscriptionService.recordUsage('RUN_BACKTEST', userId);
      return run;
    } catch (error: any) {
      return this.repository.createRun({
        strategyId: request.strategyId ?? null,
        config: config!,
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        metrics: null,
        equityCurve: [],
        trades: [],
        error: error.message || 'Backtest failed',
      }, userId);
    }
  }

  async runStrategy(id: string, userId = 'default-user') {
    return this.run({ strategyId: id }, userId);
  }

  async simulate(config: BacktestStrategyConfig): Promise<{ metrics: BacktestMetrics; trades: BacktestTrade[]; equityCurve: EquityCurvePoint[] }> {
    const universe = await this.resolveUniverse(config);
    const resolvedUniverse = universe.instruments;
    const filterResult = await this.applyDataQualityFilter(resolvedUniverse, config);
    const instruments = filterResult.instruments;
    const histories = new Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>();
    let missingPriceHistoryCount = 0;
    let insufficientHistoryCount = 0;
    const minBars = this.isRegisteredConfig(config) ? this.minimumBarsForTimeframe(config.timeframe) : 21;
    for (const instrument of instruments) {
      const response = await this.marketDataService.listPricesByInstrumentId(instrument.instrumentId, 5000, new Date(config.startDate), new Date(config.endDate)).catch(() => null);
      const bars = (response?.prices || [])
        .map((price: any) => ({ date: new Date(price.date).toISOString().slice(0, 10), close: Number(price.adjusted_close ?? price.close), volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null }))
        .filter((bar: HistoricalBar) => Number.isFinite(bar.close))
        .sort((a: HistoricalBar, b: HistoricalBar) => a.date.localeCompare(b.date));
      if (bars.length === 0) missingPriceHistoryCount += 1;
      else if (bars.length < minBars) insufficientHistoryCount += 1;
      if (bars.length >= minBars) histories.set(instrument.instrumentId, { ...instrument, bars });
    }
    const dataCoverage = {
      instrumentsConsidered: resolvedUniverse.length,
      universeTotalAvailable: universe.totalAvailable,
      universeCapped: universe.capped,
      universeCap: universe.cap,
      instrumentsWithEnoughHistory: histories.size,
      instrumentsExcludedForHistory: missingPriceHistoryCount + insufficientHistoryCount,
      instrumentsExcludedForDataQuality: filterResult.metadata.excludedForDataQuality,
      missingPriceHistoryCount,
      insufficientHistoryCount,
      warnings: [] as string[],
    };
    if (histories.size === 0) dataCoverage.warnings.push('No instruments had enough price history for the requested timeframe.');
    if (filterResult.metadata.excludedForDataQuality > 0) dataCoverage.warnings.push('Some instruments were excluded by Data Quality Engine readiness filters.');
    if (universe.capped && universe.totalAvailable && universe.cap) dataCoverage.warnings.push(`Universe ALL was capped to ${universe.cap} of ${universe.totalAvailable} instruments for bounded runtime safety.`);
    const dates = [...new Set([...histories.values()].flatMap((item) => item.bars.map((bar) => bar.date)))].sort();
    let cash = config.initialCapital;
    let peak = config.initialCapital;
    const positions = new Map<string, Position>();
    const trades: BacktestTrade[] = [];
    const curve: EquityCurvePoint[] = [];

    dates.forEach((date) => {
      for (const history of histories.values()) {
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;
        const bar = history.bars[barIndex];
        const position = positions.get(history.instrumentId);
        if (position) position.highestClose = Math.max(position.highestClose, bar.close);
        const exit = position ? this.exitDecision(config, history.bars, barIndex, position) : null;
        if (position && exit?.exit) {
          const registeredExit = this.evaluateRegisteredStrategy(config, history.bars, barIndex, true);
          const exitReasons = registeredExit?.reasons || [];
          const trade = this.closePosition(config, position, bar, exit.reason, exitReasons);
          cash += this.exitCash(config, position.quantity, trade.exitPrice);
          trades.push(trade);
          positions.delete(history.instrumentId);
        }
      }
      for (const history of histories.values()) {
        if (positions.size >= config.maxPositions || positions.has(history.instrumentId)) continue;
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;
        const entry = this.entryDecision(config, history.bars, barIndex);
        if (!entry.enter) continue;
        const amount = config.positionSizeType === 'FIXED_AMOUNT' ? Number(config.fixedAmountPerTrade) : cash / Math.max(1, config.maxPositions - positions.size);
        const costAdjustedAmount = Math.min(cash, amount);
        const bar = history.bars[barIndex];
        const transactionCost = costAdjustedAmount * config.transactionCostPercent;
        const tradeAmount = costAdjustedAmount - transactionCost;
        if (tradeAmount <= 0 || cash < costAdjustedAmount) continue;
        const entryPrice = this.applyEntrySlippage(bar.close, config);
        const quantity = tradeAmount / entryPrice;
        cash -= costAdjustedAmount;
        positions.set(history.instrumentId, { instrumentId: history.instrumentId, symbol: history.symbol, entryDate: date, entryPrice, quantity, entryBarIndex: barIndex, cost: transactionCost, entryReasons: entry.reasons, highestClose: bar.close });
      }
      const investedValue = [...positions.values()].reduce((sum, position) => {
        const history = histories.get(position.instrumentId);
        const latest = this.barAtOrBefore(history?.bars || [], date);
        return sum + position.quantity * (latest?.close || position.entryPrice);
      }, 0);
      const equity = cash + investedValue;
      peak = Math.max(peak, equity);
      curve.push({ date, equity, cash, investedValue, drawdownPercent: peak > 0 ? (equity - peak) / peak : 0 });
    });

    const lastDate = dates[dates.length - 1];
    for (const position of positions.values()) {
      const history = histories.get(position.instrumentId);
      const bar = this.barAtOrBefore(history?.bars || [], lastDate);
      if (bar) {
        const trade = this.closePosition(config, position, bar, EXIT_REASONS.END_OF_TEST);
        cash += this.exitCash(config, position.quantity, trade.exitPrice);
        trades.push(trade);
      }
    }
    if (curve.length > 0 && positions.size > 0) {
      peak = Math.max(peak, cash);
      curve[curve.length - 1] = {
        ...curve[curve.length - 1],
        equity: cash,
        cash,
        investedValue: 0,
        drawdownPercent: peak > 0 ? (cash - peak) / peak : 0,
      };
    }
    const baseMetrics = this.metrics(config.initialCapital, curve, trades, config);
    const benchmarkComparison = this.benchmarkComparison(config, histories, dates, baseMetrics);
    return {
      metrics: {
        ...baseMetrics,
        dataQualityMetadata: filterResult.metadata,
        dataCoverage,
        dataCoveragePercent: this.coverageScore(dataCoverage),
        benchmarkComparison,
        realismWarnings: this.realismWarnings(trades, benchmarkComparison, dataCoverage, baseMetrics),
        availabilityStatus: this.availabilityStatus(config, histories.size, insufficientHistoryCount, missingPriceHistoryCount),
      },
      trades,
      equityCurve: this.sampleCurve(curve),
    };
  }

  shouldEnter(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number): boolean {
    return this.entryDecision(config, bars, index).enter;
  }

  private entryDecision(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number): { enter: boolean; reasons: string[] } {
    const registered = this.evaluateRegisteredStrategy(config, bars, index);
    if (registered) return { enter: registered.eligibleForBacktest && registered.eligibleForSignalGeneration, reasons: registered.reasons };
    const signal = this.signalProxy(bars, index);
    if (config.entryRule.type === 'SIGNAL_SCORE_ABOVE') return { enter: signal.score > Number(config.entryRule.threshold), reasons: [`Signal score ${signal.score}`] };
    if (config.entryRule.type === 'SIGNAL_DIRECTION_BULLISH') return { enter: signal.direction === 'BULLISH', reasons: [`Signal direction ${signal.direction}`] };
    if (config.entryRule.type === 'PRICE_ABOVE_SMA50') return { enter: this.priceAboveSma(bars, index, 50), reasons: ['Price above SMA50'] };
    return { enter: this.sma(bars, index, 50) !== null && this.sma(bars, index, 200) !== null && this.sma(bars, index, 50)! > this.sma(bars, index, 200)!, reasons: ['SMA50 above SMA200'] };
  }

  shouldExit(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, position: Position): boolean {
    return this.exitDecision(config, bars, index, position).exit;
  }

  private exitDecision(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, position: Position): { exit: boolean; reason: string } {
    const close = bars[index].close;
    if (typeof config.stopLossPercent === 'number' && close <= position.entryPrice * (1 - config.stopLossPercent)) return { exit: true, reason: EXIT_REASONS.STOP_LOSS };
    if (typeof config.trailingStopPercent === 'number' && close <= position.highestClose * (1 - config.trailingStopPercent)) return { exit: true, reason: EXIT_REASONS.TRAILING_STOP };
    if (typeof config.takeProfitPercent === 'number' && close >= position.entryPrice * (1 + config.takeProfitPercent)) return { exit: true, reason: EXIT_REASONS.TAKE_PROFIT };
    if (typeof config.maxHoldingDays === 'number' && index - position.entryBarIndex >= config.maxHoldingDays) return { exit: true, reason: EXIT_REASONS.MAX_HOLDING_PERIOD };
    if (config.strategyCode) {
      const registered = this.evaluateRegisteredStrategy(config, bars, index, true);
      if (registered && ['EXIT_CANDIDATE', 'REDUCE_RISK', 'AVOID'].includes(registered.decision)) return { exit: true, reason: EXIT_REASONS.STRATEGY_EXIT };
    }
    const signal = this.signalProxy(bars, index);
    if (config.exitRule.type === 'SIGNAL_SCORE_BELOW') return { exit: signal.score < Number(config.exitRule.threshold), reason: EXIT_REASONS.STRATEGY_EXIT };
    if (config.exitRule.type === 'SIGNAL_DIRECTION_BEARISH') return { exit: signal.direction === 'BEARISH', reason: EXIT_REASONS.STRATEGY_EXIT };
    if (config.exitRule.type === 'PRICE_BELOW_SMA50') return { exit: !this.priceAboveSma(bars, index, 50), reason: EXIT_REASONS.STRATEGY_EXIT };
    return { exit: index - position.entryBarIndex >= Number(config.exitRule.holdingDays), reason: EXIT_REASONS.MAX_HOLDING_PERIOD };
  }

  metrics(initialCapital: number, curve: EquityCurvePoint[], trades: BacktestTrade[], config?: BacktestStrategyConfig): BacktestMetrics {
    const ending = curve[curve.length - 1]?.equity ?? initialCapital;
    const totalReturn = initialCapital > 0 ? (ending - initialCapital) / initialCapital : 0;
    const years = config ? (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000) : curve.length / 252;
    const returns = curve.slice(1).map((point, index) => curve[index].equity > 0 ? (point.equity - curve[index].equity) / curve[index].equity : 0);
    const volatility = this.stddev(returns) * Math.sqrt(252);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
    const wins = trades.filter((trade) => trade.netPnL > 0);
    const losses = trades.filter((trade) => trade.netPnL < 0);
    return {
      totalReturn,
      cagr: years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : null,
      maxDrawdown: Math.min(0, ...curve.map((point) => point.drawdownPercent)),
      volatility: Number.isFinite(volatility) ? volatility : null,
      sharpeRatio: volatility > 0 ? (avgReturn * 252) / volatility : null,
      winRate: trades.length > 0 ? wins.length / trades.length : null,
      averageWin: wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.netPnL, 0) / wins.length : null,
      averageLoss: losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.netPnL, 0) / losses.length : null,
      profitFactor: losses.length > 0 ? wins.reduce((sum, trade) => sum + trade.netPnL, 0) / Math.abs(losses.reduce((sum, trade) => sum + trade.netPnL, 0)) : null,
      numberOfTrades: trades.length,
      averageHoldingDays: trades.length > 0 ? trades.reduce((sum, trade) => sum + trade.holdingDays, 0) / trades.length : null,
      medianHoldingDays: this.median(trades.map((trade) => trade.holdingDays)),
      longestHoldingDays: trades.length > 0 ? Math.max(...trades.map((trade) => trade.holdingDays)) : null,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((trade) => trade.returnPercent)) : null,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((trade) => trade.returnPercent)) : null,
      exitDiagnostics: this.exitDiagnostics(trades),
    };
  }

  private async resolveUniverse(config: BacktestStrategyConfig): Promise<ResolvedUniverse> {
    if (config.universe.type === 'INSTRUMENTS') return { instruments: (config.universe.instrumentIds || []).map((instrumentId) => ({ instrumentId, symbol: instrumentId })) };
    if (config.universe.type === 'SYMBOLS') {
      const found = await Promise.all((config.universe.symbols || []).map(async (symbol) => {
        const target = symbol.toUpperCase();
        const result = await this.marketDataService.listInstruments({
          search: symbol,
          pageSize: 10,
          region: config.region,
          assetType: config.assetType,
        });
        const match = result.instruments.find((instrument: any) => {
          const candidates = [instrument.symbol, instrument.display_symbol, instrument.displaySymbol, instrument.provider_symbol, instrument.providerSymbol, instrument.source_symbol, instrument.sourceSymbol]
            .filter(Boolean)
            .map((value: string) => value.toUpperCase());
          return candidates.includes(target);
        }) ?? result.instruments[0];
        return match ? { instrumentId: match.id, symbol: match.symbol } : null;
      }));
      return { instruments: found.filter((item): item is { instrumentId: string; symbol: string } => Boolean(item)) };
    }
    if (config.universe.type === 'WATCHLIST' && config.universe.watchlistId) {
      const detail = await this.watchlistService.detail(config.universe.watchlistId);
      return { instruments: (detail?.items || []).map((item: any) => ({ instrumentId: item.instrumentId, symbol: item.symbol })) };
    }
    const cap = 50;
    const result = await this.marketDataService.listInstruments({ page: 1, pageSize: cap, region: config.region, assetType: config.assetType });
    const totalAvailable = Number(result.pagination?.total ?? result.instruments.length);
    return {
      instruments: result.instruments.map((instrument: any) => ({ instrumentId: instrument.id, symbol: instrument.symbol })),
      totalAvailable,
      capped: totalAvailable > result.instruments.length,
      cap,
    };
  }

  private evaluateRegisteredStrategy(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, exit = false) {
    if (!this.isRegisteredConfig(config)) return null;
    const strategy = this.strategyRegistry.get(config.strategyCode!);
    if (!strategy) return null;
    const context = this.strategyContextFromBars(bars, index, config);
    const evaluator = new StrategyFrameworkEvaluator(strategy);
    return exit ? evaluator.evaluateExit(context) : evaluator.evaluateEntry(context);
  }

  private strategyContextFromBars(bars: HistoricalBar[], index: number, config: BacktestStrategyConfig) {
    const window = bars.slice(0, index + 1);
    const latestFirst = [...window].reverse();
    const closes = latestFirst.map((bar) => bar.close);
    const latest = bars[index];
    const previous = bars[index - 1];
    const averageVolume20 = this.average(latestFirst.slice(1, 21).map((bar) => bar.volume).filter((value): value is number => typeof value === 'number' && Number.isFinite(value)));
    const signal = this.signalProxy(bars, index);
    return {
      latestPrice: latest?.close ?? null,
      previousClose: previous?.close ?? null,
      bars: latestFirst,
      sma50: this.sma(bars, index, 50),
      sma200: this.sma(bars, index, 200),
      rsi: this.rsiFromLatestFirst(closes, 14),
      return20d: closes.length > 20 && closes[20] > 0 ? (closes[0] - closes[20]) / closes[20] : null,
      high52Week: closes.length > 0 ? Math.max(...closes.slice(0, 252)) : null,
      low52Week: closes.length > 0 ? Math.min(...closes.slice(0, 252)) : null,
      averageVolume20,
      rawSignal: {
        instrument_id: '',
        symbol: '',
        company_name: null,
        sector: null,
        country: null,
        currentPrice: latest?.close ?? null,
        previousClose: previous?.close ?? null,
        dailyChange: latest && previous ? latest.close - previous.close : null,
        dailyChangePercent: latest && previous && previous.close > 0 ? (latest.close - previous.close) / previous.close : null,
        currency: null,
        priceTimestamp: latest?.date ?? null,
        score: signal.score,
        direction: signal.direction as any,
        confidence: closes.length >= 200 ? 'HIGH' : closes.length >= 50 ? 'MEDIUM' : 'LOW',
        triggered_signals: [],
        negative_signals: [],
        explanation: 'Backtest proxy signal derived from registered strategy context.',
        generated_at: latest?.date ?? new Date().toISOString(),
        source: 'backtesting-strategy-lab',
        data_status: closes.length >= 200 ? 'COMPLETE' : closes.length >= 50 ? 'PARTIAL' : 'MISSING',
      } as any,
      dataQuality: {
        signalReadinessStatus: closes.length >= 200 ? 'READY' : closes.length >= 50 ? 'LIMITED' : 'NOT_READY',
        coverageStatus: closes.length >= 252 ? 'GOOD' : closes.length >= 50 ? 'PARTIAL' : 'UNUSABLE',
        liquidityStatus: averageVolume20 === null ? 'UNKNOWN' : averageVolume20 > 0 ? 'LIQUID' : 'ILLIQUID',
        eligibleForSignals: closes.length >= 50,
        eligibleForBacktesting: closes.length >= 252,
      },
      marketGate: 'UNKNOWN',
      marketRegime: null,
      region: config.region || 'IN',
      assetType: config.assetType || 'STOCK',
      backtestDate: latest?.date ?? null,
    };
  }

  private normalizeConfig(config?: BacktestStrategyConfig): BacktestStrategyConfig | undefined {
    if (!config) return undefined;
    if (this.isRegisteredConfig(config) && (!config.startDate || !config.endDate || !config.entryRule || !config.exitRule)) {
      return this.strategyFrameworkService.strategyToBacktestConfig({
        strategyCode: config.strategyCode!,
        timeframe: config.timeframe || '1Y',
        region: config.region || 'IN',
        assetType: config.assetType || 'STOCK',
        universe: config.universe,
        initialCapital: config.initialCapital,
        maxPositions: config.maxPositions,
        transactionCostPercent: config.transactionCostPercent,
        slippagePercent: config.slippagePercent,
        maxHoldingDays: config.maxHoldingDays,
        stopLossPercent: config.stopLossPercent,
        trailingStopPercent: config.trailingStopPercent,
        takeProfitPercent: config.takeProfitPercent,
        positionSizeType: config.positionSizeType,
        fixedAmountPerTrade: config.fixedAmountPerTrade,
      });
    }
    return {
      ...config,
      mode: config.strategyCode ? 'REGISTERED_STRATEGY' : config.mode || 'CUSTOM_RULES',
      region: config.region || config.universe.region || 'IN',
      assetType: config.assetType || config.universe.assetType || 'STOCK',
    };
  }

  private isRegisteredConfig(config: BacktestStrategyConfig) {
    return config.mode === 'REGISTERED_STRATEGY' || Boolean(config.strategyCode);
  }

  private minimumBarsForTimeframe(timeframe?: BacktestStrategyConfig['timeframe']) {
    const years = Number(String(timeframe || '1Y').replace('Y', '')) || 1;
    return Math.max(50, Math.floor(years * 252 * 0.7));
  }

  private availabilityStatus(config: BacktestStrategyConfig, enoughHistoryCount: number, insufficientHistoryCount: number, missingPriceHistoryCount: number): BacktestMetrics['availabilityStatus'] {
    if (!this.isRegisteredConfig(config)) return enoughHistoryCount > 0 ? 'AVAILABLE' : 'NOT_RUN';
    if (enoughHistoryCount === 0) return 'INSUFFICIENT_HISTORY';
    if (insufficientHistoryCount > 0 || missingPriceHistoryCount > 0) return 'PARTIAL';
    return 'AVAILABLE';
  }

  private universeKey(universe: BacktestStrategyConfig['universe']) {
    if (!universe || universe.type === 'ALL') return 'ALL_ELIGIBLE';
    if (universe.type === 'WATCHLIST') return `WATCHLIST:${universe.watchlistId || 'UNKNOWN'}`;
    if (universe.type === 'SYMBOLS') return `SYMBOLS:${(universe.symbols || []).sort().join(',')}`;
    return `INSTRUMENTS:${(universe.instrumentIds || []).sort().join(',')}`;
  }

  private coverageScore(coverage?: BacktestMetrics['dataCoverage']) {
    if (!coverage || coverage.instrumentsConsidered <= 0) return 0;
    return coverage.instrumentsWithEnoughHistory / coverage.instrumentsConsidered;
  }

  private safeReadiness(value: string): 'RESEARCH_ONLY' | 'WATCHLIST_CANDIDATE' | 'PAPER_TEST_CANDIDATE' | 'NOT_AUTOMATION_READY' {
    if (value === 'PAPER_TEST_CANDIDATE' || value === 'WATCHLIST_CANDIDATE' || value === 'NOT_AUTOMATION_READY') return value;
    return 'RESEARCH_ONLY';
  }

  private rsiFromLatestFirst(values: number[], period: number): number | null {
    if (values.length <= period) return null;
    let gains = 0;
    let losses = 0;
    for (let i = 0; i < period; i++) {
      const diff = values[i] - values[i + 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    if (losses === 0) return 100;
    const rs = (gains / period) / (losses / period);
    return 100 - (100 / (1 + rs));
  }

  private async applyDataQualityFilter(instruments: Array<{ instrumentId: string; symbol: string }>, config: BacktestStrategyConfig): Promise<{
    instruments: Array<{ instrumentId: string; symbol: string }>;
    metadata: NonNullable<BacktestMetrics['dataQualityMetadata']>;
  }> {
    if (!config.useDataQualityFilter) {
      return {
        instruments,
        metadata: {
          universeBeforeDataQualityFilter: instruments.length,
          universeAfterDataQualityFilter: instruments.length,
          excludedForDataQuality: 0,
          missingQualityEvaluationCount: 0,
        },
      };
    }
    const result = await this.dataQualityService.filterEligibleInstruments(instruments.map((instrument) => instrument.instrumentId), {
      minSignalReadinessScore: config.minSignalReadinessScore ?? 70,
      includeLimited: !config.excludeNotReady,
      excludeNotReady: config.excludeNotReady ?? true,
      excludeIlliquid: config.excludeIlliquid ?? true,
      excludeMissingQuality: config.excludeMissingQuality ?? false,
      missingQualityBehavior: config.excludeMissingQuality ? 'SKIP' : 'WARN_AND_PROCESS',
    });
    const eligible = new Set(result.eligibleInstrumentIds);
    const filtered = instruments.filter((instrument) => eligible.has(instrument.instrumentId));
    return {
      instruments: filtered,
      metadata: {
        universeBeforeDataQualityFilter: instruments.length,
        universeAfterDataQualityFilter: filtered.length,
        excludedForDataQuality: result.excludedInstrumentIds.length,
        missingQualityEvaluationCount: result.missingQualityEvaluationCount,
      },
    };
  }

  private closePosition(config: BacktestStrategyConfig, position: Position, bar: HistoricalBar, exitReason: string, exitReasons: string[] = []): BacktestTrade {
    const exitPrice = this.applyExitSlippage(bar.close, config);
    const gross = position.quantity * (exitPrice - position.entryPrice);
    const exitCost = position.quantity * exitPrice * config.transactionCostPercent;
    const net = gross - position.cost - exitCost;
    return {
      instrumentId: position.instrumentId,
      symbol: position.symbol,
      entryDate: position.entryDate,
      entryPrice: position.entryPrice,
      exitDate: bar.date,
      exitPrice,
      quantity: position.quantity,
      grossPnL: gross,
      netPnL: net,
      returnPercent: (exitPrice - position.entryPrice) / position.entryPrice - config.transactionCostPercent * 2,
      holdingDays: Math.max(1, Math.round((new Date(bar.date).getTime() - new Date(position.entryDate).getTime()) / (24 * 60 * 60 * 1000))),
      exitReason,
      entryReason: position.entryReasons?.[0],
      entryReasons: position.entryReasons,
      exitReasons,
    };
  }

  private signalProxy(bars: HistoricalBar[], index: number) {
    const score = (this.priceAboveSma(bars, index, 50) ? 40 : 10) + (this.sma(bars, index, 50)! > (this.sma(bars, index, 200) ?? Infinity) ? 40 : 10) + (index > 21 && bars[index].close > bars[index - 21].close ? 20 : 5);
    return { score, direction: score >= 70 ? 'BULLISH' : score < 40 ? 'BEARISH' : 'NEUTRAL' };
  }

  private priceAboveSma(bars: HistoricalBar[], index: number, period: number) {
    const average = this.sma(bars, index, period);
    return average !== null && bars[index].close > average;
  }

  private sma(bars: HistoricalBar[], index: number, period: number): number | null {
    if (index + 1 < period) return null;
    const values = bars.slice(index + 1 - period, index + 1).map((bar) => bar.close);
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private barAtOrBefore(bars: HistoricalBar[], date: string) {
    return [...bars].reverse().find((bar) => bar.date <= date);
  }

  private sampleCurve(curve: EquityCurvePoint[]) {
    if (curve.length <= 500) return curve;
    const step = Math.ceil(curve.length / 500);
    return curve.filter((_point, index) => index % step === 0 || index === curve.length - 1);
  }

  private stddev(values: number[]) {
    if (values.length < 2) return 0;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1));
  }

  private average(values: number[]) {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private applyEntrySlippage(price: number, config: BacktestStrategyConfig) {
    return price * (1 + (config.slippagePercent ?? 0));
  }

  private applyExitSlippage(price: number, config: BacktestStrategyConfig) {
    return price * (1 - (config.slippagePercent ?? 0));
  }

  private exitCash(config: BacktestStrategyConfig, quantity: number, exitPrice: number) {
    return quantity * exitPrice - Math.abs(quantity * exitPrice * config.transactionCostPercent);
  }

  private exitDiagnostics(trades: BacktestTrade[]): NonNullable<BacktestMetrics['exitDiagnostics']> {
    const count = (reason: string) => trades.filter((trade) => trade.exitReason === reason).length;
    const endOfTestExitCount = count(EXIT_REASONS.END_OF_TEST);
    return {
      endOfTestExitCount,
      endOfTestExitPercent: trades.length > 0 ? endOfTestExitCount / trades.length : 0,
      stopLossExitCount: count(EXIT_REASONS.STOP_LOSS),
      trailingStopExitCount: count(EXIT_REASONS.TRAILING_STOP),
      takeProfitExitCount: count(EXIT_REASONS.TAKE_PROFIT),
      strategyExitCount: count(EXIT_REASONS.STRATEGY_EXIT),
      maxHoldExitCount: count(EXIT_REASONS.MAX_HOLDING_PERIOD),
      averageHoldingDays: trades.length > 0 ? trades.reduce((sum, trade) => sum + trade.holdingDays, 0) / trades.length : null,
      medianHoldingDays: this.median(trades.map((trade) => trade.holdingDays)),
      longestHoldingDays: trades.length > 0 ? Math.max(...trades.map((trade) => trade.holdingDays)) : null,
    };
  }

  private benchmarkComparison(config: BacktestStrategyConfig, histories: Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>, dates: string[], metrics: BacktestMetrics): NonNullable<BacktestMetrics['benchmarkComparison']> {
    if (histories.size === 0 || dates.length < 2) {
      return { benchmarkName: null, benchmarkTotalReturn: null, benchmarkCagr: null, excessReturn: null, excessCagr: null, benchmarkDataStatus: 'UNAVAILABLE', dataGap: 'Benchmark unavailable for selected region' };
    }
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const returns = [...histories.values()].map((history) => {
      const first = history.bars.find((bar) => bar.date >= firstDate) ?? history.bars[0];
      const last = this.barAtOrBefore(history.bars, lastDate) ?? history.bars.at(-1);
      return first && last && first.close > 0 ? (last.close - first.close) / first.close : null;
    }).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (returns.length === 0) {
      return { benchmarkName: null, benchmarkTotalReturn: null, benchmarkCagr: null, excessReturn: null, excessCagr: null, benchmarkDataStatus: 'UNAVAILABLE', dataGap: 'Benchmark unavailable for selected region' };
    }
    const benchmarkTotalReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const years = (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const benchmarkCagr = years > 0 ? Math.pow(1 + benchmarkTotalReturn, 1 / years) - 1 : null;
    return {
      benchmarkName: `${config.region || 'GLOBAL'} equal-weight universe baseline`,
      benchmarkTotalReturn,
      benchmarkCagr,
      excessReturn: metrics.totalReturn - benchmarkTotalReturn,
      excessCagr: metrics.cagr !== null && benchmarkCagr !== null ? metrics.cagr - benchmarkCagr : null,
      benchmarkDataStatus: 'FALLBACK_EQUAL_WEIGHT',
    };
  }

  private realismWarnings(trades: BacktestTrade[], benchmark: NonNullable<BacktestMetrics['benchmarkComparison']>, coverage: BacktestMetrics['dataCoverage'], metrics: BacktestMetrics) {
    const warnings: string[] = [];
    const diagnostics = this.exitDiagnostics(trades);
    if (diagnostics.endOfTestExitPercent >= 0.4) warnings.push(`${Math.round(diagnostics.endOfTestExitPercent * 100)}% of exits occurred at end of test; exit rules may be too weak.`);
    if (trades.length > 0 && trades.length < 10) warnings.push(`Only ${trades.length} trades were generated; sample size is insufficient.`);
    if (coverage && this.coverageScore(coverage) < 0.8) warnings.push('Data coverage is below the preferred threshold.');
    if (benchmark.excessCagr !== null && benchmark.excessCagr < 0) warnings.push('Strategy underperformed benchmark over this timeframe.');
    if (metrics.maxDrawdown <= -0.3) warnings.push('Max drawdown exceeded rating threshold.');
    if (benchmark.benchmarkDataStatus === 'UNAVAILABLE' && benchmark.dataGap) warnings.push(benchmark.dataGap);
    return warnings;
  }

  private median(values: number[]) {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}

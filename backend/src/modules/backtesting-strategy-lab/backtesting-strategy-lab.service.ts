import { MarketDataFoundationService } from '../market-data-foundation';
import { SubscriptionBillingService } from '../subscription-billing';
import { WatchlistManagementService } from '../watchlist-management';
import { DataQualityEngineService } from '../data-quality-engine';
import { StrategyFrameworkEvaluator } from '../strategy-framework/strategy-framework.evaluator';
import { StrategyFrameworkRegistry } from '../strategy-framework/strategy-framework.registry';
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

interface Position { instrumentId: string; symbol: string; entryDate: string; entryPrice: number; quantity: number; entryBarIndex: number; cost: number }

export class BacktestingStrategyLabService {
  constructor(
    private readonly repository = new BacktestingStrategyLabRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly watchlistService = new WatchlistManagementService(),
    private readonly subscriptionService = new SubscriptionBillingService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly strategyRegistry = new StrategyFrameworkRegistry()
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
    const config = request.config ?? strategy?.config;
    this.throwIfErrors(validateConfig(config));
    try {
      const result = await this.simulate(config!);
      const run = await this.repository.createRun({
        strategyId: request.strategyId ?? null,
        config: config!,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        metrics: result.metrics,
        equityCurve: result.equityCurve,
        trades: result.trades,
        error: null,
      }, userId);
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
    const resolvedUniverse = await this.resolveUniverse(config);
    const filterResult = await this.applyDataQualityFilter(resolvedUniverse, config);
    const instruments = filterResult.instruments;
    const histories = new Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>();
    for (const instrument of instruments) {
      const response = await this.marketDataService.listPricesByInstrumentId(instrument.instrumentId, 5000, new Date(config.startDate), new Date(config.endDate)).catch(() => null);
      const bars = (response?.prices || [])
        .map((price: any) => ({ date: new Date(price.date).toISOString().slice(0, 10), close: Number(price.adjusted_close ?? price.close), volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null }))
        .filter((bar: HistoricalBar) => Number.isFinite(bar.close))
        .sort((a: HistoricalBar, b: HistoricalBar) => a.date.localeCompare(b.date));
      if (bars.length > 20) histories.set(instrument.instrumentId, { ...instrument, bars });
    }
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
        if (position && this.shouldExit(config, history.bars, barIndex, position)) {
          const trade = this.closePosition(config, position, bar, 'Exit rule');
          cash += position.quantity * bar.close - Math.abs(position.quantity * bar.close * config.transactionCostPercent);
          trades.push(trade);
          positions.delete(history.instrumentId);
        }
      }
      for (const history of histories.values()) {
        if (positions.size >= config.maxPositions || positions.has(history.instrumentId)) continue;
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0 || !this.shouldEnter(config, history.bars, barIndex)) continue;
        const amount = config.positionSizeType === 'FIXED_AMOUNT' ? Number(config.fixedAmountPerTrade) : cash / Math.max(1, config.maxPositions - positions.size);
        const costAdjustedAmount = Math.min(cash, amount);
        const bar = history.bars[barIndex];
        const transactionCost = costAdjustedAmount * config.transactionCostPercent;
        const tradeAmount = costAdjustedAmount - transactionCost;
        if (tradeAmount <= 0 || cash < costAdjustedAmount) continue;
        const quantity = tradeAmount / bar.close;
        cash -= costAdjustedAmount;
        positions.set(history.instrumentId, { instrumentId: history.instrumentId, symbol: history.symbol, entryDate: date, entryPrice: bar.close, quantity, entryBarIndex: barIndex, cost: transactionCost });
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
      if (bar) trades.push(this.closePosition(config, position, bar, 'End of test'));
    }
    return { metrics: { ...this.metrics(config.initialCapital, curve, trades, config), dataQualityMetadata: filterResult.metadata }, trades, equityCurve: this.sampleCurve(curve) };
  }

  shouldEnter(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number): boolean {
    const registered = this.evaluateRegisteredStrategy(config, bars, index);
    if (registered) return registered.eligibleForBacktest && registered.eligibleForSignalGeneration;
    const signal = this.signalProxy(bars, index);
    if (config.entryRule.type === 'SIGNAL_SCORE_ABOVE') return signal.score > Number(config.entryRule.threshold);
    if (config.entryRule.type === 'SIGNAL_DIRECTION_BULLISH') return signal.direction === 'BULLISH';
    if (config.entryRule.type === 'PRICE_ABOVE_SMA50') return this.priceAboveSma(bars, index, 50);
    return this.sma(bars, index, 50) !== null && this.sma(bars, index, 200) !== null && this.sma(bars, index, 50)! > this.sma(bars, index, 200)!;
  }

  shouldExit(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, position: Position): boolean {
    if (config.strategyCode) {
      const registered = this.evaluateRegisteredStrategy(config, bars, index, true);
      if (registered && ['EXIT_CANDIDATE', 'REDUCE_RISK', 'AVOID'].includes(registered.decision)) return true;
    }
    const signal = this.signalProxy(bars, index);
    if (config.exitRule.type === 'SIGNAL_SCORE_BELOW') return signal.score < Number(config.exitRule.threshold);
    if (config.exitRule.type === 'SIGNAL_DIRECTION_BEARISH') return signal.direction === 'BEARISH';
    if (config.exitRule.type === 'PRICE_BELOW_SMA50') return !this.priceAboveSma(bars, index, 50);
    return index - position.entryBarIndex >= Number(config.exitRule.holdingDays);
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
      bestTrade: trades.length > 0 ? Math.max(...trades.map((trade) => trade.returnPercent)) : null,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((trade) => trade.returnPercent)) : null,
    };
  }

  private async resolveUniverse(config: BacktestStrategyConfig): Promise<Array<{ instrumentId: string; symbol: string }>> {
    if (config.universe.type === 'INSTRUMENTS') return (config.universe.instrumentIds || []).map((instrumentId) => ({ instrumentId, symbol: instrumentId }));
    if (config.universe.type === 'SYMBOLS') {
      const found = await Promise.all((config.universe.symbols || []).map(async (symbol) => {
        const result = await this.marketDataService.listInstruments({ search: symbol, pageSize: 10 });
        const match = result.instruments.find((instrument: any) => instrument.symbol === symbol || instrument.symbol === symbol.toUpperCase());
        return match ? { instrumentId: match.id, symbol: match.symbol } : null;
      }));
      return found.filter((item): item is { instrumentId: string; symbol: string } => Boolean(item));
    }
    if (config.universe.type === 'WATCHLIST' && config.universe.watchlistId) {
      const detail = await this.watchlistService.detail(config.universe.watchlistId);
      return (detail?.items || []).map((item: any) => ({ instrumentId: item.instrumentId, symbol: item.symbol }));
    }
    const result = await this.marketDataService.listInstruments({ page: 1, pageSize: 50, region: config.region, assetType: config.assetType });
    return result.instruments.map((instrument: any) => ({ instrumentId: instrument.id, symbol: instrument.symbol }));
  }

  private evaluateRegisteredStrategy(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, exit = false) {
    if (!config.strategyCode) return null;
    const strategy = this.strategyRegistry.get(config.strategyCode);
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

  private closePosition(config: BacktestStrategyConfig, position: Position, bar: HistoricalBar, exitReason: string): BacktestTrade {
    const gross = position.quantity * (bar.close - position.entryPrice);
    const exitCost = position.quantity * bar.close * config.transactionCostPercent;
    const net = gross - position.cost - exitCost;
    return {
      instrumentId: position.instrumentId,
      symbol: position.symbol,
      entryDate: position.entryDate,
      entryPrice: position.entryPrice,
      exitDate: bar.date,
      exitPrice: bar.close,
      quantity: position.quantity,
      grossPnL: gross,
      netPnL: net,
      returnPercent: (bar.close - position.entryPrice) / position.entryPrice - config.transactionCostPercent * 2,
      holdingDays: Math.max(1, Math.round((new Date(bar.date).getTime() - new Date(position.entryDate).getTime()) / (24 * 60 * 60 * 1000))),
      exitReason,
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

  private throwIfErrors(errors: string[]) {
    if (errors.length > 0) throw new Error(errors.join('; '));
  }
}

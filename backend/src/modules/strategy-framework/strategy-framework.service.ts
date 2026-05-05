import { DataQualityEngineService } from '../data-quality-engine';
import { MarketContextIntelligenceService } from '../market-context-intelligence';
import { MarketDataFoundationService } from '../market-data-foundation';
import { SignalCalibrationEngineService } from '../signal-calibration-engine';
import { SignalGenerationEngineService } from '../signal-generation-engine';
import { SmartMoneyIntelligenceService } from '../smart-money-intelligence';
import { StrategyFrameworkEvaluator } from './strategy-framework.evaluator';
import { StrategyFrameworkRegistry, STRATEGY_TIMEFRAMES } from './strategy-framework.registry';
import { StrategyFrameworkRepository } from './strategy-framework.repository';
import type {
  RegisteredBacktestInput,
  StrategyContext,
  StrategyDefinition,
  StrategyEvaluateRequest,
  StrategyListQuery,
  StrategyModelResponse,
  StrategyPerformanceQuery,
  StrategyPerformanceSummaryDto,
  StrategyRankingsQuery,
  StrategySignalOutput,
  StrategyTimeframe,
} from './strategy-framework.types';

export class StrategyFrameworkService {
  constructor(
    private readonly repository = new StrategyFrameworkRepository(),
    private readonly registry = new StrategyFrameworkRegistry(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly signalService = new SignalGenerationEngineService(),
    private readonly calibrationService = new SignalCalibrationEngineService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly contextService = new MarketContextIntelligenceService(),
    private readonly smartMoneyService = new SmartMoneyIntelligenceService()
  ) {}

  async seedDefinitions(): Promise<void> {
    await this.repository.upsertDefinitions(this.registry.list());
  }

  async list(query: StrategyListQuery = {}) {
    const configured = this.registry.list().filter((strategy) => this.matches(strategy, query));
    const performance = await this.repository.latestPerformanceForStrategies(configured.map((strategy) => strategy.code), {
      region: query.region,
      assetType: query.assetType,
    }).catch(() => []);
    const latestByCode = new Map<string, StrategyPerformanceSummaryDto>();
    for (const row of performance) if (!latestByCode.has(row.strategyCode)) latestByCode.set(row.strategyCode, row);
    return configured.map((strategy) => ({ ...strategy, latestPerformance: latestByCode.get(strategy.code) ?? null }));
  }

  async detail(code: string, query: StrategyPerformanceQuery = {}) {
    const strategy = this.requireStrategy(code);
    const latestPerformanceSummaries = await this.performance(code, query).catch(() => []);
    return { ...strategy, latestPerformanceSummaries };
  }

  async performance(code: string, query: StrategyPerformanceQuery = {}) {
    return this.repository.performance(code, query).catch(() => []);
  }

  async rankings(query: StrategyRankingsQuery = {}) {
    const persisted = await this.repository.rankings(query).catch(() => []);
    if (persisted.length > 0) return persisted;
    return this.registry.list().map((strategy) => this.unprovenSummary(strategy, query.timeframe || '1Y', query.region || 'IN', query.assetType || 'STOCK'));
  }

  async evaluate(request: StrategyEvaluateRequest) {
    const strategies = request.strategyCode && request.strategyCode !== 'ALL'
      ? [this.requireStrategy(request.strategyCode)]
      : this.registry.list().filter((strategy) => strategy.status !== 'DISABLED' && strategy.status !== 'DEPRECATED');
    const context = await this.buildContext(request);
    const results = strategies.map((strategy) => new StrategyFrameworkEvaluator(strategy).evaluateSignalCandidate(context));
    return {
      results,
      matchedStrategies: results.filter((result) => ['ENTRY_CANDIDATE', 'SIGNAL', 'WATCH', 'EXIT_CANDIDATE', 'REDUCE_RISK'].includes(result.decision) && result.blockers.length === 0),
      blockedStrategies: results.filter((result) => result.blockers.length > 0 || result.decision === 'INSUFFICIENT_DATA' || result.decision === 'AVOID'),
      warnings: context.instrumentId ? [] : ['Instrument could not be resolved.'],
    };
  }

  async evaluateContext(context: StrategyContext, strategyCode?: string): Promise<StrategySignalOutput[]> {
    const strategies = strategyCode && strategyCode !== 'ALL'
      ? [this.requireStrategy(strategyCode)]
      : this.registry.active();
    return strategies.map((strategy) => new StrategyFrameworkEvaluator(strategy).evaluateSignalCandidate(context));
  }

  async runBacktest(input: RegisteredBacktestInput, userId = 'default-user') {
    const strategy = this.requireStrategy(input.strategyCode);
    const config = new StrategyFrameworkEvaluator(strategy).getBacktestConfig(input);
    const { BacktestingStrategyLabService } = require('../backtesting-strategy-lab') as typeof import('../backtesting-strategy-lab');
    const backtestingService = new BacktestingStrategyLabService();
    const run = await backtestingService.run({ config }, userId);
    const metrics = (run as any).metrics;
    const timeframe = input.timeframe;
    const availability = this.availability(timeframe, config.startDate, config.endDate, metrics?.numberOfTrades ?? 0);
    const base: Omit<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility'> = {
      strategyCode: strategy.code,
      strategyVersion: strategy.version,
      timeframe,
      region: input.region || 'IN',
      assetType: input.assetType || 'STOCK',
      universeKey: this.universeKey(input.universe),
      startingCapital: config.initialCapital,
      endingCapital: metrics ? config.initialCapital * (1 + metrics.totalReturn) : config.initialCapital,
      totalReturn: metrics?.totalReturn ?? 0,
      cagr: metrics?.cagr ?? null,
      maxDrawdown: metrics?.maxDrawdown ?? 0,
      volatility: metrics?.volatility ?? null,
      sharpe: metrics?.sharpeRatio ?? null,
      winRate: metrics?.winRate ?? null,
      profitFactor: metrics?.profitFactor ?? null,
      tradeCount: metrics?.numberOfTrades ?? 0,
      averageHoldingDays: metrics?.averageHoldingDays ?? null,
      exposurePercent: null,
      backtestRunId: (run as any).id,
      generatedAt: new Date().toISOString(),
    };
    const performanceSummary = await this.repository.upsertPerformance({ ...base, ...StrategyFrameworkEvaluator.rate(base) });
    return { run, performanceSummary, availability };
  }

  model(): StrategyModelResponse {
    return {
      statuses: ['DRAFT', 'ACTIVE', 'DISABLED', 'DEPRECATED'],
      automationStatuses: ['NOT_ELIGIBLE', 'WATCHLIST_ONLY', 'PAPER_TRADING_ELIGIBLE', 'LIVE_TRADING_ELIGIBLE_FUTURE'],
      timeframes: STRATEGY_TIMEFRAMES,
      decisions: ['SIGNAL', 'ENTRY_CANDIDATE', 'WAIT', 'WATCH', 'AVOID', 'EXIT_CANDIDATE', 'REDUCE_RISK', 'HOLD', 'INSUFFICIENT_DATA'],
      ratingMethodology: [
        'UNPROVEN when history, trades, CAGR, or Sharpe are insufficient.',
        'Scores combine CAGR, max drawdown, Sharpe, win rate, profit factor, trade count, and coverage.',
        'Automation eligibility never enables live trading in the MVP.',
      ],
      ruleModel: [
        'Typed JSON rule declarations describe entry, exit, noise, risk, and market gates.',
        'TypeScript evaluators execute deterministic MVP rules.',
        'No scripting language or paid provider is required.',
      ],
      disclaimer: 'Research support only, not financial advice. No live trading or broker execution is enabled.',
    };
  }

  async health() {
    const configured = this.registry.list();
    const persisted = await this.repository.health(configured.length).catch(() => ({ strategiesWithBacktestResults: 0, missingPerformanceCount: configured.length, activeDefinitionsCount: configured.filter((strategy) => strategy.status === 'ACTIVE').length }));
    return {
      configuredStrategiesCount: configured.length,
      activeStrategiesCount: configured.filter((strategy) => strategy.status === 'ACTIVE').length,
      strategiesWithBacktestResults: persisted.strategiesWithBacktestResults,
      missingPerformanceCount: persisted.missingPerformanceCount,
    };
  }

  strategyToBacktestConfig(input: RegisteredBacktestInput) {
    return new StrategyFrameworkEvaluator(this.requireStrategy(input.strategyCode)).getBacktestConfig(input);
  }

  private async buildContext(request: StrategyEvaluateRequest): Promise<StrategyContext> {
    const instrument = await this.resolveInstrument(request);
    if (!instrument) return { symbol: request.symbol, region: request.region, assetType: request.assetType };
    const [pricesResponse, rawSignal, calibratedSignal, dataQuality, marketSummary, smartMoney] = await Promise.all([
      this.marketDataService.listPricesByInstrumentId(instrument.id, 5000).catch(() => ({ prices: [] })),
      this.signalService.latestForInstrument(instrument.id).catch(() => null),
      this.calibrationService.latestForInstrument(instrument.id).catch(() => null),
      this.dataQualityService.diagnostics(instrument.id).catch(() => null),
      this.contextService.summary({ region: request.region }).catch(() => null),
      this.smartMoneyService.stock(instrument.id, '3M').catch(() => null),
    ]);
    const prices = this.toPricePoints(pricesResponse?.prices || []);
    const closes = prices.map((price) => price.adjusted_close);
    const latest = prices[0] ?? null;
    const sector = marketSummary?.topSectors?.concat(marketSummary?.weakSectors || []).find((item: any) => item.sector === instrument.sector);
    return {
      instrumentId: instrument.id,
      symbol: instrument.symbol,
      companyName: instrument.company_name ?? instrument.name ?? null,
      assetType: request.assetType || instrument.asset_type || instrument.assetType || 'STOCK',
      region: request.region || instrument.region || instrument.country || 'IN',
      exchange: instrument.exchange ?? null,
      sector: instrument.sector ?? null,
      industry: instrument.industry ?? null,
      country: instrument.country ?? null,
      currency: instrument.currency ?? null,
      latestPrice: latest?.adjusted_close ?? null,
      previousClose: prices[1]?.adjusted_close ?? null,
      prices,
      sma50: this.sma(closes, 50),
      sma200: this.sma(closes, 200),
      rsi: this.rsi(closes, 14),
      return20d: this.returnAt(closes, 20),
      high52Week: this.periodHigh(closes, 252),
      low52Week: this.periodLow(closes, 252),
      volatility: this.volatility(closes.slice(0, 63)),
      averageVolume20: this.average(prices.slice(1, 21).map((price) => price.volume).filter((value): value is number => typeof value === 'number')),
      rawSignal,
      calibratedSignal: calibratedSignal ? {
        calibratedScore: calibratedSignal.calibratedScore,
        calibratedDirection: calibratedSignal.calibratedDirection,
        calibratedConfidence: calibratedSignal.calibratedConfidence,
      } : null,
      dataQuality,
      marketGate: this.marketGate(marketSummary?.regime?.regime, marketSummary?.breadth?.percentAboveSma50),
      marketRegime: marketSummary?.regime?.regime ?? null,
      sectorLeadership: sector?.leadershipStatus ?? null,
      sectorRelativeStrengthScore: sector?.relativeStrengthScore ?? null,
      smartMoneyStatus: smartMoney?.status ?? null,
      smartMoneyScore: smartMoney?.smartMoneyScore ?? null,
    };
  }

  private async resolveInstrument(request: StrategyEvaluateRequest): Promise<any | null> {
    if (request.instrumentId) return this.marketDataService.getInstrument(request.instrumentId);
    if (!request.symbol) return null;
    const response = await this.marketDataService.listInstruments({ search: request.symbol, pageSize: 25, region: request.region, assetType: request.assetType });
    return response.instruments.find((instrument: any) => instrument.symbol.toUpperCase() === request.symbol?.toUpperCase()) ?? response.instruments[0] ?? null;
  }

  private requireStrategy(code: string): StrategyDefinition {
    const strategy = this.registry.get(code);
    if (!strategy) throw new Error(`Strategy ${code} is not registered`);
    return strategy;
  }

  private matches(strategy: StrategyDefinition, query: StrategyListQuery) {
    if (query.status && strategy.status !== query.status) return false;
    if (query.category && strategy.category !== query.category) return false;
    if (query.style && strategy.style !== query.style) return false;
    if (query.region && !strategy.supportedRegions.includes(query.region) && !strategy.supportedRegions.includes('GLOBAL')) return false;
    if (query.assetType && !strategy.assetTypes.includes(query.assetType)) return false;
    return true;
  }

  private unprovenSummary(strategy: StrategyDefinition, timeframe: StrategyTimeframe, region: string, assetType: string): StrategyPerformanceSummaryDto {
    return {
      strategyCode: strategy.code,
      strategyVersion: strategy.version,
      timeframe,
      region,
      assetType,
      universeKey: 'DEFAULT',
      startingCapital: 0,
      endingCapital: 0,
      totalReturn: 0,
      cagr: null,
      maxDrawdown: 0,
      volatility: null,
      sharpe: null,
      winRate: null,
      profitFactor: null,
      tradeCount: 0,
      averageHoldingDays: null,
      exposurePercent: null,
      ratingScore: 20,
      ratingGrade: 'UNPROVEN',
      automationEligibility: 'NOT_ELIGIBLE',
      generatedAt: new Date().toISOString(),
    };
  }

  private availability(timeframe: StrategyTimeframe, startDate: string, endDate: string, trades: number) {
    const requestedYears = Number(timeframe.replace('Y', ''));
    const actualYears = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (trades === 0) return { timeframe, requestedYears, status: 'UNAVAILABLE' as const, message: 'No trades were produced; result is unproven.' };
    if (actualYears + 0.05 < requestedYears) return { timeframe, requestedYears, status: 'PARTIAL' as const, message: 'Available price history is shorter than requested timeframe.' };
    return { timeframe, requestedYears, status: 'AVAILABLE' as const, message: null };
  }

  private universeKey(universe?: RegisteredBacktestInput['universe']) {
    if (!universe || universe.type === 'ALL') return 'ALL_ELIGIBLE';
    if (universe.type === 'WATCHLIST') return `WATCHLIST:${universe.watchlistId || 'UNKNOWN'}`;
    if (universe.type === 'SYMBOLS') return `SYMBOLS:${(universe.symbols || []).sort().join(',')}`;
    return `INSTRUMENTS:${(universe.instrumentIds || []).sort().join(',')}`;
  }

  private marketGate(regime?: string | null, breadthAbove50?: number | null) {
    if (regime === 'RISK_ON' && (breadthAbove50 ?? 0) >= 0.6) return 'OPEN';
    if (regime === 'RISK_OFF' || (breadthAbove50 ?? 1) <= 0.3) return 'CLOSED';
    if (regime) return 'SELECTIVE';
    return 'UNKNOWN';
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

  private sma(values: number[], period: number) {
    return values.length >= period ? this.average(values.slice(0, period)) : null;
  }

  private rsi(values: number[], period: number) {
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

  private returnAt(values: number[], offset: number) {
    return values.length > offset && values[offset] > 0 ? (values[0] - values[offset]) / values[offset] : null;
  }

  private periodHigh(values: number[], period: number) {
    const scoped = values.slice(0, period);
    return scoped.length > 0 ? Math.max(...scoped) : null;
  }

  private periodLow(values: number[], period: number) {
    const scoped = values.slice(0, period);
    return scoped.length > 0 ? Math.min(...scoped) : null;
  }

  private volatility(values: number[]) {
    const returns = values.slice(1).map((value, index) => values[index + 1] > 0 ? (values[index] - value) / value : 0);
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

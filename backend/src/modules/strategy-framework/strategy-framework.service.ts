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
  StrategyProofRegistryResponse,
  StrategyProofRegistryRow,
  StrategyProofStatus,
  StrategySampleSufficiency,
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
    for (const row of this.currentVersionSummaries(performance, configured)) if (!latestByCode.has(row.strategyCode)) latestByCode.set(row.strategyCode, row);
    return configured.map((strategy) => ({ ...strategy, latestPerformance: latestByCode.get(strategy.code) ?? null }));
  }

  async detail(code: string, query: StrategyPerformanceQuery = {}) {
    const strategy = this.requireStrategy(code);
    const latestPerformanceSummaries = await this.performance(code, query).catch(() => []);
    return { ...strategy, latestPerformanceSummaries };
  }

  async performance(code: string, query: StrategyPerformanceQuery = {}) {
    const strategy = this.requireStrategy(code);
    const rows = await this.repository.performance(strategy.code, query).catch(() => []);
    return this.currentVersionSummaries(rows, [strategy]);
  }

  async proofRegistry(query: StrategyPerformanceQuery = {}): Promise<StrategyProofRegistryResponse> {
    const scope = this.proofScope(query);
    const strategies = this.registry.list().filter((strategy) => this.matches(strategy, { region: scope.region, assetType: scope.assetType }));
    const summaries = await this.repository.latestPerformanceForStrategies(strategies.map((strategy) => strategy.code), scope).catch(() => []);
    const latestByCode = new Map<string, StrategyPerformanceSummaryDto>();
    for (const summary of this.currentVersionSummaries(summaries, strategies)) {
      if (!latestByCode.has(summary.strategyCode)) latestByCode.set(summary.strategyCode, summary);
    }
    const rows = strategies.map((strategy) => this.proofRow(strategy, latestByCode.get(strategy.code) ?? null, scope));
    return {
      rows,
      statusCounts: this.proofStatusCounts(rows),
      scope: {
        region: scope.region,
        assetType: scope.assetType,
        universeKey: scope.universeKey || 'ALL_ELIGIBLE',
      },
      selectedTimeframe: scope.timeframe || '3Y',
    };
  }

  async proofDetail(code: string, query: StrategyPerformanceQuery = {}): Promise<StrategyProofRegistryRow> {
    const strategy = this.requireStrategy(code);
    const scope = this.proofScope(query);
    const [summary] = await this.performance(strategy.code, scope).catch(() => []);
    return this.proofRow(strategy, summary ?? null, scope);
  }

  async rankings(query: StrategyRankingsQuery = {}) {
    const persisted = await this.repository.rankings(query).catch(() => []);
    const activeByCode = new Map(this.registry.list().map((strategy) => [strategy.code, strategy]));
    const currentPersisted = persisted.filter((row) => activeByCode.get(row.strategyCode)?.version === row.strategyVersion);
    const currentCodes = new Set(currentPersisted.map((row) => row.strategyCode));
    const missingCurrentRows = this.registry.list()
      .filter((strategy) => !currentCodes.has(strategy.code))
      .map((strategy) => this.unprovenSummary(strategy, query.timeframe || '1Y', query.region || 'IN', query.assetType || 'STOCK'));
    return [...currentPersisted, ...missingCurrentRows]
      .filter((row) => !query.minRating || ratingRank(row.ratingGrade) >= ratingRank(query.minRating))
      .sort((left, right) => right.ratingScore - left.ratingScore || left.strategyCode.localeCompare(right.strategyCode));
  }

  async evaluate(request: StrategyEvaluateRequest) {
    const strategies = request.strategyCode && request.strategyCode !== 'ALL'
      ? [this.requireStrategy(request.strategyCode)]
      : this.registry.list().filter((strategy) => strategy.status !== 'DISABLED' && strategy.status !== 'DEPRECATED');
    const context = await this.buildContext(request);
    const results = strategies.map((strategy) => new StrategyFrameworkEvaluator(strategy).evaluateSignalCandidate(context));
    return {
      results,
      matchedStrategies: results.filter((result) => ['ENTRY_CANDIDATE', 'EXIT_CANDIDATE', 'REDUCE_RISK'].includes(result.decision) && result.blockers.length === 0),
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
    const strategy = this.requireStandaloneBacktestStrategy(input.strategyCode);
    const config = new StrategyFrameworkEvaluator(strategy).getBacktestConfig(input);
    const { BacktestingStrategyLabService } = require('../backtesting-strategy-lab') as typeof import('../backtesting-strategy-lab');
    const backtestingService = new BacktestingStrategyLabService();
    const run = await backtestingService.run({ config }, userId);
    const performanceSummary = (await this.performance(strategy.code, {
      timeframe: input.timeframe,
      region: input.region || 'IN',
      assetType: input.assetType || 'STOCK',
      universeKey: this.universeKey(input.universe),
    }))[0];
    return {
      run,
      performanceSummary,
      availability: {
        timeframe: input.timeframe,
        requestedYears: Number(input.timeframe.replace('Y', '')),
        status: run.metrics?.availabilityStatus || (run.status === 'FAILED' ? 'ERROR' : 'NOT_RUN'),
        message: run.error || null,
      },
    };
  }

  async persistBacktestPerformance(input: {
    strategyCode: string;
    strategyVersion?: string;
    timeframe: StrategyTimeframe;
    region: string;
    assetType: string;
    universeKey: string;
    initialCapital: number;
    backtestRunId?: string | null;
    metrics: {
      totalReturn: number;
      cagr: number | null;
      maxDrawdown: number;
      volatility: number | null;
      sharpeRatio: number | null;
      winRate: number | null;
      profitFactor: number | null;
      numberOfTrades: number;
      averageHoldingDays: number | null;
      exitDiagnostics?: {
        endOfTestExitPercent: number;
      };
      benchmarkComparison?: {
        benchmarkTotalReturn: number | null;
        benchmarkCagr: number | null;
        excessReturn: number | null;
        excessCagr: number | null;
      };
      dataCoveragePercent?: number;
    };
    exposurePercent?: number | null;
    dataCoverageScore?: number;
  }): Promise<StrategyPerformanceSummaryDto> {
    const strategy = this.requireStrategy(input.strategyCode);
    const base: Omit<StrategyPerformanceSummaryDto, 'ratingScore' | 'ratingGrade' | 'automationEligibility' | 'readinessLabel' | 'ratingReasons' | 'ratingWarnings' | 'ratingCapsApplied'> & { dataCoverageScore?: number; strategyStatus?: string } = {
      strategyCode: strategy.code,
      strategyVersion: strategy.version,
      timeframe: input.timeframe,
      region: input.region || 'IN',
      assetType: input.assetType || 'STOCK',
      universeKey: input.universeKey || 'ALL_ELIGIBLE',
      startingCapital: input.initialCapital,
      endingCapital: input.initialCapital * (1 + input.metrics.totalReturn),
      totalReturn: input.metrics.totalReturn,
      cagr: input.metrics.cagr,
      maxDrawdown: input.metrics.maxDrawdown,
      volatility: input.metrics.volatility,
      sharpe: input.metrics.sharpeRatio,
      winRate: input.metrics.winRate,
      profitFactor: input.metrics.profitFactor,
      tradeCount: input.metrics.numberOfTrades,
      averageHoldingDays: input.metrics.averageHoldingDays,
      exposurePercent: input.exposurePercent ?? null,
      benchmarkTotalReturn: input.metrics.benchmarkComparison?.benchmarkTotalReturn,
      benchmarkCagr: input.metrics.benchmarkComparison?.benchmarkCagr,
      excessReturn: input.metrics.benchmarkComparison?.excessReturn,
      excessCagr: input.metrics.benchmarkComparison?.excessCagr,
      endOfTestExitPercent: input.metrics.exitDiagnostics?.endOfTestExitPercent,
      dataCoveragePercent: input.metrics.dataCoveragePercent,
      backtestRunId: input.backtestRunId ?? null,
      generatedAt: new Date().toISOString(),
      dataCoverageScore: input.dataCoverageScore,
      strategyStatus: strategy.status,
    };
    const rated = StrategyFrameworkEvaluator.rate(base);
    return this.repository.upsertPerformance({ ...base, ...rated });
  }

  getDefinition(code: string): StrategyDefinition {
    return this.requireStrategy(code);
  }

  model(): StrategyModelResponse {
    return {
      statuses: ['DRAFT', 'ACTIVE', 'DISABLED', 'DEPRECATED'],
      automationStatuses: ['NOT_ELIGIBLE', 'WATCHLIST_ONLY', 'PAPER_TEST_CANDIDATE'],
      timeframes: STRATEGY_TIMEFRAMES,
      decisions: ['SIGNAL', 'ENTRY_CANDIDATE', 'WAIT', 'WATCH', 'AVOID', 'EXIT_CANDIDATE', 'REDUCE_RISK', 'HOLD', 'INSUFFICIENT_DATA'],
      ratingMethodology: [
        'UNPROVEN when history, trades, CAGR, or Sharpe are insufficient.',
        'Scores combine CAGR, max drawdown, Sharpe, win rate, profit factor, trade count, and coverage.',
        'Readiness labels support research review only and never enable real-money automation.',
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
    return new StrategyFrameworkEvaluator(this.requireStandaloneBacktestStrategy(input.strategyCode)).getBacktestConfig(input);
  }

  proofRow(strategy: StrategyDefinition, summary: StrategyPerformanceSummaryDto | null, query: StrategyPerformanceQuery = {}): StrategyProofRegistryRow {
    const scope = this.proofScope(query);
    const sample = this.sample(summary?.tradeCount ?? 0, scope.timeframe || '3Y', strategy);
    const status = this.proofStatus(strategy, summary, sample);
    const missingEvidenceReason = this.missingEvidenceReason(strategy, summary, sample, status, scope.timeframe || '3Y');
    return {
      strategyCode: strategy.code,
      strategyVersion: summary?.strategyVersion || strategy.version,
      strategyName: strategy.name,
      category: strategy.status === 'DRAFT' ? 'DRAFT' : strategy.category,
      status,
      scope: {
        region: scope.region,
        assetType: scope.assetType,
        universeKey: summary?.universeKey || scope.universeKey || 'ALL_ELIGIBLE',
      },
      selectedTimeframe: scope.timeframe || '3Y',
      latestEvaluationDate: summary?.generatedAt ?? null,
      sample,
      performance: {
        cagr: summary?.cagr ?? null,
        maxDrawdown: summary?.maxDrawdown ?? null,
        sharpe: summary?.sharpe ?? null,
        winRate: summary?.winRate ?? null,
        profitFactor: summary?.profitFactor ?? null,
        dataCoveragePercent: summary?.dataCoveragePercent ?? null,
        benchmarkCagr: summary?.benchmarkCagr ?? null,
        excessCagr: summary?.excessCagr ?? null,
      },
      rating: {
        ratingGrade: summary?.ratingGrade ?? null,
        readinessLabel: summary?.readinessLabel ?? null,
        reasons: summary?.ratingReasons ?? [],
        warnings: summary?.ratingWarnings ?? [],
        capsApplied: summary?.ratingCapsApplied ?? [],
      },
      missingEvidenceReason,
      nextAction: this.nextProofAction(strategy, status, scope.timeframe || '3Y', scope.region, scope.assetType),
    };
  }

  private async buildContext(request: StrategyEvaluateRequest): Promise<StrategyContext> {
    const instrument = await this.resolveInstrument(request);
    if (!instrument) return { symbol: request.symbol, region: request.region, assetType: request.assetType };
    const [pricesResponse, rawSignal, calibratedSignal, dataQuality, marketSummary, smartMoney] = await Promise.all([
      this.marketDataService.listPricesByInstrumentId(instrument.id, 5000).catch(() => ({ prices: [] })),
      this.signalService.latestForInstrument(instrument.id).catch(() => null),
      this.calibrationService.latestForInstrument(instrument.id).catch(() => null),
      this.dataQualityService.diagnostics(instrument.id).catch(() => null),
      this.latestPersistedMarketSummary(request.region),
      this.latestPersistedSmartMoney(instrument.id),
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
      bars: prices.map((price) => ({
        date: price.date,
        close: price.adjusted_close,
        volume: price.volume,
      })),
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

  private currentVersionSummaries(rows: StrategyPerformanceSummaryDto[], strategies: StrategyDefinition[]): StrategyPerformanceSummaryDto[] {
    const versionsByCode = new Map(strategies.map((strategy) => [strategy.code, strategy.version]));
    return rows.filter((row) => versionsByCode.get(row.strategyCode) === row.strategyVersion);
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

  private requireStandaloneBacktestStrategy(code: string): StrategyDefinition {
    const strategy = this.requireStrategy(code);
    if (strategy.status !== 'ACTIVE') {
      throw new Error(`Strategy ${strategy.code} is ${strategy.status} and cannot be run as a registered backtest.`);
    }
    if (strategy.category !== 'ENTRY') {
      throw new Error(`Strategy ${strategy.code} is a ${strategy.category} rule. Registered backtests currently support active ENTRY strategies only.`);
    }
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
      readinessLabel: 'RESEARCH_ONLY',
      ratingReasons: ['No persisted performance summary exists yet.'],
      generatedAt: new Date().toISOString(),
    };
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

  private proofScope(query: StrategyPerformanceQuery): Required<Pick<StrategyPerformanceQuery, 'timeframe' | 'region' | 'assetType'>> & { universeKey?: string } {
    return {
      timeframe: query.timeframe || '3Y',
      region: query.region || 'IN',
      assetType: query.assetType || 'STOCK',
      universeKey: query.universeKey || 'ALL_ELIGIBLE',
    };
  }

  private proofStatus(strategy: StrategyDefinition, summary: StrategyPerformanceSummaryDto | null, sample: StrategyProofRegistryRow['sample']): StrategyProofStatus {
    if (strategy.status === 'DISABLED' || strategy.status === 'DEPRECATED' || (strategy.status === 'ACTIVE' && strategy.category !== 'ENTRY')) return 'BLOCKED';
    if (strategy.status === 'DRAFT') return 'UNPROVEN';
    if (!summary) return 'MISSING';
    if (summary.ratingGrade === 'WEAK' || summary.ratingGrade === 'UNPROVEN' || sample.sampleSufficiency === 'INSUFFICIENT') return 'UNPROVEN';
    if (
      summary.ratingGrade === 'AVERAGE' ||
      sample.sampleSufficiency === 'LOW_SAMPLE' ||
      (summary.ratingWarnings || []).length > 0 ||
      (summary.ratingCapsApplied || []).length > 0 ||
      (typeof summary.dataCoveragePercent === 'number' && summary.dataCoveragePercent < 0.8) ||
      typeof summary.benchmarkCagr !== 'number' ||
      Math.abs(summary.maxDrawdown ?? 0) >= 0.35
    ) return 'LIMITED';
    if ((summary.ratingGrade === 'GOOD' || summary.ratingGrade === 'EXCELLENT') && sample.sampleSufficiency === 'SUFFICIENT') return 'PROVEN';
    return 'LIMITED';
  }

  private sample(tradeCount: number, timeframe: StrategyTimeframe, strategy: StrategyDefinition): StrategyProofRegistryRow['sample'] {
    if (strategy.category !== 'ENTRY' || strategy.status === 'DISABLED' || strategy.status === 'DEPRECATED') {
      return { tradeCount, requiredTradeCount: 0, sampleSufficiency: 'NOT_APPLICABLE' };
    }
    const requiredTradeCount = this.requiredTradeCount(timeframe);
    return {
      tradeCount,
      requiredTradeCount,
      sampleSufficiency: this.sampleSufficiency(tradeCount, requiredTradeCount),
    };
  }

  private requiredTradeCount(timeframe: StrategyTimeframe): number {
    return { '1Y': 30, '3Y': 60, '5Y': 90, '10Y': 120, '15Y': 150 }[timeframe];
  }

  private sampleSufficiency(tradeCount: number, requiredTradeCount: number): StrategySampleSufficiency {
    if (requiredTradeCount === 0) return 'NOT_APPLICABLE';
    if (tradeCount >= requiredTradeCount) return 'SUFFICIENT';
    if (tradeCount >= Math.ceil(requiredTradeCount / 2)) return 'LOW_SAMPLE';
    return 'INSUFFICIENT';
  }

  private missingEvidenceReason(strategy: StrategyDefinition, summary: StrategyPerformanceSummaryDto | null, sample: StrategyProofRegistryRow['sample'], status: StrategyProofStatus, timeframe: StrategyTimeframe): string | null {
    if (status === 'BLOCKED') return strategy.category !== 'ENTRY' ? `${strategy.category} strategies are support rules and cannot be standalone registered backtests in this slice.` : `${strategy.status} strategies are not eligible for proof promotion.`;
    if (strategy.status === 'DRAFT') return 'Draft strategy requires promotion and bounded backtest evidence before proof can be accepted.';
    if (!summary) return `No compact StrategyPerformanceSummary exists for ${timeframe} in the selected scope.`;
    if (sample.sampleSufficiency === 'INSUFFICIENT') return `Only ${sample.tradeCount} trades are available; ${sample.requiredTradeCount} are required for this timeframe.`;
    if (summary.ratingGrade === 'WEAK' || summary.ratingGrade === 'UNPROVEN') return `Rating grade ${summary.ratingGrade} does not satisfy proof criteria.`;
    return null;
  }

  private nextProofAction(strategy: StrategyDefinition, status: StrategyProofStatus, timeframe: StrategyTimeframe, region: string, assetType: string): StrategyProofRegistryRow['nextAction'] {
    if (status === 'PROVEN') {
      return { label: 'Inspect proof details', targetRoute: `/strategies?strategyCode=${encodeURIComponent(strategy.code)}`, sourceModule: 'strategy-framework' };
    }
    if (strategy.status === 'ACTIVE' && strategy.category === 'ENTRY') {
      return { label: 'Inspect or run bounded backtest', targetRoute: `/backtests?mode=registered&strategyCode=${encodeURIComponent(strategy.code)}&timeframe=${timeframe}&region=${region}&assetType=${assetType}`, sourceModule: 'backtesting-strategy-lab' };
    }
    return { label: 'Review strategy definition', targetRoute: `/strategies?strategyCode=${encodeURIComponent(strategy.code)}`, sourceModule: 'strategy-framework' };
  }

  private proofStatusCounts(rows: StrategyProofRegistryRow[]): Record<StrategyProofStatus, number> {
    const counts: Record<StrategyProofStatus, number> = { PROVEN: 0, LIMITED: 0, UNPROVEN: 0, BLOCKED: 0, MISSING: 0 };
    for (const row of rows) counts[row.status] += 1;
    return counts;
  }
}

function ratingRank(grade: string): number {
  return { UNPROVEN: 0, WEAK: 1, AVERAGE: 2, GOOD: 3, EXCELLENT: 4 }[grade] ?? 0;
}

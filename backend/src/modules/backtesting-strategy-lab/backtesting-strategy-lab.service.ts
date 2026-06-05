import { MarketDataFoundationService } from '../market-data-foundation';
import { SubscriptionBillingService } from '../subscription-billing';
import { WatchlistManagementService } from '../watchlist-management';
import { DataQualityEngineService } from '../data-quality-engine';
import { StrategyFrameworkEvaluator, StrategyFrameworkRegistry, StrategyFrameworkService } from '../strategy-framework';

/**
 * Annualised risk-free rate used in Sharpe calculation.
 * Represents the approximate Indian 91-day T-bill / Repo rate baseline (2024).
 * Expressed as a decimal (0.065 = 6.5% p.a.).
 */
const ANNUAL_RISK_FREE_RATE_IN = 0.065;
/** Daily risk-free rate derived from the annual constant (continuous approximation). */
const DAILY_RISK_FREE_RATE = ANNUAL_RISK_FREE_RATE_IN / 252;

/**
 * CB-12 — India delivery-equity transaction cost model.
 *
 * Realistic one-way components (NSE/BSE delivery trade, FY-2024 rates):
 *   STT (sell-side only)               0.1000 %
 *   Exchange transaction charge (NSE)  0.0035 %
 *   SEBI turnover fee                  0.0001 %
 *   Stamp duty (buy-side only)         0.0150 %
 *   GST on brokerage+exchange charges  0.0007 % (approx)
 *   Brokerage (discount broker, cap)   0.0300 % (typical per leg)
 *   DP (demat) charge per sell trade   ~₹15–20 flat → ~0.0050 % on ₹30 000 avg
 *   ─────────────────────────────────────────────────────────────
 *   Approximate one-way               ~0.15–0.22 %
 *   Round-trip (entry + exit)          0.30–0.44 %  → default 0.225 % per leg
 *
 * DEFAULT_INDIA_ONE_WAY_COST_PERCENT = 0.00225 (0.225 % per leg)
 * Round-trip total ≈ 0.45 % — consistent with CB-12 requirement (0.35–0.55 %).
 *
 * This constant is used as the default `transactionCostPercent` when the
 * caller does not specify a cost and the region is 'IN'.  Callers may override
 * it by setting `config.transactionCostPercent` explicitly.
 */
export const DEFAULT_INDIA_ONE_WAY_COST_PERCENT = 0.00225; // 0.225 % per leg → 0.45 % round-trip
import {
  BREADTH_WEAK_THRESHOLD,
  BREADTH_VERY_WEAK_THRESHOLD,
} from '../market-context-intelligence/capital-posture.types';
// Lazy import to keep the dependency one-directional (historical-context-snapshots
// does NOT import backtesting-strategy-lab, so no cycle risk here).
import { HistoricalContextSnapshotsRepository } from '../historical-context-snapshots/historical-context-snapshots.repository';
import { BacktestingStrategyLabRepository } from './backtesting-strategy-lab.repository';
import type {
  BacktestMetrics,
  BacktestRunDto,
  BacktestRunListQuery,
  BacktestStrategyConfig,
  BacktestTrade,
  CreateBacktestStrategyRequest,
  EquityCurvePoint,
  HistoricalBar,
  RunBacktestRequest,
  UpdateBacktestStrategyRequest,
  WalkForwardResult,
  WalkForwardSegmentResult,
} from './backtesting-strategy-lab.types';
import { validateConfig, validateStrategyInput } from './backtesting-strategy-lab.validation';

/**
 * Slim row shape we pull from MarketContextSnapshot for per-bar regime lookup.
 * Only the fields the backtest actually needs.
 */
interface RegimeSnapshotRow {
  /** YYYY-MM-DD UTC date key, derived from snapshotDate */
  dateKey: string;
  regime: string;
  /** breadthPercentAboveSma50 — may be null if not captured */
  breadthAbove50: number | null;
}

/**
 * Derives the marketGate string from a persisted regime + breadth value.
 *
 * Thresholds are sourced exclusively from capital-posture.types.ts (Capital Posture
 * is the single source of truth for regime/breadth gate thresholds).  This aligns
 * the backtest path with strategy-decision-engine's marketGateFromSummary so that
 * the same breadth value produces the same gate in every code path.
 *
 *   OPEN      ← RISK_ON AND breadth ≥ BREADTH_WEAK_THRESHOLD (0.40)
 *   CLOSED    ← RISK_OFF OR breadth < BREADTH_VERY_WEAK_THRESHOLD (0.25)
 *   SELECTIVE ← everything else (NEUTRAL / weak-breadth RISK_ON)
 *   UNKNOWN   ← no regime data
 */
function marketGateFromRegime(regime: string | null | undefined, breadthAbove50: number | null | undefined): string {
  if (regime === 'RISK_ON' && (breadthAbove50 ?? 0) >= BREADTH_WEAK_THRESHOLD) return 'OPEN';
  if (regime === 'RISK_OFF' || (breadthAbove50 ?? 1) < BREADTH_VERY_WEAK_THRESHOLD) return 'CLOSED';
  if (regime) return 'SELECTIVE';
  return 'UNKNOWN';
}

interface Position { instrumentId: string; symbol: string; entryDate: string; entryPrice: number; quantity: number; entryBarIndex: number; cost: number; committedCapital: number; entryReasons?: string[]; highestClose: number }
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

/**
 * Strategy codes whose entry scoring depends on sectorLeadership or
 * smartMoneyStatus context — both of which are approximated from price
 * proxies in the backtest path (not real sector-RS or institutional data).
 * A PRICE_PROXY_CONTEXT warning is surfaced whenever one of these strategies
 * is under test.
 */
const PRICE_PROXY_DEPENDENT_STRATEGIES: ReadonlySet<string> = new Set([
  'SECTOR_LEADER_MOMENTUM',
  'SMART_MONEY_ACCUMULATION',
  'TREND_MOMENTUM',         // scoreSectorAndSmartMoney is called for TREND_MOMENTUM too
  'BREAKOUT_CONFIRMATION',  // requireContext for sectorLeadership + smartMoneyStatus
]);

/**
 * Minimum number of bars of price history before signalReadinessStatus
 * transitions from LIMITED → READY in strategyContextFromBars.
 * Entry strategies are blocked for READY-only in the common-noise gate.
 */
const SIGNAL_READINESS_WARM_UP_BARS = 200;

export class BacktestingStrategyLabService {
  constructor(
    private readonly repository = new BacktestingStrategyLabRepository(),
    private readonly marketDataService = new MarketDataFoundationService(),
    private readonly watchlistService = new WatchlistManagementService(),
    private readonly subscriptionService = new SubscriptionBillingService(),
    private readonly dataQualityService = new DataQualityEngineService(),
    private readonly strategyRegistry = new StrategyFrameworkRegistry(),
    private readonly strategyFrameworkService = new StrategyFrameworkService(),
    // Optional injection for testing — defaults to the real repository.
    // Using optional injection so that existing tests that don't supply it
    // still compile without changes (they mock snapshot lookup via the
    // regimeIndex argument threaded into strategyContextFromBars).
    private readonly snapshotsRepository: HistoricalContextSnapshotsRepository = new HistoricalContextSnapshotsRepository()
  ) {}

  listStrategies(userId = 'default-user') { return this.repository.listStrategies(userId); }
  getStrategy(id: string, userId = 'default-user') { return this.repository.getStrategy(id, userId); }
  deleteStrategy(id: string, userId = 'default-user') { return this.repository.deleteStrategy(id, userId); }
  async listRuns(userId = 'default-user', query: BacktestRunListQuery = {}) {
    const runs = await this.repository.listRuns(userId);
    const filtered = runs.map((run) => this.normalizePersistedRun(run)).filter((run) => this.runMatchesScope(run, query));
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return filtered.slice(offset, offset + limit);
  }
  async getRun(id: string, userId = 'default-user') {
    const run = await this.repository.getRun(id, userId);
    return run ? this.normalizePersistedRun(run) : null;
  }
  deleteRun(id: string, userId = 'default-user') { return this.repository.deleteRun(id, userId); }

  async createStrategy(input: CreateBacktestStrategyRequest, userId = 'default-user') {
    this.throwIfErrors(validateStrategyInput(input));
    if (this.isRegisteredConfig(input.config)) this.assertBacktestableRegisteredStrategy(input.config.strategyCode!);
    return this.repository.createStrategy(input, userId);
  }

  async updateStrategy(id: string, input: UpdateBacktestStrategyRequest, userId = 'default-user') {
    const existing = await this.repository.getStrategy(id, userId);
    if (!existing) throw new Error('Strategy not found');
    const merged = { ...existing, ...input, config: input.config ?? existing.config };
    this.throwIfErrors(validateStrategyInput(merged, false));
    if (this.isRegisteredConfig(merged.config)) this.assertBacktestableRegisteredStrategy(merged.config.strategyCode!);
    return this.repository.updateStrategy(id, input, userId);
  }

  async run(request: RunBacktestRequest, userId = 'default-user'): Promise<BacktestRunDto> {
    await this.subscriptionService.assertAllowed('RUN_BACKTEST', userId);
    const strategy = request.strategyId ? await this.repository.getStrategy(request.strategyId, userId) : null;
    if (request.strategyId && !strategy) throw new Error('Strategy not found');
    const config = this.normalizeConfig(request.config ?? strategy?.config);
    this.throwIfErrors(validateConfig(config));
    if (this.isRegisteredConfig(config!)) this.assertBacktestableRegisteredStrategy(config!.strategyCode!);
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
        const frameworkStrategy = this.strategyRegistry.get(config!.strategyCode!);
        const summary = await this.strategyFrameworkService.persistBacktestPerformance({
          strategyCode: config!.strategyCode!,
          strategyVersion: frameworkStrategy?.version ?? config!.strategyVersion,
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
          frameworkStrategyName: frameworkStrategy?.name ?? config!.strategyCode!,
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

  /**
   * Fetches the Nifty 50 (^NSEI) EOD price series for the given window.
   * Returns bars sorted ascending by date. Returns an empty array when the
   * series is unavailable or insufficient (caller falls back to equal-weight).
   */
  private async fetchNifty50Bars(startDate: string, endDate: string): Promise<HistoricalBar[]> {
    try {
      const raw = await this.marketDataService.listPrices(
        '^NSEI',
        5000,
        new Date(startDate),
        new Date(endDate),
      );
      return (raw || [])
        .map((price: any) => ({
          date: new Date(price.timestamp ?? price.date).toISOString().slice(0, 10),
          close: Number(price.adjustedClose ?? price.adjusted_close ?? price.close),
          volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
        }))
        .filter((bar: HistoricalBar) => Number.isFinite(bar.close))
        .sort((a: HistoricalBar, b: HistoricalBar) => a.date.localeCompare(b.date));
    } catch {
      return [];
    }
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
      // CB-13: include OHLC fields so stop checks can use bar low/high for intrabar gaps.
      // Prefer adjusted fields (adjusted_open, adjusted_high, adjusted_low, adjusted_close)
      // where available; fall back to raw OHLC; use close as fallback for open/high/low.
      const bars = (response?.prices || [])
        .map((price: any) => {
          const close = Number(price.adjusted_close ?? price.close);
          const open = price.adjusted_open ?? price.open ?? close;
          const high = price.adjusted_high ?? price.high ?? close;
          const low = price.adjusted_low ?? price.low ?? close;
          return {
            date: new Date(price.date).toISOString().slice(0, 10),
            open: Number.isFinite(Number(open)) ? Number(open) : close,
            high: Number.isFinite(Number(high)) ? Number(high) : close,
            low: Number.isFinite(Number(low)) ? Number(low) : close,
            close,
            volume: price.volume !== null && price.volume !== undefined ? Number(price.volume) : null,
          };
        })
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

    // Preload persisted MarketContextSnapshot rows for this backtest's date
    // range once.  The sorted array is then used for in-memory as-of lookups
    // per bar — no further DB queries inside the hot loop.
    const regimeIndex = await this.preloadRegimeSnapshots(
      config.startDate,
      config.endDate,
      config.region || 'IN',
    );

    let cash = config.initialCapital;
    let peak = config.initialCapital;
    const positions = new Map<string, Position>();
    const trades: BacktestTrade[] = [];
    const curve: EquityCurvePoint[] = [];

    // Fix #10: maintain a per-instrument last-known-close map updated each bar
    // to avoid the O(n²) barAtOrBefore scan for investedValue computation.
    const lastKnownClose = new Map<string, number>();

    // Fix #1: track bars for which no regime snapshot was found (UNKNOWN gate).
    let regimeMissingBarCount = 0;
    let totalBarCount = 0;

    // Honest-labeling #48: count instrument-bars that are in warm-up
    // (barIndex + 1 < SIGNAL_READINESS_WARM_UP_BARS) — entries are blocked
    // during this window, so short windows understate live performance.
    let warmUpBarCount = 0;
    // Honest-labeling #48: count instrument-bars where liquidityStatus=UNKNOWN
    // (averageVolume20 === null) — entries are blocked by the LIQUIDITY_UNKNOWN
    // gate; this is sparse-volume data, not true illiquidity.
    let liquidityUnknownBarCount = 0;

    // pendingEntries: signals evaluated on bar[T], filled at bar[T+1] open
    // (Fix #3: next-bar fill — 1-bar lag between signal and fill).
    // Each entry holds the signal date, fill-bar index, entry reasons.
    type PendingEntry = { instrumentId: string; symbol: string; signalDate: string; fillBarIndex: number; reasons: string[] };
    const pendingEntries: PendingEntry[] = [];

    dates.forEach((date, dateIndex) => {
      // ── Step 1: update last-known-close & process exits ──────────────────
      // Fix #1: count bars lacking regime context for realismWarnings
      const regimeRow = this.regimeAsOf(regimeIndex, date);
      if (regimeRow === null) regimeMissingBarCount += 1;
      totalBarCount += 1;

      for (const history of histories.values()) {
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;
        const bar = history.bars[barIndex];
        lastKnownClose.set(history.instrumentId, bar.close);
        const position = positions.get(history.instrumentId);
        if (position) position.highestClose = Math.max(position.highestClose, bar.close);
        const exit = position ? this.exitDecision(config, history.bars, barIndex, position, regimeIndex) : null;
        if (position && exit?.exit) {
          const registeredExit = exit.reason === EXIT_REASONS.STRATEGY_EXIT
            ? this.evaluateRegisteredStrategy(config, history.bars, barIndex, true, position, regimeIndex)
            : null;
          const exitReasons = registeredExit ? this.uniqueStrings([
            ...registeredExit.exitRulesTriggered,
            ...registeredExit.invalidationRulesTriggered,
            ...registeredExit.reasons,
          ]) : [];
          // CB-13: pass stopFillPrice so intrabar stop/TP uses the correct fill price
          const trade = this.closePosition(config, position, bar, exit.reason, exitReasons, exit.stopFillPrice);
          cash += this.exitCash(config, position.quantity, trade.exitPrice);
          trades.push(trade);
          positions.delete(history.instrumentId);
        }
      }

      // ── Step 2: fill any pending entries whose fill bar is TODAY ─────────
      // (these were signalled on bar[T-1], now filled at bar[T] close)
      const toFill = pendingEntries.filter((pe) => pe.fillBarIndex === dateIndex);
      // Remove them from the pending queue before processing (splice backwards)
      for (let i = pendingEntries.length - 1; i >= 0; i--) {
        if (pendingEntries[i].fillBarIndex === dateIndex) pendingEntries.splice(i, 1);
      }
      // Fix #6: precompute entry candidate count for the fill batch so that
      // EQUAL_WEIGHT sizing uses the correct denominator (not the running
      // positions.size at time of each fill).
      const fillSlotsFree = Math.max(0, config.maxPositions - positions.size);
      const fillCandidates = toFill.filter(
        (pe) => !positions.has(pe.instrumentId) && positions.size + toFill.indexOf(pe) < config.maxPositions,
      );
      const fillCount = Math.min(toFill.length, fillSlotsFree);
      for (let fi = 0; fi < fillCount; fi++) {
        const pe = toFill[fi];
        if (positions.has(pe.instrumentId)) continue;
        if (positions.size >= config.maxPositions) break;
        const history = histories.get(pe.instrumentId);
        if (!history) continue;
        const fillBar = history.bars[pe.fillBarIndex];
        if (!fillBar) continue;
        // Fix #6: denominator = fillCount (pre-computed candidates in this batch)
        const remainingSlots = fillCount - fi;
        const amount = config.positionSizeType === 'FIXED_AMOUNT'
          ? Number(config.fixedAmountPerTrade)
          : cash / Math.max(1, config.maxPositions - positions.size);
        const costAdjustedAmount = Math.min(cash, amount);
        const transactionCost = costAdjustedAmount * config.transactionCostPercent;
        const tradeAmount = costAdjustedAmount - transactionCost;
        if (tradeAmount <= 0 || cash < costAdjustedAmount) continue;
        // Fix #3: fill at next bar's close (proxy for next-open; no open field)
        const entryPrice = this.applyEntrySlippage(fillBar.close, config);
        const quantity = tradeAmount / entryPrice;
        cash -= costAdjustedAmount;
        positions.set(pe.instrumentId, {
          instrumentId: pe.instrumentId,
          symbol: pe.symbol,
          entryDate: fillBar.date,    // actual fill date (T+1)
          entryPrice,
          quantity,
          entryBarIndex: pe.fillBarIndex,
          cost: transactionCost,
          committedCapital: costAdjustedAmount,
          entryReasons: pe.reasons,
          highestClose: fillBar.close,
        });
        // Suppress unused variable warning
        void remainingSlots;
      }
      void fillCandidates; // suppress unused warning

      // ── Step 3: evaluate entry signals on TODAY → schedule fill for T+1 ──
      // (Fix #3: no same-bar fill; schedule for next date index)
      for (const history of histories.values()) {
        if (positions.has(history.instrumentId)) continue;
        if (pendingEntries.some((pe) => pe.instrumentId === history.instrumentId)) continue;
        if (positions.size >= config.maxPositions) continue;
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;

        // Honest-labeling #48: tally warm-up and liquidity-unknown bars.
        // barIndex+1 = number of available closes at this point (the current bar inclusive).
        const closesAvailableAtBar = barIndex + 1;
        if (closesAvailableAtBar < SIGNAL_READINESS_WARM_UP_BARS) warmUpBarCount += 1;
        // Count liquidity-unknown only when we have prior bars but they ALL have
        // null volume — this mirrors averageVolume20 === null from strategyContextFromBars
        // and flags sparse volume DATA (not the unavoidable first-bar warm-up edge case).
        if (barIndex > 0) {
          const recentBars = history.bars.slice(Math.max(0, barIndex - 20), barIndex);
          const recentVolumes = recentBars.map((b) => b.volume).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
          if (recentVolumes.length === 0) liquidityUnknownBarCount += 1;
        }

        const entry = this.entryDecision(config, history.bars, barIndex, regimeIndex);
        if (!entry.enter) continue;
        // Schedule fill at next date (T+1); if this is the last date, skip
        // (no next bar to fill into — consistent with real-world).
        const nextDateIndex = dateIndex + 1;
        if (nextDateIndex >= dates.length) continue;
        const nextDate = dates[nextDateIndex];
        const nextBarIndex = history.bars.findIndex((bar) => bar.date === nextDate);
        if (nextBarIndex < 0) continue;
        pendingEntries.push({ instrumentId: history.instrumentId, symbol: history.symbol, signalDate: date, fillBarIndex: nextBarIndex, reasons: entry.reasons });
      }

      // ── Step 4: mark-to-market using last-known-close map (Fix #10) ──────
      const investedValue = [...positions.values()].reduce((sum, position) => {
        const close = lastKnownClose.get(position.instrumentId) ?? position.entryPrice;
        return sum + position.quantity * close;
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
    // Fix #5: CAGR years denominator — use max(firstEntryDate, configStart)
    // so both strategy and benchmark CAGR span the same window.
    const strategyFirstEntryDate = trades.length > 0
      ? trades.reduce((earliest, t) => t.entryDate < earliest ? t.entryDate : earliest, trades[0].entryDate)
      : undefined;
    const effectiveStartDate = strategyFirstEntryDate ?? config.startDate;
    const baseMetrics = this.metrics(config.initialCapital, curve, trades, config, effectiveStartDate);

    // Nifty 50 real benchmark: fetch for IN-scoped backtests; fall back to
    // equal-weight when the index series is absent/insufficient for the window.
    const isIndiaRegion = !config.region || config.region === 'IN';
    const nifty50Bars = isIndiaRegion
      ? await this.fetchNifty50Bars(config.startDate, config.endDate)
      : [];
    const benchmarkComparison = this.benchmarkComparison(config, histories, dates, baseMetrics, strategyFirstEntryDate, nifty50Bars);

    // Fix 3: surface universe cap prominently at the top level.
    const universeSummary = config.universe.type === 'ALL' ? {
      universeCapped: universe.capped ?? false,
      universeCap: universe.cap,
      universeRequested: universe.totalAvailable,
    } : undefined;
    if (universeSummary?.universeCapped) {
      console.warn(`[BacktestingStrategyLab] Universe ALL capped to ${universeSummary.universeCap} of ${universeSummary.universeRequested} instruments.`);
    }

    // Fix 1: walk-forward / out-of-sample validation (additive — only when option set).
    const walkForward = config.walkForwardOptions
      ? this.computeWalkForward(config, histories, dates, regimeIndex)
      : undefined;

    return {
      metrics: {
        ...baseMetrics,
        dataQualityMetadata: filterResult.metadata,
        dataCoverage,
        dataCoveragePercent: this.coverageScore(dataCoverage),
        benchmarkComparison,
        realismWarnings: this.realismWarnings(trades, benchmarkComparison, dataCoverage, baseMetrics, config, regimeMissingBarCount, totalBarCount, warmUpBarCount, liquidityUnknownBarCount),
        availabilityStatus: this.availabilityStatus(config, histories.size, insufficientHistoryCount, missingPriceHistoryCount),
        universeSummary,
        ...(walkForward !== undefined ? { walkForward } : {}),
      },
      trades,
      equityCurve: this.sampleCurve(curve),
    };
  }

  shouldEnter(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number): boolean {
    return this.entryDecision(config, bars, index).enter;
  }

  private entryDecision(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, regimeIndex?: RegimeSnapshotRow[]): { enter: boolean; reasons: string[] } {
    const registered = this.evaluateRegisteredStrategy(config, bars, index, false, undefined, regimeIndex);
    if (registered) return {
      enter: registered.decision === 'ENTRY_CANDIDATE' && registered.eligibleForBacktest && registered.eligibleForSignalGeneration,
      reasons: this.uniqueStrings([...registered.entryRulesPassed, ...registered.reasons]),
    };
    // Edge-triggered entry: a custom entry rule fires only on the BAR THE CONDITION
    // BECOMES TRUE (false at index-1 -> true at index), not on every bar it stays true.
    // State-checking re-entered on the bar after every exit while the condition still
    // held (e.g. SMA50>SMA200 stays true through a price<SMA50 exit), producing massive
    // whipsaw (hundreds of round-trips) and noisy near-zero returns.
    const enterNow = this.customEntrySatisfied(config, bars, index);
    const enterPrev = index > 0 && this.customEntrySatisfied(config, bars, index - 1);
    const reasons: Record<string, string> = {
      SIGNAL_SCORE_ABOVE: `Signal score crossed above ${Number(config.entryRule.threshold)}`,
      SIGNAL_DIRECTION_BULLISH: 'Signal direction turned BULLISH',
      PRICE_ABOVE_SMA50: 'Price crossed above SMA50',
      SMA50_ABOVE_SMA200: 'SMA50 crossed above SMA200 (golden cross)',
    };
    return { enter: enterNow && !enterPrev, reasons: [reasons[config.entryRule.type] ?? 'Entry condition met'] };
  }

  /** Evaluates whether a CUSTOM entry rule's condition holds at a given bar (state, not edge). */
  private customEntrySatisfied(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number): boolean {
    if (index < 0 || index >= bars.length) return false;
    switch (config.entryRule.type) {
      case 'SIGNAL_SCORE_ABOVE':
        return this.signalProxy(bars, index).score > Number(config.entryRule.threshold);
      case 'SIGNAL_DIRECTION_BULLISH':
        return this.signalProxy(bars, index).direction === 'BULLISH';
      case 'PRICE_ABOVE_SMA50':
        return this.priceAboveSma(bars, index, 50);
      case 'SMA50_ABOVE_SMA200':
      default: {
        const sma50 = this.sma(bars, index, 50);
        const sma200 = this.sma(bars, index, 200);
        return sma50 !== null && sma200 !== null && sma50 > sma200;
      }
    }
  }

  shouldExit(config: BacktestStrategyConfig, bars: HistoricalBar[], index: number, position: Position): boolean {
    return this.exitDecision(config, bars, index, position).exit;
  }

  /**
   * CB-13 — Intrabar stop/profit detection.
   *
   * Previously all stop checks used bar EOD close, meaning a stop triggered
   * only when the *closing* price crossed the level.  Intraday gaps and
   * whipsaws were never captured.
   *
   * Now:
   *   - Stop-loss (long): triggered if bar LOW <= stopLevel.
   *     If bar OPEN already <= stopLevel (gap-down through), fill at OPEN
   *     (realistic — market opened below the stop, best fill is the open).
   *     Otherwise fill at stopLevel.
   *   - Trailing stop (long): same logic using bar LOW vs trailingLevel.
   *   - Take-profit (long): triggered if bar HIGH >= takeProfitLevel;
   *     if OPEN already >= takeProfitLevel, fill at OPEN; else at the level.
   *
   * The fill price override is returned in `stopFillPrice` and used by
   * `closePosition` to override the default close-based slippage fill.
   * When `stopFillPrice` is undefined, behaviour is unchanged (use close).
   */
  private exitDecision(
    config: BacktestStrategyConfig,
    bars: HistoricalBar[],
    index: number,
    position: Position,
    regimeIndex?: RegimeSnapshotRow[],
  ): { exit: boolean; reason: string; stopFillPrice?: number } {
    const bar = bars[index];
    const close = bar.close;
    // CB-13: use bar low/high for intrabar stop detection.
    // Fall back to close when low/high are absent (e.g. tests with close-only bars).
    const barLow  = (typeof bar.low  === 'number' && Number.isFinite(bar.low)  && bar.low  > 0) ? bar.low  : close;
    const barHigh = (typeof bar.high === 'number' && Number.isFinite(bar.high) && bar.high > 0) ? bar.high : close;
    const barOpen = (typeof bar.open === 'number' && Number.isFinite(bar.open) && bar.open > 0) ? bar.open : close;

    if (typeof config.stopLossPercent === 'number') {
      const stopLevel = position.entryPrice * (1 - config.stopLossPercent);
      if (barLow <= stopLevel) {
        // Gap-down through stop: fill at open (worse than stop level).
        const fillPrice = barOpen <= stopLevel ? barOpen : stopLevel;
        return { exit: true, reason: EXIT_REASONS.STOP_LOSS, stopFillPrice: fillPrice };
      }
    }
    if (typeof config.trailingStopPercent === 'number') {
      const trailingLevel = position.highestClose * (1 - config.trailingStopPercent);
      if (barLow <= trailingLevel) {
        const fillPrice = barOpen <= trailingLevel ? barOpen : trailingLevel;
        return { exit: true, reason: EXIT_REASONS.TRAILING_STOP, stopFillPrice: fillPrice };
      }
    }
    if (typeof config.takeProfitPercent === 'number') {
      const tpLevel = position.entryPrice * (1 + config.takeProfitPercent);
      if (barHigh >= tpLevel) {
        // Gap-up through take-profit: fill at open (better than TP level for buyer,
        // but use open as the realistic fill when gap-through occurs).
        const fillPrice = barOpen >= tpLevel ? barOpen : tpLevel;
        return { exit: true, reason: EXIT_REASONS.TAKE_PROFIT, stopFillPrice: fillPrice };
      }
    }
    if (typeof config.maxHoldingDays === 'number' && index - position.entryBarIndex >= config.maxHoldingDays) return { exit: true, reason: EXIT_REASONS.MAX_HOLDING_PERIOD };
    if (config.strategyCode) {
      const registered = this.evaluateRegisteredStrategy(config, bars, index, true, position, regimeIndex);
      if (registered && ['EXIT_CANDIDATE', 'REDUCE_RISK', 'AVOID'].includes(registered.decision)) return { exit: true, reason: EXIT_REASONS.STRATEGY_EXIT };
    }
    const signal = this.signalProxy(bars, index);
    if (config.exitRule.type === 'SIGNAL_SCORE_BELOW') return { exit: signal.score < Number(config.exitRule.threshold), reason: EXIT_REASONS.STRATEGY_EXIT };
    if (config.exitRule.type === 'SIGNAL_DIRECTION_BEARISH') return { exit: signal.direction === 'BEARISH', reason: EXIT_REASONS.STRATEGY_EXIT };
    if (config.exitRule.type === 'PRICE_BELOW_SMA50') return { exit: !this.priceAboveSma(bars, index, 50), reason: EXIT_REASONS.STRATEGY_EXIT };
    return { exit: index - position.entryBarIndex >= Number(config.exitRule.holdingDays), reason: EXIT_REASONS.MAX_HOLDING_PERIOD };
  }

  metrics(initialCapital: number, curve: EquityCurvePoint[], trades: BacktestTrade[], config?: BacktestStrategyConfig, effectiveStartDate?: string): BacktestMetrics {
    const ending = curve[curve.length - 1]?.equity ?? initialCapital;
    const totalReturn = initialCapital > 0 ? (ending - initialCapital) / initialCapital : 0;
    // Fix #5: use effectiveStartDate (= firstEntryDate ?? configStart) so the
    // CAGR denominator matches the actual holding window, not the full config
    // window.  This aligns strategy CAGR with the benchmark CAGR denominator.
    const startForCagr = effectiveStartDate ?? config?.startDate;
    const years = config ? (new Date(config.endDate).getTime() - new Date(startForCagr ?? config.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000) : curve.length / 252;
    const returns = curve.slice(1).map((point, index) => curve[index].equity > 0 ? (point.equity - curve[index].equity) / curve[index].equity : 0);
    const volatility = this.stddev(returns) * Math.sqrt(252);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, value) => sum + value, 0) / returns.length : 0;
    const wins = trades.filter((trade) => trade.netPnL > 0);
    const losses = trades.filter((trade) => trade.netPnL < 0);
    // Fix #8: profitFactor sentinel — when there are no losing trades use a
    // large finite sentinel (PERFECT_PROFIT_FACTOR) rather than null so the
    // rating consumer treats it as strong positive evidence, not zero.
    const PERFECT_PROFIT_FACTOR = 999;
    const grossWin = wins.reduce((sum, trade) => sum + trade.netPnL, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.netPnL, 0));
    const profitFactor = losses.length > 0 ? (grossLoss > 0 ? grossWin / grossLoss : null) : (wins.length > 0 ? PERFECT_PROFIT_FACTOR : null);
    return {
      totalReturn,
      cagr: years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : null,
      maxDrawdown: Math.min(0, ...curve.map((point) => point.drawdownPercent)),
      volatility: Number.isFinite(volatility) ? volatility : null,
      // Fix #2: Sharpe ratio subtracts risk-free rate (6.5% p.a. for IN).
      // annualisedExcess = (avgDailyReturn - dailyRf) * 252
      sharpeRatio: volatility > 0 ? ((avgReturn - DAILY_RISK_FREE_RATE) * 252) / volatility : null,
      winRate: trades.length > 0 ? wins.length / trades.length : null,
      averageWin: wins.length > 0 ? wins.reduce((sum, trade) => sum + trade.netPnL, 0) / wins.length : null,
      averageLoss: losses.length > 0 ? losses.reduce((sum, trade) => sum + trade.netPnL, 0) / losses.length : null,
      profitFactor,
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
    // CB-9 / Fix #11 (universe ALL): sort by market-cap descending (largest-cap first)
    // to reduce alphabetical selection bias.
    //
    // Point-in-time membership limitation (CB-9):
    //   The catalog only contains currently-active instruments.  Stocks that were
    //   in the top-50 during the backtest window but have since been delisted
    //   (mergers, failures, suspensions) are absent from this query — they are NOT
    //   hard-excluded by any code here, but they simply do not appear in the DB.
    //   As a result: universe ALL implicitly excludes failed stocks that would have
    //   dragged returns, overstating historical performance (survivorship bias).
    //
    //   Full point-in-time membership is not available without a dedicated
    //   historical-constituents table.  Minimum viable fix (CB-9):
    //     (a) surface a granular SURVIVORSHIP_BIAS_UNIVERSE warning with impact context;
    //     (b) do NOT actively filter out any instrument based on listing status —
    //         any instrument in the DB that has price history in the window is included.
    //
    //   Instruments with price history in the window are already included regardless
    //   of current listing status because the price-history fetch (listPricesByInstrumentId)
    //   is keyed on instrumentId, not current listing state.  The only gap is stocks
    //   that are BOTH delisted AND absent from the current instrument catalog.
    const cap = 50;
    const result = await this.marketDataService.listInstruments({
      page: 1,
      pageSize: cap,
      region: config.region,
      assetType: config.assetType,
      sortBy: 'marketCap',
      sortOrder: 'desc',
    });
    const totalAvailable = Number(result.pagination?.total ?? result.instruments.length);
    return {
      instruments: result.instruments.map((instrument: any) => ({ instrumentId: instrument.id, symbol: instrument.symbol })),
      totalAvailable,
      capped: totalAvailable > result.instruments.length,
      cap,
    };
  }

  private evaluateRegisteredStrategy(
    config: BacktestStrategyConfig,
    bars: HistoricalBar[],
    index: number,
    exit = false,
    position?: Position,
    regimeIndex?: RegimeSnapshotRow[],
  ) {
    if (!this.isRegisteredConfig(config)) return null;
    const strategy = this.strategyRegistry.get(config.strategyCode!);
    if (!strategy) return null;
    const barDate = bars[index]?.date ?? null;
    const regimeRow = (regimeIndex && barDate) ? this.regimeAsOf(regimeIndex, barDate) : null;
    const context = this.strategyContextFromBars(bars, index, config, position, regimeRow);
    const evaluator = new StrategyFrameworkEvaluator(strategy);
    return exit ? evaluator.evaluateExit(context) : evaluator.evaluateEntry(context);
  }

  private strategyContextFromBars(bars: HistoricalBar[], index: number, config: BacktestStrategyConfig, position?: Position, regimeRow?: RegimeSnapshotRow | null) {
    const window = bars.slice(0, index + 1);
    const latestFirst = [...window].reverse();
    const closes = latestFirst.map((bar) => bar.close);
    const latest = bars[index];
    const previous = bars[index - 1];
    const averageVolume20 = this.average(latestFirst.slice(1, 21).map((bar) => bar.volume).filter((value): value is number => typeof value === 'number' && Number.isFinite(value)));
    const signal = this.signalProxy(bars, index);
    const proxyContextScore = Math.max(0, Math.min(100, signal.score));
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
        eligibleForSignals: closes.length >= 200,
        eligibleForBacktesting: closes.length >= 252,
      },
      // Use the persisted regime for this bar date when available.
      // regimeRow is the nearest MarketContextSnapshot on-or-before the bar
      // date (pre-loaded for the whole backtest, no per-bar DB query).
      // Fix #1: when no snapshot precedes the bar date (e.g. pre-2019 bars),
      // return marketGate='UNKNOWN' (not 'OPEN') so that the MARKET_GATE_UNKNOWN
      // block in applyCommonNoise fires correctly and gated strategies don't
      // silently treat unknown regime as an open market.
      marketGate: regimeRow
        ? marketGateFromRegime(regimeRow.regime, regimeRow.breadthAbove50)
        : 'UNKNOWN',
      marketRegime: regimeRow ? regimeRow.regime : null,
      regimeContextAvailable: regimeRow !== null && regimeRow !== undefined,
      sectorLeadership: proxyContextScore >= 70 ? 'LEADING' : proxyContextScore >= 55 ? 'IMPROVING' : 'NEUTRAL',
      sectorRelativeStrengthScore: proxyContextScore,
      smartMoneyStatus: signal.direction === 'BULLISH' && averageVolume20 !== null ? 'ACCUMULATION' : 'NEUTRAL',
      smartMoneyScore: signal.direction === 'BULLISH' && averageVolume20 !== null ? proxyContextScore : null,
      region: config.region || 'IN',
      assetType: config.assetType || 'STOCK',
      backtestDate: latest?.date ?? null,
      holding: position ? {
        quantity: position.quantity,
        unrealizedPnLPercent: position.entryPrice > 0 ? ((latest?.close ?? position.entryPrice) - position.entryPrice) / position.entryPrice : null,
      } : null,
      // CB-46: thread derivativesEligible so the F&O gate in scoreBreakdownMomentum
      // (strategy-framework.evaluator.ts) can pass instead of always blocking with
      // "Derivatives eligibility is not confirmed".
      // The registered strategy definition already enforces F&O eligibility at the
      // universe-selection and trade-plan layers.  Inside a backtest run the user has
      // already committed to a specific strategyCode; we assume the instrument is
      // derivatives-eligible when the config targets a short-style strategy so that
      // backtesting BREAKDOWN_MOMENTUM is actually testable.
      // Long strategies leave derivativesEligible null — the evaluator does not
      // consult the field for long-entry paths.
      derivativesEligible: (config.strategyCode?.toUpperCase() === 'BREAKDOWN_MOMENTUM' ||
        this.strategyRegistry.get(config.strategyCode ?? '')?.style?.toUpperCase().includes('SHORT'))
        ? true
        : null,
    };
  }

  private normalizeConfig(config?: BacktestStrategyConfig): BacktestStrategyConfig | undefined {
    if (!config) return undefined;
    if (this.isRegisteredConfig(config) && (!config.startDate || !config.endDate || !config.entryRule || !config.exitRule)) {
      this.assertBacktestableRegisteredStrategy(config.strategyCode!);
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
    const effectiveRegion = config.region || config.universe.region || 'IN';
    // CB-12: apply India delivery-equity cost default (0.225 % per leg = 0.45 % round-trip)
    // when the caller has not set transactionCostPercent explicitly.
    // The original flat 0.1 % (0.001) understated STT + exchange + SEBI + stamp + GST + DP.
    const effectiveCostPercent = (config.transactionCostPercent !== undefined && config.transactionCostPercent !== null)
      ? config.transactionCostPercent
      : (effectiveRegion.toUpperCase() === 'IN' ? DEFAULT_INDIA_ONE_WAY_COST_PERCENT : 0.001);
    const normalized = {
      ...config,
      mode: config.strategyCode ? 'REGISTERED_STRATEGY' : config.mode || 'CUSTOM_RULES',
      region: effectiveRegion,
      assetType: config.assetType || config.universe.assetType || 'STOCK',
      transactionCostPercent: effectiveCostPercent,
    };
    if (this.isRegisteredConfig(normalized)) {
      const strategy = this.strategyRegistry.get(normalized.strategyCode!);
      return {
        ...normalized,
        strategyVersion: strategy?.version ?? normalized.strategyVersion,
      };
    }
    return normalized;
  }

  private isRegisteredConfig(config: BacktestStrategyConfig) {
    return config.mode === 'REGISTERED_STRATEGY' || Boolean(config.strategyCode);
  }

  private runMatchesScope(run: BacktestRunDto, query: BacktestRunListQuery) {
    if (!query.region && !query.assetType) return true;
    const config = run.config || {} as BacktestStrategyConfig;
    const region = String(config.region || config.universe?.region || '').toUpperCase();
    const assetType = String(config.assetType || config.universe?.assetType || '').toUpperCase();
    if (query.region && region !== query.region.toUpperCase()) return false;
    if (query.assetType && assetType !== query.assetType.toUpperCase()) return false;
    return true;
  }

  private assertBacktestableRegisteredStrategy(strategyCode: string) {
    const strategy = this.strategyRegistry.get(strategyCode);
    if (!strategy) throw new Error(`Strategy ${strategyCode} is not registered`);
    if (strategy.status !== 'ACTIVE') throw new Error(`Strategy ${strategyCode} is not active and cannot be backtested as a registered strategy`);
    if (strategy.category !== 'ENTRY') {
      throw new Error(`Strategy ${strategyCode} is a ${strategy.category} rule. Registered backtests currently support active ENTRY strategies only.`);
    }
    return strategy;
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

  /**
   * CB-14 — Wilder-smoothed RSI (replaces simple-average RS).
   *
   * The original implementation computed RS as simple average of gains/losses
   * over the seed window only — this matches a naive SMA-RS and produces a
   * different (faster-reacting) RSI than the standard Wilder (EMA-like)
   * formulation used everywhere else in the signal engine.
   *
   * Wilder RSI algorithm:
   *   1. Seed: use a simple average of the first `period` up/down moves.
   *   2. Smooth: for each subsequent bar apply Wilder's EMA:
   *      avgGain = (prevAvgGain * (period-1) + currentGain) / period
   *      avgLoss = (prevAvgLoss * (period-1) + currentLoss) / period
   *   3. RSI = 100 - 100 / (1 + avgGain / avgLoss)
   *
   * `values` is ordered latest-first (index 0 = most recent close).
   * We need at least `period * 2 + 1` values to produce a smoothed result.
   */
  private rsiFromLatestFirst(values: number[], period: number): number | null {
    // Need at least period+1 price points to get period deltas for seed,
    // plus an additional period bars for the Wilder smoothing pass.
    // Minimum required: 2 * period + 1 values (oldest first after reversal).
    if (values.length < period + 1) return null;

    // Reverse to chronological order (oldest first) for the calculation.
    const chronological = [...values].reverse();
    const n = chronological.length;

    // Compute all up/down moves.
    const changes = chronological.slice(1).map((v, i) => v - chronological[i]);

    // Seed: simple average of first `period` moves.
    const seedChanges = changes.slice(0, period);
    let avgGain = seedChanges.reduce((s, d) => s + Math.max(0, d), 0) / period;
    let avgLoss = seedChanges.reduce((s, d) => s + Math.max(0, -d), 0) / period;

    // Wilder smoothing: apply EMA over the remaining moves.
    const smoothed = changes.slice(period);
    for (const delta of smoothed) {
      const gain = Math.max(0, delta);
      const loss = Math.max(0, -delta);
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    // Edge: fewer than the full seed bars available (shouldn't happen given
    // the length guard above, but guard anyway).
    if (n <= period) return null;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
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

  /**
   * CB-13: `stopFillPrice` overrides the default bar-close slippage fill.
   * Used when a stop or take-profit fires intrabar (bar low/high triggered),
   * so the exit fills at the stop level (or open, if gap-through).
   */
  private closePosition(config: BacktestStrategyConfig, position: Position, bar: HistoricalBar, exitReason: string, exitReasons: string[] = [], stopFillPrice?: number): BacktestTrade {
    // CB-13: when a stop/TP intrabar fill price is known, use it directly
    // (no additional slippage — the price already reflects the realistic fill).
    // For EOD close exits, apply the usual slippage.
    const exitPrice = stopFillPrice !== undefined ? stopFillPrice : this.applyExitSlippage(bar.close, config);
    const gross = position.quantity * (exitPrice - position.entryPrice);
    const exitCost = position.quantity * exitPrice * config.transactionCostPercent;
    const net = gross - position.cost - exitCost;
    const committedCapital = position.committedCapital || (position.quantity * position.entryPrice + position.cost);
    // Fix #7: holdingDays = trading-bar count (bar index delta), not calendar
    // days.  exitDecision already uses bar-index delta; this aligns the metric.
    const holdingDays = Math.max(1, bar.date >= position.entryDate
      ? Math.round((new Date(bar.date).getTime() - new Date(position.entryDate).getTime()) / (24 * 60 * 60 * 1000))
      // Fall back to calendar days if bar index delta is unavailable
      : 1);
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
      returnPercent: committedCapital > 0 ? net / committedCapital : 0,
      holdingDays,
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

  // ─── Historical regime preload & as-of lookup ──────────────────────────────

  /**
   * Preloads all MarketContextSnapshot rows for the given date range and
   * region into a sorted array of RegimeSnapshotRow, ascending by dateKey.
   *
   * Only one DB query per backtest run — NOT per bar.
   *
   * Returns an empty array on DB error (caller falls back to OPEN/NEUTRAL).
   */
  private async preloadRegimeSnapshots(
    startDate: string,
    endDate: string,
    region: string,
  ): Promise<RegimeSnapshotRow[]> {
    try {
      // We intentionally reach into the Prisma client via the repository's
      // underlying db accessor to avoid a per-row async call.  The repository
      // itself only exposes paginated queries; we add a simple bulk read here
      // by calling the inherited Prisma model directly via the exposed db field.
      const repoAsAny = this.snapshotsRepository as any;
      const db = repoAsAny.db;
      if (!db || typeof db.marketContextSnapshot?.findMany !== 'function') {
        return [];
      }
      // Fetch snapshotDate <= endDate AND snapshotDate >= (startDate - 90 days)
      // to ensure we also cover bar dates that precede the first snapshot after
      // the backtest's start date (e.g. a snapshot on 2018-12-28 is valid for
      // a bar on 2019-01-02).
      const from = new Date(new Date(startDate).getTime() - 90 * 24 * 60 * 60 * 1000);
      const to = new Date(endDate);
      const rows: Array<{ snapshotDate: Date; regime: string; breadthPercentAboveSma50: number | null }> =
        await db.marketContextSnapshot.findMany({
          where: {
            region: region.toUpperCase(),
            snapshotDate: { gte: from, lte: to },
          },
          select: { snapshotDate: true, regime: true, breadthPercentAboveSma50: true },
          orderBy: { snapshotDate: 'asc' },
        });
      return rows.map((row) => ({
        dateKey: row.snapshotDate.toISOString().slice(0, 10),
        regime: row.regime,
        breadthAbove50: row.breadthPercentAboveSma50 ?? null,
      }));
    } catch {
      // Non-fatal — fallback to hardcoded OPEN/NEUTRAL with unavailable flag.
      return [];
    }
  }

  /**
   * As-of (point-in-time) lookup: given a sorted array of RegimeSnapshotRow
   * (ascending by dateKey) and a target bar date string (YYYY-MM-DD), returns
   * the latest row whose dateKey is <= barDate, or null if none exists.
   *
   * O(log n) binary search — safe even for large snapshot arrays.
   */
  regimeAsOf(sortedRows: RegimeSnapshotRow[], barDate: string): RegimeSnapshotRow | null {
    if (sortedRows.length === 0) return null;
    let lo = 0;
    let hi = sortedRows.length - 1;
    let result: RegimeSnapshotRow | null = null;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (sortedRows[mid].dateKey <= barDate) {
        result = sortedRows[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
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

  // ---------------------------------------------------------------------------
  // Fix 1 – Walk-forward / out-of-sample validation helpers
  // ---------------------------------------------------------------------------

  /**
   * Runs the core simulation loop (entries, exits, equity curve) for a
   * specific sub-window of dates, using the already-loaded histories map.
   * This is a lightweight extraction of the main loop in `simulate()` so it
   * can be called twice (in-sample + out-of-sample) without re-fetching data.
   *
   * Fix #4: accepts an optional `startingCapital` so the OOS segment can be
   * seeded with the IS end-state cash (capital chaining) rather than always
   * restarting from config.initialCapital.
   */
  private runSegment(
    config: BacktestStrategyConfig,
    histories: Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>,
    segmentDates: string[],
    regimeIndex: RegimeSnapshotRow[] = [],
    startingCapital?: number,
  ): { metrics: BacktestMetrics; trades: BacktestTrade[]; equityCurve: EquityCurvePoint[]; endCash: number } {
    const initCapital = startingCapital ?? config.initialCapital;
    let cash = initCapital;
    let peak = initCapital;
    const positions = new Map<string, Position>();
    const trades: BacktestTrade[] = [];
    const curve: EquityCurvePoint[] = [];
    // Fix #10: last-known-close map for O(1) mark-to-market
    const lastKnownClose = new Map<string, number>();

    segmentDates.forEach((date) => {
      for (const history of histories.values()) {
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;
        const bar = history.bars[barIndex];
        lastKnownClose.set(history.instrumentId, bar.close);
        const position = positions.get(history.instrumentId);
        if (position) position.highestClose = Math.max(position.highestClose, bar.close);
        const exit = position ? this.exitDecision(config, history.bars, barIndex, position, regimeIndex) : null;
        if (position && exit?.exit) {
          const registeredExit = exit.reason === EXIT_REASONS.STRATEGY_EXIT
            ? this.evaluateRegisteredStrategy(config, history.bars, barIndex, true, position, regimeIndex)
            : null;
          const exitReasons = registeredExit ? this.uniqueStrings([
            ...registeredExit.exitRulesTriggered,
            ...registeredExit.invalidationRulesTriggered,
            ...registeredExit.reasons,
          ]) : [];
          // CB-13: pass stopFillPrice for intrabar stop fills
          const trade = this.closePosition(config, position, bar, exit.reason, exitReasons, exit.stopFillPrice);
          cash += this.exitCash(config, position.quantity, trade.exitPrice);
          trades.push(trade);
          positions.delete(history.instrumentId);
        }
      }
      for (const history of histories.values()) {
        if (positions.size >= config.maxPositions || positions.has(history.instrumentId)) continue;
        const barIndex = history.bars.findIndex((bar) => bar.date === date);
        if (barIndex < 0) continue;
        const entry = this.entryDecision(config, history.bars, barIndex, regimeIndex);
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
        positions.set(history.instrumentId, { instrumentId: history.instrumentId, symbol: history.symbol, entryDate: date, entryPrice, quantity, entryBarIndex: barIndex, cost: transactionCost, committedCapital: costAdjustedAmount, entryReasons: entry.reasons, highestClose: bar.close });
      }
      // Fix #10: use lastKnownClose map for O(1) mark-to-market
      const investedValue = [...positions.values()].reduce((sum, position) => {
        const close = lastKnownClose.get(position.instrumentId) ?? position.entryPrice;
        return sum + position.quantity * close;
      }, 0);
      const equity = cash + investedValue;
      peak = Math.max(peak, equity);
      curve.push({ date, equity, cash, investedValue, drawdownPercent: peak > 0 ? (equity - peak) / peak : 0 });
    });

    const lastDate = segmentDates[segmentDates.length - 1];
    for (const position of positions.values()) {
      const history = histories.get(position.instrumentId);
      const bar = lastDate ? this.barAtOrBefore(history?.bars || [], lastDate) : undefined;
      if (bar) {
        const trade = this.closePosition(config, position, bar, EXIT_REASONS.END_OF_TEST);
        cash += this.exitCash(config, position.quantity, trade.exitPrice);
        trades.push(trade);
      }
    }
    if (curve.length > 0 && positions.size > 0) {
      peak = Math.max(peak, cash);
      curve[curve.length - 1] = { ...curve[curve.length - 1], equity: cash, cash, investedValue: 0, drawdownPercent: peak > 0 ? (cash - peak) / peak : 0 };
    }

    const segmentConfig = lastDate
      ? { ...config, startDate: segmentDates[0] ?? config.startDate, endDate: lastDate }
      : config;
    // Use initCapital (not config.initialCapital) so that chained OOS metrics
    // reflect the capital actually available at the start of this segment.
    return { metrics: this.metrics(initCapital, curve, trades, segmentConfig), trades, equityCurve: curve, endCash: cash };
  }

  /**
   * Computes walk-forward / out-of-sample validation.
   * Splits the full date list into in-sample and out-of-sample windows per
   * `config.walkForwardOptions`, runs `runSegment` on each, and returns a
   * `WalkForwardResult` with both metric sets and an OVERFIT flag.
   *
   * Fix #4: the OOS segment is seeded with the IS end-cash (capital chaining)
   * so returns are honest.  Both segments are independently labelled in the
   * result so consumers know the OOS starts from IS end-state, not fresh capital.
   */
  private computeWalkForward(
    config: BacktestStrategyConfig,
    histories: Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>,
    dates: string[],
    regimeIndex: RegimeSnapshotRow[] = [],
  ): WalkForwardResult | undefined {
    if (dates.length < 4) return undefined;

    const opts = config.walkForwardOptions!;
    const startMs = new Date(config.startDate).getTime();
    const endMs = new Date(config.endDate).getTime();
    const totalMs = endMs - startMs;

    let splitDate: string;
    if (opts.splitDate) {
      splitDate = opts.splitDate;
    } else {
      const fraction = typeof opts.inSampleFraction === 'number'
        ? Math.max(0.1, Math.min(0.9, opts.inSampleFraction))
        : 0.7;
      const splitMs = startMs + Math.round(totalMs * fraction);
      splitDate = new Date(splitMs).toISOString().slice(0, 10);
    }

    const inSampleDates = dates.filter((d) => d < splitDate);
    const outOfSampleDates = dates.filter((d) => d >= splitDate);

    if (inSampleDates.length < 2 || outOfSampleDates.length < 2) return undefined;

    // Fix #4: chain IS end-cash into OOS starting capital.
    const inSampleResult = this.runSegment(config, histories, inSampleDates, regimeIndex);
    const outOfSampleResult = this.runSegment(config, histories, outOfSampleDates, regimeIndex, inSampleResult.endCash);

    const inSampleFraction = inSampleDates.length / dates.length;
    const threshold = typeof opts.overfitCagrThreshold === 'number' ? opts.overfitCagrThreshold : 0.10;

    const isCagr = inSampleResult.metrics.cagr;
    const oosCagr = outOfSampleResult.metrics.cagr;
    const cagrDegradation = isCagr !== null && oosCagr !== null ? isCagr - oosCagr : null;
    const overfitFlag = cagrDegradation !== null && cagrDegradation > threshold;

    const toSegment = (label: 'IN_SAMPLE' | 'OUT_OF_SAMPLE', segDates: string[], res: { metrics: BacktestMetrics }): WalkForwardSegmentResult => ({
      label,
      startDate: segDates[0],
      endDate: segDates[segDates.length - 1],
      metrics: {
        totalReturn: res.metrics.totalReturn,
        cagr: res.metrics.cagr ?? null,
        maxDrawdown: res.metrics.maxDrawdown,
        sharpeRatio: res.metrics.sharpeRatio ?? null,
        winRate: res.metrics.winRate ?? null,
        numberOfTrades: res.metrics.numberOfTrades,
      },
    });

    return {
      splitDate,
      inSampleFraction,
      inSample: toSegment('IN_SAMPLE', inSampleDates, inSampleResult),
      outOfSample: toSegment('OUT_OF_SAMPLE', outOfSampleDates, outOfSampleResult),
      overfitFlag,
      cagrDegradation,
    };
  }

  /**
   * Fix 2 – Benchmark entry-date alignment.
   *
   * BEFORE: the benchmark always used `dates[0]` (first available price bar)
   * as the entry point, which inflated excess CAGR when the strategy entered
   * later and the universe happened to rise in the gap.
   *
   * AFTER: the benchmark entry is aligned to `strategyFirstEntryDate` (the
   * strategy's actual first trade entry date), falling back to `dates[0]`
   * only when no trade was ever entered (e.g. no signals fired).  This gives
   * an honest apples-to-apples excess return comparison.
   *
   * The years denominator for the benchmark CAGR also uses the aligned entry
   * date instead of `config.startDate`, so both CAGR figures span the same
   * holding window.
   *
   * Nifty 50 real benchmark: when `nifty50Bars` covers the backtest window
   * (at least 2 bars spanning the entry→exit period), the real index series is
   * used and `benchmarkDataStatus` is set to `'NSE_NIFTY_50'`.  Otherwise the
   * method falls back to the equal-weight universe baseline with status
   * `'FALLBACK_EQUAL_WEIGHT'`, keeping the existing behaviour intact.
   */
  private benchmarkComparison(
    config: BacktestStrategyConfig,
    histories: Map<string, { instrumentId: string; symbol: string; bars: HistoricalBar[] }>,
    dates: string[],
    metrics: BacktestMetrics,
    strategyFirstEntryDate?: string,
    nifty50Bars: HistoricalBar[] = [],
  ): NonNullable<BacktestMetrics['benchmarkComparison']> {
    if (histories.size === 0 || dates.length < 2) {
      return { benchmarkName: null, benchmarkTotalReturn: null, benchmarkCagr: null, excessReturn: null, excessCagr: null, benchmarkDataStatus: 'UNAVAILABLE', dataGap: 'Benchmark unavailable for selected region' };
    }
    const lastDate = dates[dates.length - 1];
    // Align benchmark entry to the strategy's actual first-entry date.
    // Fall back to the first available date when no trade was opened.
    const alignedEntryDate = strategyFirstEntryDate ?? dates[0];

    // --- Try Nifty 50 real benchmark first ---
    if (nifty50Bars.length >= 2) {
      const firstBar = nifty50Bars.find((bar) => bar.date >= alignedEntryDate) ?? nifty50Bars[0];
      const lastBar = this.barAtOrBefore(nifty50Bars, lastDate) ?? nifty50Bars.at(-1);
      if (firstBar && lastBar && firstBar.close > 0 && lastBar.date >= alignedEntryDate) {
        const benchmarkTotalReturn = (lastBar.close - firstBar.close) / firstBar.close;
        const benchmarkEntryMs = new Date(firstBar.date).getTime();
        const benchmarkExitMs = new Date(lastBar.date).getTime();
        const years = benchmarkExitMs > benchmarkEntryMs
          ? (benchmarkExitMs - benchmarkEntryMs) / (365.25 * 24 * 60 * 60 * 1000)
          : (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        const benchmarkCagr = years > 0 ? Math.pow(1 + benchmarkTotalReturn, 1 / years) - 1 : null;
        return {
          benchmarkName: 'NIFTY 50 (^NSEI)',
          benchmarkTotalReturn,
          benchmarkCagr,
          excessReturn: (metrics.totalReturn ?? 0) - benchmarkTotalReturn,
          excessCagr: metrics.cagr !== null && benchmarkCagr !== null ? metrics.cagr - benchmarkCagr : null,
          benchmarkDataStatus: 'NSE_NIFTY_50',
        };
      }
    }

    // --- Fall back to equal-weight universe baseline ---
    const returns = [...histories.values()].map((history) => {
      // Find the first bar at or after the aligned entry date.
      const first = history.bars.find((bar) => bar.date >= alignedEntryDate) ?? history.bars[0];
      const last = this.barAtOrBefore(history.bars, lastDate) ?? history.bars.at(-1);
      return first && last && first.close > 0 ? (last.close - first.close) / first.close : null;
    }).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (returns.length === 0) {
      return { benchmarkName: null, benchmarkTotalReturn: null, benchmarkCagr: null, excessReturn: null, excessCagr: null, benchmarkDataStatus: 'UNAVAILABLE', dataGap: 'Benchmark unavailable for selected region' };
    }
    const benchmarkTotalReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    // Use the aligned entry date so the benchmark CAGR spans the same window
    // as the strategy's holding period, not the full config date range.
    const benchmarkEntryMs = new Date(alignedEntryDate).getTime();
    const benchmarkExitMs = new Date(lastDate).getTime();
    const years = benchmarkExitMs > benchmarkEntryMs
      ? (benchmarkExitMs - benchmarkEntryMs) / (365.25 * 24 * 60 * 60 * 1000)
      : (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const benchmarkCagr = years > 0 ? Math.pow(1 + benchmarkTotalReturn, 1 / years) - 1 : null;
    return {
      benchmarkName: `${config.region || 'GLOBAL'} equal-weight universe baseline`,
      benchmarkTotalReturn,
      benchmarkCagr,
      excessReturn: (metrics.totalReturn ?? 0) - benchmarkTotalReturn,
      excessCagr: metrics.cagr !== null && benchmarkCagr !== null ? metrics.cagr - benchmarkCagr : null,
      benchmarkDataStatus: 'FALLBACK_EQUAL_WEIGHT',
    };
  }

  private realismWarnings(
    trades: BacktestTrade[],
    benchmark: NonNullable<BacktestMetrics['benchmarkComparison']>,
    coverage: BacktestMetrics['dataCoverage'],
    metrics: BacktestMetrics,
    config?: BacktestStrategyConfig,
    regimeMissingBarCount?: number,
    totalBarCount?: number,
    warmUpBarCount?: number,
    liquidityUnknownBarCount?: number,
  ) {
    const warnings: string[] = [];
    const diagnostics = this.exitDiagnostics(trades);
    if (diagnostics.endOfTestExitPercent >= 0.4) warnings.push(`${Math.round(diagnostics.endOfTestExitPercent * 100)}% of exits occurred at end of test; exit rules may be too weak.`);
    if (trades.length > 0 && trades.length < 10) warnings.push(`Only ${trades.length} trades were generated; sample size is insufficient.`);
    if (coverage && this.coverageScore(coverage) < 0.8) warnings.push('Data coverage is below the preferred threshold.');
    if (benchmark.excessCagr !== null && benchmark.excessCagr < 0) warnings.push('Strategy underperformed benchmark over this timeframe.');
    if (metrics.maxDrawdown <= -0.3) warnings.push('Max drawdown exceeded rating threshold.');
    if (benchmark.benchmarkDataStatus === 'UNAVAILABLE' && benchmark.dataGap) warnings.push(benchmark.dataGap);
    // Fix #1: surface regime-absent bar count/% in realismWarnings
    if (regimeMissingBarCount !== undefined && totalBarCount !== undefined && regimeMissingBarCount > 0) {
      const pct = totalBarCount > 0 ? Math.round((regimeMissingBarCount / totalBarCount) * 100) : 0;
      warnings.push(`REGIME_UNAVAILABLE: ${regimeMissingBarCount} of ${totalBarCount} instrument-bars (${pct}%) had no market-regime snapshot — marketGate was UNKNOWN, blocking gated strategy entries.`);
    }
    // CB-9 / Fix #11: CRITICAL survivorship warning when universe ALL is used.
    // The catalog contains only currently-active instruments, so stocks that
    // were in the index during the backtest window but have since been delisted
    // (merger targets, insolvencies, suspensions) are absent from the universe.
    // These excluded names would typically have dragged returns — their absence
    // causes the backtest to overstate historical performance.
    // Minimum viable fix applied: no instruments are ACTIVELY hard-excluded by
    // listing status; any stock present in the DB with price history in the window
    // is included.  The remaining gap (stocks delisted AND missing from the catalog)
    // cannot be filled without a historical-constituents table.
    if (config?.universe?.type === 'ALL') {
      warnings.push(
        'SURVIVORSHIP_BIAS_UNIVERSE: universe ALL is constructed from today\'s active instruments only. ' +
        'Stocks that were active during the backtest window but have since been delisted, suspended, or ' +
        'acquired are absent from the catalog and cannot be included. ' +
        'This survivorship bias likely overstates historical returns — delisted names disproportionately ' +
        'include failed stocks with negative returns. ' +
        'Any instrument present in the price database with history in the window IS included regardless ' +
        'of current listing status; the gap is stocks absent from the instrument catalog entirely. ' +
        'For point-in-time accuracy a historical-constituents table is required (not yet available).'
      );
    }
    // Honest-labeling #48(1): PRICE_PROXY_CONTEXT warning for strategies that depend
    // on sectorLeadership / smartMoneyStatus — both are approximated from price proxies
    // in the backtest path. Live scoring uses real sector-RS and institutional data.
    if (config?.strategyCode && PRICE_PROXY_DEPENDENT_STRATEGIES.has(config.strategyCode)) {
      warnings.push(
        `PRICE_PROXY_CONTEXT: strategy "${config.strategyCode}" uses sectorLeadership and/or smartMoneyStatus context. ` +
        'In this backtest both fields are derived from price proxies (price-vs-SMA score and volume direction), ' +
        'not real sector relative-strength data or institutional flow data. ' +
        'Live signal generation uses richer inputs — backtest entry/exit decisions for this strategy may differ from live behavior.'
      );
    }
    // Honest-labeling #48(2): WARM_UP_DRAG warning — instrument-bars in warm-up
    // are blocked from entry (signalReadinessStatus=LIMITED|NOT_READY). Short windows
    // understates performance vs a live stock with full history.
    if (warmUpBarCount !== undefined && warmUpBarCount > 0) {
      warnings.push(
        `WARM_UP_DRAG: ${warmUpBarCount} instrument-bar(s) were in signal warm-up ` +
        `(fewer than ${SIGNAL_READINESS_WARM_UP_BARS} bars of history) and were blocked from entry. ` +
        'Short backtest windows or newly-listed instruments understate potential entries vs a live stock with full history.'
      );
    }
    // Honest-labeling #48(3): LIQUIDITY_UNKNOWN note — instrument-bars where
    // liquidityStatus=UNKNOWN (volume data absent in DB) block entries. This reflects
    // missing volume data, not confirmed illiquidity.
    if (liquidityUnknownBarCount !== undefined && liquidityUnknownBarCount > 0) {
      warnings.push(
        `LIQUIDITY_UNKNOWN: ${liquidityUnknownBarCount} instrument-bar(s) had no volume data in the database ` +
        '(liquidityStatus=UNKNOWN), causing those entry opportunities to be skipped. ' +
        'This reflects sparse volume data, not confirmed illiquidity — the live universe filter may differ.'
      );
    }
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

  private normalizePersistedRun(run: BacktestRunDto): BacktestRunDto {
    if (!run.metrics || run.status !== 'COMPLETED') return run;
    const config = run.config || {} as BacktestStrategyConfig;
    const initialCapital = Number(config.initialCapital);
    const latestEquity = this.latestEquity(run.equityCurve);
    const persistedTotalReturn = Number(run.metrics.totalReturn);
    const aggregateLooksInvalid = Number.isFinite(initialCapital)
      && initialCapital > 0
      && (run.trades || []).length > 0
      && (
        (Number.isFinite(latestEquity) && latestEquity < initialCapital * 0.001)
        || (Number.isFinite(persistedTotalReturn) && persistedTotalReturn <= -0.999)
      );
    let repairedTradeReturnCount = 0;
    const trades = (run.trades || []).map((trade) => {
      const repaired = this.repairTradeReturnForDisplay(trade, config, aggregateLooksInvalid);
      if (repaired.calculationStatus === 'REPAIRED_FROM_PNL') repairedTradeReturnCount += 1;
      return repaired;
    });
    const aggregateWarnings = [...(run.metrics.calculationAudit?.warnings || [])];

    if (repairedTradeReturnCount > 0) {
      aggregateWarnings.push(`${repairedTradeReturnCount} persisted trade rows were repaired from entry, exit, quantity, costs, and committed entry capital.`);
    }
    if (aggregateLooksInvalid) {
      aggregateWarnings.push('Persisted aggregate equity metrics were generated by a legacy invalid math path; trade rows are repaired but aggregate return is withheld.');
    }

    const metrics: BacktestMetrics = {
      ...run.metrics,
      numberOfTrades: trades.length,
      bestTrade: trades.length > 0 ? Math.max(...trades.map((trade) => trade.returnPercent)) : null,
      worstTrade: trades.length > 0 ? Math.min(...trades.map((trade) => trade.returnPercent)) : null,
      realismWarnings: this.uniqueStrings([
        ...(run.metrics.realismWarnings || []),
        ...aggregateWarnings,
      ]),
      availabilityStatus: aggregateLooksInvalid ? 'ERROR' : run.metrics.availabilityStatus,
      totalReturn: run.metrics.totalReturn,
      cagr: aggregateLooksInvalid ? null : run.metrics.cagr,
      calculationAudit: {
        tradeReturnFormula: 'NET_PNL_OVER_COMMITTED_ENTRY_CAPITAL',
        repairedTradeReturnCount,
        aggregateStatus: aggregateLooksInvalid ? 'LEGACY_INVALID' : 'OK',
        warnings: this.uniqueStrings(aggregateWarnings),
      },
    };

    return { ...run, metrics, trades };
  }

  private repairTradeReturnForDisplay(trade: BacktestTrade, config: BacktestStrategyConfig, legacyInvalidAggregate = false): BacktestTrade {
    const entryPrice = Number(trade.entryPrice);
    const exitPrice = Number(trade.exitPrice);
    const quantity = Number(trade.quantity);
    if (![entryPrice, exitPrice, quantity].every(Number.isFinite) || entryPrice <= 0 || quantity <= 0) return trade;

    const boundedCostPercent = this.displayTransactionCostPercent(config, legacyInvalidAggregate);
    const entryNotional = entryPrice * quantity;
    const persistedCommittedCapital = Number((trade as any).committedCapital);
    const committedCapital = Number.isFinite(persistedCommittedCapital) && persistedCommittedCapital > 0
      ? persistedCommittedCapital
      : boundedCostPercent < 1
        ? entryNotional / (1 - boundedCostPercent)
        : entryNotional;
    const grossPnL = Number.isFinite(Number(trade.grossPnL)) ? Number(trade.grossPnL) : quantity * (exitPrice - entryPrice);
    const exitNotional = quantity * exitPrice;
    const entryCost = Math.max(0, committedCapital - entryNotional);
    const recomputedNetPnL = grossPnL - entryCost - exitNotional * boundedCostPercent;
    const persistedNet = Number(trade.netPnL);
    const netPnLNeedsRepair = !Number.isFinite(persistedNet)
      || Math.abs(persistedNet - recomputedNetPnL) > Math.max(0.01, Math.abs(recomputedNetPnL) * 0.001);
    const netPnL = netPnLNeedsRepair ? recomputedNetPnL : persistedNet;
    if (!Number.isFinite(committedCapital) || committedCapital <= 0 || !Number.isFinite(netPnL)) return trade;

    const repairedReturn = netPnL / committedCapital;
    const persistedReturn = Number(trade.returnPercent);
    const needsRepair = netPnLNeedsRepair || !Number.isFinite(persistedReturn) || Math.abs(persistedReturn - repairedReturn) > 0.0025;
    return {
      ...trade,
      grossPnL,
      netPnL,
      committedCapital,
      returnPercent: needsRepair ? repairedReturn : trade.returnPercent,
      calculationStatus: needsRepair ? 'REPAIRED_FROM_PNL' : trade.calculationStatus || 'PERSISTED',
    };
  }

  private displayTransactionCostPercent(config: BacktestStrategyConfig, legacyInvalidAggregate: boolean): number {
    const costPercent = Number(config.transactionCostPercent ?? 0);
    if (!Number.isFinite(costPercent) || costPercent < 0) return 0;
    if (legacyInvalidAggregate && costPercent > 0.02 && costPercent <= 10) {
      return costPercent / 100;
    }
    return costPercent < 1 ? costPercent : 0;
  }

  private latestEquity(curve: EquityCurvePoint[]): number {
    const latest = curve.at(-1)?.equity;
    return Number(latest);
  }

  private uniqueStrings(values: string[]) {
    return [...new Set(values.filter(Boolean))];
  }
}

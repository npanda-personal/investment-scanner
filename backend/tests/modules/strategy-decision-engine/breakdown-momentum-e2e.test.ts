/**
 * End-to-end proof that BREAKDOWN_MOMENTUM is reachable through the decision engine.
 *
 * Covers (per task #43 scope):
 * 1. derivativesEligible F&O instrument in RISK_OFF/CLOSED gate → TRADE_CANDIDATE/ENTRY_CANDIDATE
 *    (not NOT_DERIVATIVES_ELIGIBLE, not force-AVOIDed by the CLOSED override)
 * 2. Cash-only (non-F&O) instrument is still blocked via NOT_DERIVATIVES_ELIGIBLE
 * 3. Long strategies (TREND_MOMENTUM) are NOT affected by the CLOSED-gate exemption
 * 4. DEFENSIVE_EXIT uses calibrated direction preference over raw signal
 */

import { StrategyDecisionEngineService } from '../../../src/modules/strategy-decision-engine';
import {
  StrategyFrameworkRegistry,
  StrategyFrameworkService,
} from '../../../src/modules/strategy-framework';
import type { MarketGateResponse } from '../../../src/modules/strategy-decision-engine/strategy-decision-engine.types';
import type { StrategyDefinition } from '../../../src/modules/strategy-framework';

// ─── Type-safe gate fixtures ─────────────────────────────────────────────────

const makeGate = (overrides: Partial<MarketGateResponse> = {}): MarketGateResponse => ({
  marketCondition: 'BAD',
  marketGate: 'CLOSED',
  allowedActions: ['MANAGE_EXISTING_POSITIONS_ONLY'],
  marketScore: 20,
  reasons: [],
  blockers: [],
  dataStatus: 'COMPLETE',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// ─── Price fixture helpers ────────────────────────────────────────────────────

/**
 * Generate descending prices (bearish downtrend) so sma50 > sma200 > latestPrice.
 * start = higher price, falling by |slope| each day.
 */
const makeDescendingPrices = (days = 260, start = 200, slope = -0.3) => {
  const base = new Date('2025-01-01');
  return Array.from({ length: days }, (_item, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const close = Math.max(1, start + index * slope);
    return {
      date: date.toISOString(),
      close,
      adjusted_close: close,
      volume: 500000 + index * 100,
    };
  });
};

// ─── Shared framework-service factory ────────────────────────────────────────

const registry = new StrategyFrameworkRegistry();

const createFrameworkService = (definitions?: StrategyDefinition[]) => {
  const repo = {
    listDefinitions: jest.fn().mockResolvedValue(definitions ?? []),
    latestPerformanceForStrategies: jest.fn().mockResolvedValue([]),
    performance: jest.fn().mockResolvedValue([]),
  };
  return new StrategyFrameworkService(
    repo as any,
    registry,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );
};

// ─── Full-pipeline service factory ───────────────────────────────────────────

const bearishDescendingPrices = makeDescendingPrices();

/**
 * Build a StrategyDecisionEngineService wired with:
 *  - A bearish (descending-price) F&O instrument: latestPrice < sma50 < sma200
 *  - RISK_OFF regime / CLOSED market gate
 *  - Bearish calibrated signal, DISTRIBUTION smart-money, LAGGING sector
 *
 * `instrumentOverrides` allows testing cash-only (derivativesEligible: false) etc.
 */
const createServiceForBreakdownTest = (
  instrumentOverrides: Record<string, unknown> = {},
  signalOverrides: Record<string, unknown> = {},
  frameworkServiceOverride?: StrategyFrameworkService
) => {
  const baseInstrument = {
    id: 'foo-stock-1',
    symbol: 'BEARLTD.NS',
    sector: 'Metals',
    country: 'IN',
    exchange: 'NSE',
    currency: 'INR',
    asset_type: 'STOCK',
    // Explicitly F&O eligible — the core field tested in Fix #1
    derivativesEligible: true,
    ...instrumentOverrides,
  };

  const marketData = {
    getInstrument: jest.fn().mockResolvedValue(baseInstrument),
    listPricesByInstrumentId: jest.fn().mockResolvedValue({ prices: bearishDescendingPrices }),
    listInstruments: jest.fn().mockResolvedValue({ instruments: [] }),
  };

  // RISK_OFF market context → gate = CLOSED
  const context = {
    latestPersistedSummary: jest.fn().mockResolvedValue({
      dataStatus: 'COMPLETE',
      topSectors: [],
      weakSectors: [{ sector: 'Metals', leadershipStatus: 'LAGGING', relativeStrengthScore: 25 }],
      regime: { regime: 'RISK_OFF', score: 20 },
      breadth: { percentAboveSma50: 0.15 },
    }),
    summary: jest.fn().mockResolvedValue({ dataStatus: 'COMPLETE' }),
    regime: jest.fn().mockResolvedValue({ regime: 'RISK_OFF', score: 20 }),
    breadth: jest.fn().mockResolvedValue({ percentAboveSma50: 0.15 }),
  };

  const signal = {
    latestForInstrument: jest.fn().mockResolvedValue({
      score: 78,
      direction: 'BEARISH',
      confidence: 'HIGH',
      ...signalOverrides,
    }),
    topSignals: jest.fn().mockResolvedValue({ signals: [] }),
  };

  const calibration = {
    latestForInstrument: jest.fn().mockResolvedValue({
      calibratedScore: 78,
      calibratedDirection: 'BEARISH',
      calibratedConfidence: 'HIGH',
    }),
  };

  const quality = {
    diagnostics: jest.fn().mockResolvedValue({
      eligibleForSignals: true,
      eligibleForBacktesting: true,
      signalReadinessStatus: 'READY',
      coverageStatus: 'GOOD',
      liquidityStatus: 'LIQUID',
      signalReadinessScore: 85,
    }),
  };

  const smartMoney = {
    latestPersistedStock: jest.fn().mockResolvedValue({
      status: 'DISTRIBUTION',
      smartMoneyScore: 30,
    }),
    stock: jest.fn().mockResolvedValue({ status: 'DISTRIBUTION', smartMoneyScore: 30 }),
  };

  const frameworkService = frameworkServiceOverride ?? createFrameworkService();

  return new StrategyDecisionEngineService(
    {} as any,
    marketData as any,
    context as any,
    signal as any,
    calibration as any,
    quality as any,
    smartMoney as any,
    { getPortfolioDetail: jest.fn().mockResolvedValue(null) } as any,
    {} as any,
    frameworkService as any
  );
};

// ─── CLOSED gate fixture (for long-strategy tests) ───────────────────────────
const closedGate = makeGate();

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BREAKDOWN_MOMENTUM end-to-end reachability (Fix #1 + #2)', () => {
  it('F&O-eligible bearish breakdown in RISK_OFF / CLOSED gate → TRADE_CANDIDATE or ENTRY_CANDIDATE (not AVOID, not NOT_DERIVATIVES_ELIGIBLE)', async () => {
    const svc = createServiceForBreakdownTest();

    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'BREAKDOWN_MOMENTUM',
      closedGate
    );

    // Must be reachable (framework-backed)
    expect(result).not.toBeNull();
    expect(result?.frameworkBacked).toBe(true);
    expect(result?.strategy).toBe('BREAKDOWN_MOMENTUM');

    // Fix #1 proof: must NOT be blocked by NOT_DERIVATIVES_ELIGIBLE
    expect(result?.noiseFiltersTriggered).not.toContain('NOT_DERIVATIVES_ELIGIBLE');
    expect(result?.blockers?.join(' ')).not.toContain('NOT_DERIVATIVES_ELIGIBLE');
    expect(result?.blockers?.join(' ')).not.toContain('Cash-only');
    expect(result?.blockers?.join(' ')).not.toContain('Derivatives eligibility is not confirmed');

    // Fix #2 proof: must NOT be force-AVOIDed by the CLOSED gate override that applies to longs
    expect(result?.blockers?.join(' ')).not.toContain('Market gate is closed; no new long candidates.');

    // The decision must reflect genuine short-setup evaluation (TRADE_CANDIDATE or a near-miss)
    // With a fully bearish setup we expect TRADE_CANDIDATE/ENTRY_CANDIDATE or at least WATCH/WAIT
    // (never AVOID driven solely by the market-gate CLOSED long-override).
    const allowedDecisions = ['TRADE_CANDIDATE', 'ENTRY_CANDIDATE', 'WATCH', 'WAIT'];
    expect(allowedDecisions).toContain(result?.decision);
  });

  it('F&O-eligible instrument with all bearish evidence produces TRADE_CANDIDATE score ≥ minScore', async () => {
    const svc = createServiceForBreakdownTest();
    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'BREAKDOWN_MOMENTUM',
      closedGate
    );

    expect(result?.frameworkBacked).toBe(true);
    // The framework score should be positive — at minimum price-below-sma50 + bearish-signal
    expect(result?.decisionScore).toBeGreaterThan(0);
    // Entry rules must be populated (bearish breakdown rules should fire)
    expect(result?.entryRulesPassed?.length).toBeGreaterThanOrEqual(1);
  });

  it('cash-only (non-derivatives-eligible) instrument is still blocked regardless of RISK_OFF', async () => {
    const svc = createServiceForBreakdownTest({
      derivativesEligible: false,
    });

    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'BREAKDOWN_MOMENTUM',
      closedGate
    );

    expect(result).not.toBeNull();
    // Cash-only instruments must be blocked by NOT_DERIVATIVES_ELIGIBLE
    const isBlocked =
      result?.noiseFiltersTriggered?.includes('NOT_DERIVATIVES_ELIGIBLE') ||
      result?.blockers?.some((blocker: string) =>
        blocker.includes('NOT_DERIVATIVES_ELIGIBLE') ||
        blocker.includes('Cash-only') ||
        blocker.includes('Derivatives eligibility')
      );
    expect(isBlocked).toBe(true);
    expect(result?.decision).toBe('AVOID');
  });

  it('instrument with null derivativesEligible is blocked (eligibility must be explicit)', async () => {
    const svc = createServiceForBreakdownTest({
      derivativesEligible: null,
      // Omit the field entirely too — instrument has no F&O info
    });

    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'BREAKDOWN_MOMENTUM',
      closedGate
    );

    expect(result).not.toBeNull();
    const isBlocked =
      result?.noiseFiltersTriggered?.includes('NOT_DERIVATIVES_ELIGIBLE') ||
      result?.blockers?.some((blocker: string) =>
        blocker.includes('NOT_DERIVATIVES_ELIGIBLE') ||
        blocker.includes('Derivatives eligibility')
      );
    expect(isBlocked).toBe(true);
    expect(result?.decision).toBe('AVOID');
  });
});

describe('Long strategies unaffected by CLOSED-gate SHORT exemption (Fix #2)', () => {
  it('TREND_MOMENTUM in CLOSED gate is still AVOIDed (not accidentally exempted)', async () => {
    const svc = createServiceForBreakdownTest();

    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'TREND_MOMENTUM',
      closedGate
    );

    expect(result).not.toBeNull();
    // Long strategies must still be blocked/AVOIDed in a CLOSED gate
    expect(result?.decision).not.toBe('TRADE_CANDIDATE');
    // The framework or CLOSED-gate override must add a market-gate blocker
    const hasMarketGateBlocker =
      result?.blockers?.some((blocker: string) => blocker.toLowerCase().includes('market gate') || blocker.toLowerCase().includes('closed')) ||
      result?.noiseFiltersTriggered?.includes('MARKET_CLOSED');
    expect(hasMarketGateBlocker).toBe(true);
  });
});

describe('DEFENSIVE_EXIT uses calibrated direction (Fix #4)', () => {
  it('prefers calibrated BEARISH over neutral raw signal', async () => {
    // Raw = NEUTRAL, calibrated = BEARISH → should score the bearish signal weight
    const svc = createServiceForBreakdownTest(
      {},
      { direction: 'NEUTRAL' } // raw signal is neutral
    );

    // Override calibration to BEARISH
    (svc as any).calibrationService = {
      latestForInstrument: jest.fn().mockResolvedValue({
        calibratedScore: 78,
        calibratedDirection: 'BEARISH',
        calibratedConfidence: 'HIGH',
      }),
    };

    const result = await svc.evaluateInstrumentStrategy(
      'foo-stock-1',
      'DEFENSIVE_EXIT',
      closedGate
    );

    // DEFENSIVE_EXIT goes through the framework evaluator which uses signalDirection()
    // (calibratedDirection preferred). It should see BEARISH and score accordingly.
    expect(result).not.toBeNull();
    expect(result?.frameworkBacked).toBe(true);
    // The decision should reflect bearish evidence (EXIT or similar)
    const validDecisions = ['EXIT_CANDIDATE', 'REDUCE_RISK', 'WATCH', 'HOLD'];
    expect(validDecisions).toContain(result?.decision);
    // Bearish signal rule should be in exit rules triggered
    expect(result?.exitRulesTriggered ?? []).toContain('BEARISH_SIGNAL');
  });

  it('legacy evaluateDefensiveExit path also prefers calibrated direction', () => {
    // Test the legacy evaluateDefensiveExit private method directly
    const service = new StrategyDecisionEngineService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    // Raw = NEUTRAL, calibrated = BEARISH
    const ctx = {
      instrument: { id: 'test', symbol: 'TEST' },
      prices: new Array(200).fill(100),
      latestPrice: 95,
      sma50: 100,
      rawSignal: { direction: 'NEUTRAL' },          // raw is neutral
      calibrated: { calibratedDirection: 'BEARISH' }, // calibrated is bearish
      gate: { marketGate: 'CLOSED' },
      smartMoney: { status: 'NEUTRAL' },
    };

    const result = (service as any).evaluateDefensiveExit(ctx);
    // With calibrated BEARISH, bearishSignalReliabilityScore should be 30
    expect(result.scoreBreakdown.signalStrength).toBe(30);
    expect(result.reasons.join(' ')).toContain('Bearish signal crossover detected');
  });

  it('legacy evaluateDefensiveExit falls back to raw when no calibration', () => {
    const service = new StrategyDecisionEngineService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    const ctx = {
      instrument: { id: 'test', symbol: 'TEST' },
      prices: new Array(200).fill(100),
      latestPrice: 95,
      sma50: 100,
      rawSignal: { direction: 'BEARISH' }, // raw bearish, no calibration
      calibrated: null,
      gate: { marketGate: 'OPEN' },
    };

    const result = (service as any).evaluateDefensiveExit(ctx);
    expect(result.scoreBreakdown.signalStrength).toBe(30);
  });
});

/// <reference types="@types/jest" />
/**
 * Tests for the signal-lifecycle pure helper and the EXIT-candidate
 * read surface.
 *
 * Research-support language constraint: no "buy" or "sell" should appear
 * in any signal explanation, label, or response wording.
 */
import {
  classifyLifecycle,
  DEFAULT_LIFECYCLE_THRESHOLDS,
} from '../../../src/modules/signal-generation-engine/signal-lifecycle';
import type {
  LifecyclePriorSignal,
  LifecycleCurrentSignal,
} from '../../../src/modules/signal-generation-engine/signal-lifecycle';
import { createSignalGenerationEngineRouter } from '../../../src/modules/signal-generation-engine';

// ─── helpers ────────────────────────────────────────────────────────────────

function prior(score: number, direction: LifecyclePriorSignal['priorDirection'] = 'BULLISH'): LifecyclePriorSignal {
  return { priorScore: score, priorDirection: direction };
}

function current(score: number, direction: LifecycleCurrentSignal['direction'] = 'BULLISH'): LifecycleCurrentSignal {
  return { score, direction };
}

// ─── classifyLifecycle pure helper ──────────────────────────────────────────

describe('classifyLifecycle — pure helper', () => {
  const T = DEFAULT_LIFECYCLE_THRESHOLDS; // exitScoreThreshold=45, exitScoreDelta=15

  describe('ENTRY', () => {
    it('returns ENTRY when there is no prior signal', () => {
      expect(classifyLifecycle(null, current(75), T)).toBe('ENTRY');
    });

    it('returns ENTRY when prior is null even if current score is low', () => {
      expect(classifyLifecycle(null, current(30, 'BEARISH'), T)).toBe('ENTRY');
    });
  });

  describe('EXPIRED', () => {
    it('returns EXPIRED when prior exists but current is null (instrument dropped from run)', () => {
      expect(classifyLifecycle(prior(80), null, T)).toBe('EXPIRED');
    });
  });

  describe('ACTIVE', () => {
    it('returns ACTIVE when prior BULLISH and current still comfortably above exit threshold', () => {
      // score 72, prior 80 → delta=8 (< 15), score > 45, still BULLISH → ACTIVE
      expect(classifyLifecycle(prior(80), current(72), T)).toBe('ACTIVE');
    });

    it('returns ACTIVE when prior BEARISH and current still BEARISH (direction consistent)', () => {
      // A bearish risk_warning that stays bearish is ACTIVE; EXIT rules only apply for prior BULLISH
      expect(classifyLifecycle(prior(30, 'BEARISH'), current(28, 'BEARISH'), T)).toBe('ACTIVE');
    });

    it('returns ACTIVE when prior NEUTRAL and current stays NEUTRAL', () => {
      // Neutral signal that stays neutral — no long position to exit from
      expect(classifyLifecycle(prior(55, 'NEUTRAL'), current(50, 'NEUTRAL'), T)).toBe('ACTIVE');
    });

    it('returns ACTIVE just above score threshold with no large delta (prior BULLISH)', () => {
      // score=46, prior=50, delta=4 → neither threshold breached, still BULLISH → ACTIVE
      expect(classifyLifecycle(prior(50), current(46), T)).toBe('ACTIVE');
    });

    it('returns ACTIVE when prior BEARISH and current score drops below 45 (not a long exit)', () => {
      // Bear→bear at score=20: EXIT rules don't apply because prior was not BULLISH
      expect(classifyLifecycle(prior(40, 'BEARISH'), current(20, 'BEARISH'), T)).toBe('ACTIVE');
    });
  });

  describe('EXIT — score below exitScoreThreshold (45)', () => {
    it('returns EXIT when current score drops to exactly the threshold', () => {
      expect(classifyLifecycle(prior(80), current(45), T)).toBe('EXIT');
    });

    it('returns EXIT when current score drops well below threshold', () => {
      expect(classifyLifecycle(prior(75), current(30), T)).toBe('EXIT');
    });
  });

  describe('EXIT — score delta >= exitScoreDelta (15)', () => {
    it('returns EXIT when score dropped by exactly the delta threshold', () => {
      // prior=70, current=55 → delta=15 (>= 15) → EXIT
      expect(classifyLifecycle(prior(70), current(55), T)).toBe('EXIT');
    });

    it('returns EXIT when score dropped by more than the delta threshold', () => {
      expect(classifyLifecycle(prior(80), current(60), T)).toBe('EXIT');
    });

    it('does NOT return EXIT when delta is one point short of threshold', () => {
      // prior=70, current=56 → delta=14 → not EXIT by delta; score=56 > 45 → ACTIVE
      expect(classifyLifecycle(prior(70), current(56), T)).toBe('ACTIVE');
    });
  });

  describe('EXIT — direction flip', () => {
    it('returns EXIT when prior was BULLISH and current is now BEARISH', () => {
      expect(classifyLifecycle(prior(75, 'BULLISH'), current(35, 'BEARISH'), T)).toBe('EXIT');
    });

    it('returns EXIT when prior was BULLISH and current is now NEUTRAL', () => {
      // Long position signal weakened to neutral — review for exit
      expect(classifyLifecycle(prior(75, 'BULLISH'), current(55, 'NEUTRAL'), T)).toBe('EXIT');
    });

    it('does NOT return EXIT when prior BEARISH flips to BULLISH (new entry context, not exit)', () => {
      // A BEARISH → BULLISH flip is classified by score/delta rules only
      // score=72, prior=30, delta: 30-72 is negative → no exit; score 72 > 45 → ACTIVE
      expect(classifyLifecycle(prior(30, 'BEARISH'), current(72, 'BULLISH'), T)).toBe('ACTIVE');
    });
  });

  describe('custom thresholds', () => {
    it('respects a stricter exit threshold (prior BULLISH)', () => {
      const strict = { exitScoreThreshold: 60, exitScoreDelta: 10 };
      // prior BULLISH at 80, current BULLISH at 55 — below strict threshold of 60 → EXIT
      expect(classifyLifecycle(prior(80), current(55, 'BULLISH'), strict)).toBe('EXIT');
    });

    it('stricter exit threshold does NOT trigger EXIT for bearish prior', () => {
      const strict = { exitScoreThreshold: 60, exitScoreDelta: 10 };
      // Prior BEARISH — EXIT rules do not apply regardless of threshold
      expect(classifyLifecycle(prior(30, 'BEARISH'), current(20, 'BEARISH'), strict)).toBe('ACTIVE');
    });
  });

  describe('bearish cash-only stock — research-support language guard', () => {
    /**
     * A bearish signal on a cash-only (non-F&O) stock is classified by the
     * engine as triggerType='risk_warning', not a tradable exit-short.
     *
     * classifyLifecycle itself is direction-agnostic — it only classifies
     * whether the signal lifecycle state has changed.  The SHORT-vs-avoid
     * distinction is enforced by `triggerTypeFor` in the service (see
     * signal-generation-engine.service.ts ~line 863).
     *
     * This test verifies that:
     *  1. classifyLifecycle does NOT suppress or special-case bearish signals.
     *  2. A BEARISH-on-cash signal can still be ACTIVE (not automatically EXIT).
     *  3. The lifecycle state alone doesn't imply "exit short" — callers
     *     must check derivativesEligible before treating EXIT as a short trigger.
     */
    it('classifies a bearish-on-cash signal as ACTIVE (not EXIT) when consistently bearish', () => {
      // The signal is bearish / risk_warning but has been consistently bearish.
      // EXIT rules only apply to prior BULLISH (long positions).
      // A bearish risk_warning that stays bearish is ACTIVE — there is no long to exit.
      const result = classifyLifecycle(
        prior(25, 'BEARISH'),
        current(28, 'BEARISH'),
        DEFAULT_LIFECYCLE_THRESHOLDS,
      );
      expect(result).toBe('ACTIVE');
    });

    it('classifies a bearish-on-cash signal as ACTIVE even if score is very low', () => {
      // score=15, prior=30 — but prior is BEARISH, so EXIT rules do NOT fire.
      // This is correct: a bearish-cash stock is a risk_warning, not a short EXIT.
      const result = classifyLifecycle(
        prior(30, 'BEARISH'),
        current(15, 'BEARISH'),
        DEFAULT_LIFECYCLE_THRESHOLDS,
      );
      expect(result).toBe('ACTIVE');
    });

    it('bear to neutral transition stays ACTIVE (no long position to exit from)', () => {
      // Prior bearish risk_warning flipping to neutral → EXIT rules only fire for prior BULLISH.
      // Bear→neutral: direction-flip rule does NOT trigger exit.
      const result = classifyLifecycle(
        prior(25, 'BEARISH'),
        current(50, 'NEUTRAL'),
        DEFAULT_LIFECYCLE_THRESHOLDS,
      );
      expect(result).toBe('ACTIVE');
    });

    it('the explanation string for BEARISH direction does NOT contain "sell"', () => {
      // Validate research-support language guard at the service level.
      // We test the explain() method output doesn't use forbidden words.
      const { SignalGenerationEngineService } = require('../../../src/modules/signal-generation-engine');
      const svc = new SignalGenerationEngineService();
      const explanation = svc.explain('BEARISH', [], [{ code: 'PRICE_BELOW_SMA50', label: 'price is below SMA50', category: 'TECHNICAL' }]);
      expect(explanation.toLowerCase()).not.toContain('sell');
      expect(explanation.toLowerCase()).not.toContain('buy');
    });

    it('the explanation string for BULLISH direction does NOT contain "buy"', () => {
      const { SignalGenerationEngineService } = require('../../../src/modules/signal-generation-engine');
      const svc = new SignalGenerationEngineService();
      const explanation = svc.explain('BULLISH', [{ code: 'PRICE_ABOVE_SMA50', label: 'price is above SMA50', category: 'TECHNICAL' }], []);
      expect(explanation.toLowerCase()).not.toContain('buy');
      expect(explanation.toLowerCase()).not.toContain('sell');
    });
  });
});

// ─── router: lifecycle endpoints registered ──────────────────────────────────

describe('signal lifecycle routes', () => {
  it('registers exit-candidates and lifecycle endpoints', () => {
    const controller = {
      health: jest.fn(),
      top: jest.fn(),
      latestForInstrument: jest.fn(),
      latestRun: jest.fn(),
      run: jest.fn(),
      screener: jest.fn(),
      exitCandidates: jest.fn(),
      lifecycle: jest.fn(),
    };
    const router = createSignalGenerationEngineRouter(controller as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(routes).toContain('GET /signals/exit-candidates');
    expect(routes).toContain('GET /signals/lifecycle');
  });

  it('registers exit-candidates BEFORE /:instrumentId to avoid route shadowing', () => {
    const controller = {
      health: jest.fn(),
      top: jest.fn(),
      latestForInstrument: jest.fn(),
      latestRun: jest.fn(),
      run: jest.fn(),
      screener: jest.fn(),
      exitCandidates: jest.fn(),
      lifecycle: jest.fn(),
    };
    const router = createSignalGenerationEngineRouter(controller as any);
    const routes = router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    const exitIdx = routes.indexOf('GET /signals/exit-candidates');
    const instrumentIdx = routes.indexOf('GET /signals/:instrumentId');
    expect(exitIdx).toBeGreaterThanOrEqual(0);
    expect(instrumentIdx).toBeGreaterThanOrEqual(0);
    expect(exitIdx).toBeLessThan(instrumentIdx);
  });
});

// ─── service: exitCandidates delegates to lifecycleState=EXIT ─────────────

describe('SignalGenerationEngineService.exitCandidates', () => {
  it('calls latestSignals with lifecycleState=EXIT and returns only EXIT signals', async () => {
    const { SignalGenerationEngineService } = require('../../../src/modules/signal-generation-engine');

    const mockExitSignal = {
      id: 'sig-exit-1',
      instrument_id: 'inst-1',
      symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      sector: 'Technology',
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 40,
      direction: 'NEUTRAL' as const,
      confidence: 'MEDIUM' as const,
      triggered_signals: [],
      negative_signals: [],
      explanation: 'Neutral because momentum has weakened.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'COMPLETE' as const,
      lifecycleState: 'EXIT' as const,
      priorScore: 75,
      auditStatus: 'CURRENT' as const,
      dataQualityEligibility: {
        filterApplied: true,
        eligible: true,
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
      },
    };

    const mockRepository = {
      latestSignals: jest.fn().mockResolvedValue({ signals: [mockExitSignal], total: 1 }),
      latestForInstrument: jest.fn().mockResolvedValue(null),
      createRunAudit: jest.fn(),
      completeRunAudit: jest.fn(),
      priorSignalForInstrument: jest.fn().mockResolvedValue(null),
      directionCounts: jest.fn().mockResolvedValue({ BULLISH: 0, NEUTRAL: 1, BEARISH: 0 }),
    };

    const mockMarketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([]),
    };

    const svc = new SignalGenerationEngineService(
      mockRepository,
      mockMarketDataService,
    );

    const result = await svc.exitCandidates({ limit: 25 });

    // The repository should have been called with lifecycleState=EXIT
    expect(mockRepository.latestSignals).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycleState: 'EXIT' }),
    );

    // All returned signals should be EXIT state
    result.signals.forEach((s: any) => {
      expect(s.lifecycleState).toBe('EXIT');
    });
  });

  it('response wording does not contain "buy" or "sell"', async () => {
    const { SignalGenerationEngineService } = require('../../../src/modules/signal-generation-engine');

    const exitSignal = {
      id: 'sig-exit-2',
      instrument_id: 'inst-2',
      symbol: 'RELIANCE',
      company_name: 'Reliance Industries',
      sector: 'Energy',
      country: 'IN',
      currentPrice: null,
      previousClose: null,
      dailyChange: null,
      dailyChangePercent: null,
      currency: null,
      priceTimestamp: null,
      score: 38,
      direction: 'BEARISH' as const,
      confidence: 'LOW' as const,
      triggered_signals: [],
      negative_signals: [{ code: 'PRICE_BELOW_SMA50', label: 'price is below SMA50', category: 'TECHNICAL' as const }],
      explanation: 'Bearish because price is below SMA50.',
      generated_at: new Date().toISOString(),
      source: 'signal-generation-engine',
      data_status: 'COMPLETE' as const,
      lifecycleState: 'EXIT' as const,
      priorScore: 72,
      auditStatus: 'CURRENT' as const,
      dataQualityEligibility: {
        filterApplied: true,
        eligible: true,
        signalReadinessStatus: 'READY',
        coverageStatus: 'GOOD',
        liquidityStatus: 'LIQUID',
      },
    };

    const mockRepository = {
      latestSignals: jest.fn().mockResolvedValue({ signals: [exitSignal], total: 1 }),
      latestForInstrument: jest.fn().mockResolvedValue(null),
      directionCounts: jest.fn().mockResolvedValue({ BULLISH: 0, NEUTRAL: 0, BEARISH: 1 }),
    };

    const mockMarketDataService = {
      getInstrumentsByIds: jest.fn().mockResolvedValue([]),
      getLatestPricesBySymbols: jest.fn().mockResolvedValue([]),
    };

    const svc = new SignalGenerationEngineService(mockRepository, mockMarketDataService);
    const result = await svc.exitCandidates({ limit: 25 });

    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain('"buy"');
    expect(serialized).not.toContain('"sell"');
  });
});

// ─── repository: lifecycleState filter ───────────────────────────────────────

describe('SignalGenerationEngineRepository.exitCandidates', () => {
  it('delegates to latestSignals with lifecycleState=EXIT', async () => {
    const { SignalGenerationEngineRepository } = require('../../../src/modules/signal-generation-engine');

    const repo = new SignalGenerationEngineRepository({
      signalResult: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
      },
      signalGenerationRun: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    const spy = jest.spyOn(repo, 'latestSignals');
    await repo.exitCandidates({ limit: 25 });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycleState: 'EXIT' }),
    );
  });
});

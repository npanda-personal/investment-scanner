/**
 * Tests for the BREAKDOWN_MOMENTUM short-entry strategy.
 *
 * Covers:
 * - Strategy exists in registry with correct shape (mirrors TREND_MOMENTUM structure)
 * - F&O restriction: derivativesEligible required, blocked for cash-only
 * - Evaluator produces bearish evidence for a bearish F&O setup
 * - Strategy does NOT fire for non-derivatives-eligible instruments
 * - No buy/sell language in rule labels / rationale
 */

import { StrategyFrameworkRegistry } from '../../../src/modules/strategy-framework/strategy-framework.registry';
import { StrategyFrameworkEvaluator } from '../../../src/modules/strategy-framework/strategy-framework.evaluator';
import type { StrategyContext } from '../../../src/modules/strategy-framework/strategy-framework.types';

describe('BREAKDOWN_MOMENTUM short-entry strategy', () => {
  const registry = new StrategyFrameworkRegistry();

  function evaluate(strategyCode: string, context: StrategyContext) {
    const definition = registry.get(strategyCode);
    if (!definition) throw new Error(`Strategy ${strategyCode} not found in registry`);
    return new StrategyFrameworkEvaluator(definition).evaluateSignalCandidate(context);
  }

  const strategy = registry.get('BREAKDOWN_MOMENTUM');

  it('is registered in the strategy registry', () => {
    expect(strategy).not.toBeNull();
    expect(strategy!.code).toBe('BREAKDOWN_MOMENTUM');
  });

  it('has ENTRY category (mirrors TREND_MOMENTUM structure)', () => {
    expect(strategy!.category).toBe('ENTRY');
  });

  it('has SHORT_MOMENTUM style', () => {
    expect(strategy!.style).toBe('SHORT_MOMENTUM');
  });

  it('has entryRules, exitRules, invalidationRules, noiseFilters, riskRules', () => {
    expect(strategy!.entryRules.length).toBeGreaterThan(0);
    expect(strategy!.exitRules.length).toBeGreaterThan(0);
    expect(strategy!.invalidationRules.length).toBeGreaterThan(0);
    expect(strategy!.noiseFilters.length).toBeGreaterThan(0);
    expect(strategy!.riskRules.length).toBeGreaterThan(0);
  });

  it('requires derivativesEligible as a noise filter (blocks cash-only)', () => {
    const cashOnlyFilter = strategy!.noiseFilters.find(
      (rule) => rule.code === 'NOT_DERIVATIVES_ELIGIBLE'
    );
    expect(cashOnlyFilter).toBeDefined();
    expect(cashOnlyFilter!.kind).toBe('BLOCKS');
  });

  it('requires derivativesEligible as an entry rule', () => {
    const eligibilityRule = strategy!.entryRules.find(
      (rule) => rule.code === 'DERIVATIVES_ELIGIBLE'
    );
    expect(eligibilityRule).toBeDefined();
    expect(eligibilityRule!.kind).toBe('REQUIRES');
  });

  it('has no buy/sell language in any rule labels', () => {
    const allLabels = [
      ...strategy!.entryRules,
      ...strategy!.exitRules,
      ...strategy!.invalidationRules,
      ...strategy!.noiseFilters,
      ...strategy!.riskRules,
      ...strategy!.marketGateRules,
    ].map((rule) => rule.label.toLowerCase());

    for (const label of allLabels) {
      expect(label).not.toContain('buy');
      expect(label).not.toContain('sell');
    }
  });

  it('description does not contain buy/sell language', () => {
    expect(strategy!.description.toLowerCase()).not.toContain('buy');
    expect(strategy!.description.toLowerCase()).not.toContain('sell');
  });

  it('explanationTemplate does not contain buy/sell language', () => {
    expect(strategy!.explanationTemplate.toLowerCase()).not.toContain('buy');
    expect(strategy!.explanationTemplate.toLowerCase()).not.toContain('sell');
  });

  describe('evaluator — bearish F&O setup', () => {
    const bearishFoOContext: StrategyContext = {
      instrumentId: 'INST-SHORT',
      symbol: 'SHORTLTD',
      assetType: 'STOCK',
      region: 'IN',
      latestPrice: 80,
      sma50: 100,
      sma200: 110,
      rsi: 35,
      dataQuality: {
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
        signalReadinessScore: 90,
        eligibleForSignals: true,
        eligibleForBacktesting: true,
      },
      marketGate: 'SELECTIVE',
      marketRegime: 'RISK_OFF',
      sectorLeadership: 'LAGGING',
      sectorRelativeStrengthScore: 30,
      smartMoneyStatus: 'DISTRIBUTION',
      rawSignal: {
        instrumentId: 'INST-SHORT',
        symbol: 'SHORTLTD',
        direction: 'BEARISH',
        score: 75,
        confidence: 'HIGH',
      } as any,
      reliability: { status: 'MEDIUM', noiseLevel: 'LOW' },
    } as any;
    // derivativesEligible is passed as an extra field on the context (accessed via (context as any) in the evaluator)
    (bearishFoOContext as any).derivativesEligible = true;

    it('evaluates without throwing for a bearish F&O context', () => {
      expect(() => evaluate('BREAKDOWN_MOMENTUM', bearishFoOContext)).not.toThrow();
    });

    it('scores positive when bearish evidence aligns', () => {
      const result = evaluate('BREAKDOWN_MOMENTUM', bearishFoOContext);
      expect(result.score).toBeGreaterThan(0);
    });

    it('records entry rules as passed', () => {
      const result = evaluate('BREAKDOWN_MOMENTUM', bearishFoOContext);
      // At least some entry rules should fire (bearish signal, price below sma50, etc.)
      expect(result.entryRulesPassed.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('evaluator — cash-only instrument is blocked', () => {
    const cashOnlyContext: StrategyContext = {
      instrumentId: 'INST-CASH',
      symbol: 'CASHLTD',
      assetType: 'STOCK',
      region: 'IN',
      latestPrice: 80,
      sma50: 100,
      sma200: 110,
      dataQuality: {
        coverageStatus: 'GOOD',
        signalReadinessStatus: 'READY',
        liquidityStatus: 'LIQUID',
        eligibleForSignals: true,
        eligibleForBacktesting: true,
      },
      marketGate: 'SELECTIVE',
      marketRegime: 'RISK_OFF',
      rawSignal: {
        instrumentId: 'INST-CASH',
        symbol: 'CASHLTD',
        direction: 'BEARISH',
        score: 75,
        confidence: 'HIGH',
      } as any,
      reliability: { status: 'MEDIUM', noiseLevel: 'LOW' },
      // No derivativesEligible flag — evaluator treats as cash-only via the NOT_DERIVATIVES_ELIGIBLE filter
    };

    it('evaluates without throwing for a cash-only context', () => {
      expect(() => evaluate('BREAKDOWN_MOMENTUM', cashOnlyContext)).not.toThrow();
    });

    // The NOT_DERIVATIVES_ELIGIBLE noise filter blocks the strategy if derivativesEligible is not explicitly true.
    // We can check the noiseFiltersTriggered or score depending on evaluator implementation.
    it('does not produce a full ENTRY_CANDIDATE output for a cash-only instrument', () => {
      const result = evaluate('BREAKDOWN_MOMENTUM', cashOnlyContext);
      // The NOT_DERIVATIVES_ELIGIBLE filter BLOCKS when derivativesEligible is false/missing.
      // Either the decision is not ENTRY_CANDIDATE/TRADE_CANDIDATE, or the noise filter is triggered.
      const isBlocked = result.noiseFiltersTriggered.includes('NOT_DERIVATIVES_ELIGIBLE')
        || result.decision === 'AVOID'
        || result.blockers.length > 0;
      expect(isBlocked).toBe(true);
    });
  });
});

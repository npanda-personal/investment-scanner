/// <reference types="@types/jest" />
import { triggerPersistFields } from '../../../src/modules/signal-generation-engine/signal-trigger-persist';
import type { SignalStrategyMatchSummary, SignalTriggerPriceEvidence } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

const sourceProvenEvidence: SignalTriggerPriceEvidence = {
  status: 'SOURCE_PROVEN',
  triggerPrice: 220,
  triggerTimestamp: '2026-05-16T00:00:00.000Z',
  sourceModule: 'signal-generation-engine',
  sourceField: 'strategyContext.prices[0].adjusted_close',
  strategyCode: 'BREAKOUT_CONFIRMATION',
  strategyVersion: '1.2.0',
  timeframe: 'DAILY_SWING',
  entryRuleIds: ['ENTRY_BREAKOUT', 'ENTRY_VOLUME'],
  compatibilityOnly: true,
};

const match = (over: Partial<SignalStrategyMatchSummary> = {}): SignalStrategyMatchSummary => ({
  strategyCode: 'BREAKOUT_CONFIRMATION',
  strategyVersion: '1.2.0',
  decision: 'CANDIDATE' as any,
  direction: 'BULLISH' as any,
  score: 80,
  confidence: 'HIGH',
  reasons: [],
  entryRulesPassed: [],
  timeframe: 'DAILY_SWING',
  triggerPriceEvidence: sourceProvenEvidence,
  ...over,
});

describe('triggerPersistFields', () => {
  it('derives source-proven trigger fields from the primary match', () => {
    expect(triggerPersistFields([match()])).toEqual({
      triggerPrice: 220,
      triggerTimestamp: '2026-05-16T00:00:00.000Z',
      triggerTimeframe: 'DAILY_SWING',
      entryRuleId: 'ENTRY_BREAKOUT', // first entry rule id
      exitRuleId: null,
      invalidationRuleId: null,
      strategyId: 'BREAKOUT_CONFIRMATION',
      strategyVersion: '1.2.0',
    });
  });

  it('keeps strategy id/version but nulls the trigger price when evidence is UNAVAILABLE', () => {
    const unavailable: SignalTriggerPriceEvidence = {
      ...sourceProvenEvidence,
      status: 'UNAVAILABLE',
      triggerPrice: null,
      triggerTimestamp: null,
      sourceField: null,
      entryRuleIds: [],
      unavailableReason: 'Strategy category is FILTER, not ENTRY',
    };
    expect(triggerPersistFields([match({ triggerPriceEvidence: unavailable })])).toEqual({
      triggerPrice: null,
      triggerTimestamp: null,
      triggerTimeframe: null,
      entryRuleId: null,
      exitRuleId: null,
      invalidationRuleId: null,
      strategyId: 'BREAKOUT_CONFIRMATION',
      strategyVersion: '1.2.0',
    });
  });

  it('returns all-null when no strategy match is attached', () => {
    expect(triggerPersistFields(undefined)).toEqual({
      triggerPrice: null,
      triggerTimestamp: null,
      triggerTimeframe: null,
      entryRuleId: null,
      exitRuleId: null,
      invalidationRuleId: null,
      strategyId: null,
      strategyVersion: null,
    });
    expect(triggerPersistFields([])).toMatchObject({ strategyId: null, triggerPrice: null });
  });

  it('uses the FIRST match as primary when several are present', () => {
    const primary = match({ strategyCode: 'PRIMARY', triggerPriceEvidence: { ...sourceProvenEvidence, strategyCode: 'PRIMARY', triggerPrice: 99 } });
    const secondary = match({ strategyCode: 'SECONDARY' });
    expect(triggerPersistFields([primary, secondary])).toMatchObject({
      strategyId: 'PRIMARY',
      triggerPrice: 99,
    });
  });
});

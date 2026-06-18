/**
 * signal-trigger-persist.ts
 *
 * Pure derivation of the §17 Trigger Object fields that get PERSISTED on each
 * SignalResult row at write time. Source of truth is the primary strategy match's
 * `triggerPriceEvidence`: trigger price/timestamp/timeframe and the first entry-rule
 * id are emitted ONLY when that evidence is SOURCE_PROVEN. strategyId/strategyVersion
 * come from the primary match whenever one exists (even without a proven trigger
 * price). exit/invalidation rule ids are not emitted by the framework yet, so they
 * are always null here. When there is no source-proven trigger and no match at all,
 * every field is null — the row honestly records "no durable trigger".
 *
 * No I/O, no service state — trivially unit-testable and reusable.
 */
import type { SignalStrategyMatchSummary } from './signal-generation-engine.types';

export interface TriggerPersistFields {
  triggerPrice: number | null;
  triggerTimestamp: string | null;
  triggerTimeframe: string | null;
  entryRuleId: string | null;
  exitRuleId: string | null;
  invalidationRuleId: string | null;
  strategyId: string | null;
  strategyVersion: string | null;
}

const EMPTY: TriggerPersistFields = {
  triggerPrice: null,
  triggerTimestamp: null,
  triggerTimeframe: null,
  entryRuleId: null,
  exitRuleId: null,
  invalidationRuleId: null,
  strategyId: null,
  strategyVersion: null,
};

/**
 * Derives the durable trigger fields from the strategy matches attached to a
 * generated signal DTO. The primary match is the first entry in `strategyMatches`.
 */
export function triggerPersistFields(
  strategyMatches?: SignalStrategyMatchSummary[] | null,
): TriggerPersistFields {
  const primary = strategyMatches?.[0];
  if (!primary) return { ...EMPTY };

  // strategyId/version are known whenever a match exists, regardless of trigger proof.
  const strategyId = primary.strategyCode ?? null;
  const strategyVersion = primary.strategyVersion ?? null;

  const evidence = primary.triggerPriceEvidence ?? null;
  const sourceProven = evidence?.status === 'SOURCE_PROVEN' ? evidence : null;

  return {
    triggerPrice: sourceProven?.triggerPrice ?? null,
    triggerTimestamp: sourceProven?.triggerTimestamp ?? null,
    triggerTimeframe: sourceProven?.timeframe ?? null,
    entryRuleId: sourceProven?.entryRuleIds?.[0] ?? null,
    // Not emitted by the Strategy Framework yet — honestly null.
    exitRuleId: null,
    invalidationRuleId: null,
    strategyId,
    strategyVersion,
  };
}

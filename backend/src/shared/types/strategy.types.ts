// FrameworkEvaluationDecision — the 9-member raw evaluator set used by strategy-framework.
// strategy-framework re-exports this as its local `StrategyDecision` alias so that
// its existing importers (signal-generation-engine, backtesting) are unchanged.
export type FrameworkEvaluationDecision =
  | 'SIGNAL'
  | 'ENTRY_CANDIDATE'
  | 'WAIT'
  | 'WATCH'
  | 'AVOID'
  | 'EXIT_CANDIDATE'
  | 'REDUCE_RISK'
  | 'HOLD'
  | 'INSUFFICIENT_DATA';

// StrategyDecision — the 8-member canonical published set used by strategy-decision-engine
// and all downstream consumers (research-hub, today-trade-review, snapshot assembler).
// SIGNAL / ENTRY_CANDIDATE from the framework both map to TRADE_CANDIDATE here.
export type StrategyDecision =
  | 'TRADE_CANDIDATE'
  | 'WATCH'
  | 'WAIT'
  | 'AVOID'
  | 'EXIT_CANDIDATE'
  | 'REDUCE_RISK'
  | 'HOLD'
  | 'INSUFFICIENT_DATA';

// mapFrameworkDecisionToStrategyDecision
// Preserves the exact semantics of the private mapFrameworkDecision method at
// strategy-decision-engine.service.ts:657-666.
export function mapFrameworkDecisionToStrategyDecision(d: FrameworkEvaluationDecision): StrategyDecision {
  if (d === 'ENTRY_CANDIDATE' || d === 'SIGNAL') return 'TRADE_CANDIDATE';
  if (d === 'WATCH') return 'WATCH';
  if (d === 'WAIT') return 'WAIT';
  if (d === 'AVOID') return 'AVOID';
  if (d === 'INSUFFICIENT_DATA') return 'INSUFFICIENT_DATA';
  if (d === 'EXIT_CANDIDATE') return 'EXIT_CANDIDATE';
  if (d === 'REDUCE_RISK') return 'REDUCE_RISK';
  return 'HOLD';
}

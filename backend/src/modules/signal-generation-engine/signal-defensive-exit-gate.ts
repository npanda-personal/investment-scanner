/**
 * signal-defensive-exit-gate.ts
 *
 * Entry-time gate: a bullish entry must NOT be emitted for an instrument whose
 * CURRENT DEFENSIVE_EXIT decision already carries exit/invalidation evidence.
 * Such "born-dead" entries fire on stocks already in a technical downtrend, so
 * the position ledger immediately closes them on their own entry candle (exit
 * date == entry date), polluting win-rate / KPI history.
 *
 * Mechanism — the gate DEMOTES the signal direction BULLISH -> NEUTRAL. direction
 * is a persisted column, so the demotion survives the ledger's read-time trigger-
 * contract rebuild (a non-persisted flag would be lost on re-read, and adding a
 * new column is owner-gated). triggerTypeFor() then routes NEUTRAL to
 * 'risk_warning' instead of 'bullish_entry_trigger', so the ledger never opens
 * the position (signal-position-ledger.service: trigger_type !== 'bullish_entry_trigger').
 * An audit row is appended to negative_signals (also persisted) for traceability.
 *
 * The "under defensive exit" test is DECISION-DRIVEN and mirrors the ledger's own
 * close-evidence rule (signal-position-ledger.repository.firstCloseEvidenceDates)
 * EXACTLY, so the gate suppresses precisely the entries that would otherwise close
 * on day one:
 *   exit:        decision IN (EXIT_CANDIDATE, REDUCE_RISK)
 *   invalidation: invalidationRulesTriggered > 0
 *
 * It honors the DEFENSIVE_EXIT strategy's own verdict: `decision` is the aggregated,
 * score-thresholded judgment. The framework EXIT path — the one that actually populates the
 * persisted `exitRulesTriggered` column — maps score >=60 -> EXIT_CANDIDATE, >=40 -> REDUCE_RISK,
 * else HOLD (strategy-framework.evaluator). A HOLD verdict means "stay invested, do not exit".
 * Individual exit *rules* fire well below those thresholds, so a stock can carry a few
 * triggered exit rules yet still net to HOLD —
 * we deliberately do NOT gate on raw `exitRulesTriggered.length > 0`, because doing so
 * overrides the strategy's HOLD verdict and suppressed nearly the entire bullish universe
 * (e.g. 888 of 1,097 IN demotions on 2026-06-24 were HOLD instruments). A genuine exit
 * always escalates the decision, so no real exit is missed. The ledger close rule was
 * relaxed in lockstep — keep the two in sync.
 *
 * Like the regime gate (applyRegimeGateToShort), it is conservative, additive and
 * live-runs-only: skipped for as-of/backfill runs, where no current decision applies.
 *
 * High-conviction floor — a signal scoring strictly above HIGH_CONVICTION_BULLISH_SCORE
 * is treated as unconditionally bullish and is NEVER demoted by this gate, regardless of
 * defensive-exit posture. Such a score is top-decile bullish evidence; surfacing it as
 * NEUTRAL (with the high score still attached) is self-contradictory on the screener, so
 * the owner's rule is that the score is authoritative at this tier.
 */
import prisma from '../../db/prisma';
import type { SignalDirection, SignalItem } from './signal-generation-engine.types';

/**
 * Bullish-conviction score above which the defensive-exit gate never demotes. Scores are
 * integer 0–100; "> 90" means the 91–100 band. A single, obvious knob for the owner rule.
 */
export const HIGH_CONVICTION_BULLISH_SCORE = 90;

export interface DefensiveExitEvidence {
  decision: string | null;
  exitRulesTriggered: string[];
  invalidationRulesTriggered: string[];
}

/** True when the latest DEFENSIVE_EXIT decision flags an active exit/invalidation posture. */
export function isUnderDefensiveExit(ev?: DefensiveExitEvidence | null): boolean {
  if (!ev) return false;
  // Decision-driven: gate only on the strategy's aggregated exit verdict or a hard
  // invalidation — NOT on raw sub-threshold exit-rule fires that net to HOLD. See header.
  return (
    ev.decision === 'EXIT_CANDIDATE' ||
    ev.decision === 'REDUCE_RISK' ||
    (ev.invalidationRulesTriggered?.length ?? 0) > 0
  );
}

function gateReason(ev: DefensiveExitEvidence): string {
  const rules = [...(ev.invalidationRulesTriggered ?? []), ...(ev.exitRulesTriggered ?? [])];
  const detail = rules.length ? rules.join(', ') : (ev.decision ?? 'active defensive-exit posture');
  return `Bullish entry suppressed: instrument is under an active defensive-exit posture (${detail}).`;
}

/**
 * Applies the entry gate. For a live (non-as-of) BULLISH signal whose instrument is
 * under defensive exit, returns 'NEUTRAL' and appends an audit detail to
 * negativeSignals; otherwise returns the original direction unchanged.
 *
 * A signal scoring strictly above HIGH_CONVICTION_BULLISH_SCORE is exempt from demotion
 * (high-conviction floor — see header).
 */
export function applyDefensiveExitEntryGate(
  direction: SignalDirection,
  score: number,
  asOfDate: Date | null | undefined,
  evidence: DefensiveExitEvidence | undefined,
  negativeSignals: SignalItem[],
): SignalDirection {
  if (
    asOfDate ||
    direction !== 'BULLISH' ||
    score > HIGH_CONVICTION_BULLISH_SCORE ||
    !isUnderDefensiveExit(evidence)
  )
    return direction;
  negativeSignals.push({ code: 'DEFENSIVE_EXIT_ENTRY_GATE', label: gateReason(evidence!), category: 'TECHNICAL' });
  return 'NEUTRAL';
}

/** Batch-loads the latest DEFENSIVE_EXIT decision per instrument for the entry gate. */
export async function loadDefensiveExitEvidence(instrumentIds: string[]): Promise<Map<string, DefensiveExitEvidence>> {
  const map = new Map<string, DefensiveExitEvidence>();
  if (!instrumentIds.length) return map;
  try {
    const rows = await prisma.strategyDecisionResult.findMany({
      where: { instrumentId: { in: instrumentIds }, strategy: 'DEFENSIVE_EXIT' },
      orderBy: [{ instrumentId: 'asc' }, { generatedAt: 'desc' }],
      distinct: ['instrumentId'],
      select: { instrumentId: true, decision: true, exitRulesTriggered: true, invalidationRulesTriggered: true },
    });
    for (const r of rows) {
      if (!r.instrumentId) continue;
      map.set(r.instrumentId, {
        decision: r.decision ?? null,
        exitRulesTriggered: Array.isArray(r.exitRulesTriggered) ? (r.exitRulesTriggered as unknown[]).map(String) : [],
        invalidationRulesTriggered: Array.isArray(r.invalidationRulesTriggered) ? (r.invalidationRulesTriggered as unknown[]).map(String) : [],
      });
    }
  } catch {
    // Defensive: if the decision table is unavailable, the gate simply doesn't fire.
  }
  return map;
}

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
 * The "under defensive exit" test mirrors the ledger's own close-evidence rule
 * (signal-position-ledger.repository.firstCloseEvidenceDates) EXACTLY, so the gate
 * suppresses precisely the entries that would otherwise close on day one:
 *   exit:        decision IN (EXIT_CANDIDATE, REDUCE_RISK) OR exitRulesTriggered > 0
 *   invalidation: invalidationRulesTriggered > 0
 *
 * Like the regime gate (applyRegimeGateToShort), it is conservative, additive and
 * live-runs-only: skipped for as-of/backfill runs, where no current decision applies.
 */
import prisma from '../../db/prisma';
import type { SignalDirection, SignalItem } from './signal-generation-engine.types';

export interface DefensiveExitEvidence {
  decision: string | null;
  exitRulesTriggered: string[];
  invalidationRulesTriggered: string[];
}

/** True when the latest DEFENSIVE_EXIT decision flags an active exit/invalidation posture. */
export function isUnderDefensiveExit(ev?: DefensiveExitEvidence | null): boolean {
  if (!ev) return false;
  return (
    ev.decision === 'EXIT_CANDIDATE' ||
    ev.decision === 'REDUCE_RISK' ||
    (ev.exitRulesTriggered?.length ?? 0) > 0 ||
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
 */
export function applyDefensiveExitEntryGate(
  direction: SignalDirection,
  asOfDate: Date | null | undefined,
  evidence: DefensiveExitEvidence | undefined,
  negativeSignals: SignalItem[],
): SignalDirection {
  if (asOfDate || direction !== 'BULLISH' || !isUnderDefensiveExit(evidence)) return direction;
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

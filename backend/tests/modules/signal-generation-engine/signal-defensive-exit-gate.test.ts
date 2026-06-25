/**
 * Unit tests for the defensive-exit ENTRY gate (signal-defensive-exit-gate).
 *
 * The gate prevents "born-dead" bullish entries: a bullish signal must not be
 * emitted for an instrument whose current DEFENSIVE_EXIT decision already carries
 * exit/invalidation evidence (those would close on their own entry candle and
 * pollute the position ledger). It demotes BULLISH -> NEUTRAL, which the trigger
 * contract then routes to 'risk_warning' instead of 'bullish_entry_trigger'.
 *
 * These import only the pure gate + the pure trigger-contract builder (no service,
 * no DB), so they run independently of the module graph.
 */
import {
  applyDefensiveExitEntryGate,
  isUnderDefensiveExit,
  HIGH_CONVICTION_BULLISH_SCORE,
  type DefensiveExitEvidence,
} from '../../../src/modules/signal-generation-engine/signal-defensive-exit-gate';
import { triggerTypeFor } from '../../../src/modules/signal-generation-engine/signal-trigger-contract';
import type { SignalItem } from '../../../src/modules/signal-generation-engine/signal-generation-engine.types';

const clean: DefensiveExitEvidence = { decision: 'HOLD', exitRulesTriggered: [], invalidationRulesTriggered: [] };

describe('isUnderDefensiveExit — decision-driven, mirrors the ledger close-evidence rule', () => {
  it('false for no evidence / clean posture', () => {
    expect(isUnderDefensiveExit(undefined)).toBe(false);
    expect(isUnderDefensiveExit(null)).toBe(false);
    expect(isUnderDefensiveExit(clean)).toBe(false);
  });

  it('true when the decision is EXIT_CANDIDATE or REDUCE_RISK', () => {
    expect(isUnderDefensiveExit({ ...clean, decision: 'EXIT_CANDIDATE' })).toBe(true);
    expect(isUnderDefensiveExit({ ...clean, decision: 'REDUCE_RISK' })).toBe(true);
  });

  it('FALSE when only sub-threshold exit rules fired under a HOLD verdict (decision-driven: honor HOLD)', () => {
    // A HOLD verdict means "stay invested, do not exit". Raw exit-rule fires that did not
    // escalate the decision must NOT gate the entry — otherwise nearly the entire bullish
    // universe is suppressed (the 2026-06-24 IN regression). A genuine exit escalates the
    // decision to EXIT_CANDIDATE/REDUCE_RISK, so nothing real is missed.
    expect(isUnderDefensiveExit({ ...clean, decision: 'HOLD', exitRulesTriggered: ['DEATH_CROSS'] })).toBe(false);
  });

  it('true when any invalidation rule triggered (a hard invalidation gates regardless of decision)', () => {
    expect(isUnderDefensiveExit({ ...clean, invalidationRulesTriggered: ['SMA200_BREACH'] })).toBe(true);
  });
});

// A mid-range score (below the high-conviction floor) so the demotion path is exercised.
const MID_SCORE = 70;

describe('applyDefensiveExitEntryGate', () => {
  it('demotes a live BULLISH signal to NEUTRAL and records an audit negative-signal', () => {
    const neg: SignalItem[] = [];
    const ev: DefensiveExitEvidence = { decision: 'EXIT_CANDIDATE', exitRulesTriggered: ['DEATH_CROSS'], invalidationRulesTriggered: [] };
    const out = applyDefensiveExitEntryGate('BULLISH', MID_SCORE, undefined, ev, neg);
    expect(out).toBe('NEUTRAL');
    expect(neg).toHaveLength(1);
    expect(neg[0].code).toBe('DEFENSIVE_EXIT_ENTRY_GATE');
    expect(neg[0].label).toContain('DEATH_CROSS');
  });

  it('leaves a BULLISH signal untouched when the instrument is not under defensive exit', () => {
    const neg: SignalItem[] = [];
    expect(applyDefensiveExitEntryGate('BULLISH', MID_SCORE, undefined, clean, neg)).toBe('BULLISH');
    expect(neg).toHaveLength(0);
  });

  it('leaves a BULLISH signal untouched when there is no evidence at all', () => {
    const neg: SignalItem[] = [];
    expect(applyDefensiveExitEntryGate('BULLISH', MID_SCORE, undefined, undefined, neg)).toBe('BULLISH');
    expect(neg).toHaveLength(0);
  });

  it('never gates non-bullish directions', () => {
    const neg: SignalItem[] = [];
    const ev: DefensiveExitEvidence = { decision: 'EXIT_CANDIDATE', exitRulesTriggered: [], invalidationRulesTriggered: [] };
    expect(applyDefensiveExitEntryGate('BEARISH', MID_SCORE, undefined, ev, neg)).toBe('BEARISH');
    expect(applyDefensiveExitEntryGate('NEUTRAL', MID_SCORE, undefined, ev, neg)).toBe('NEUTRAL');
    expect(neg).toHaveLength(0);
  });

  it('does not gate as-of/backfill runs (no current decision applies to past dates)', () => {
    const neg: SignalItem[] = [];
    const ev: DefensiveExitEvidence = { decision: 'EXIT_CANDIDATE', exitRulesTriggered: ['DEATH_CROSS'], invalidationRulesTriggered: [] };
    expect(applyDefensiveExitEntryGate('BULLISH', MID_SCORE, new Date('2026-01-10'), ev, neg)).toBe('BULLISH');
    expect(neg).toHaveLength(0);
  });
});

describe('applyDefensiveExitEntryGate — high-conviction score floor (owner rule: > 90 always bullish)', () => {
  const exiting: DefensiveExitEvidence = { decision: 'EXIT_CANDIDATE', exitRulesTriggered: ['DEATH_CROSS'], invalidationRulesTriggered: ['SMA200_BREACH'] };

  it('does NOT demote a BULLISH signal scoring above the floor, even under an active exit + invalidation posture', () => {
    const neg: SignalItem[] = [];
    expect(applyDefensiveExitEntryGate('BULLISH', HIGH_CONVICTION_BULLISH_SCORE + 1, undefined, exiting, neg)).toBe('BULLISH');
    expect(applyDefensiveExitEntryGate('BULLISH', 99, undefined, exiting, neg)).toBe('BULLISH');
    expect(neg).toHaveLength(0); // no audit marker, since nothing was gated
  });

  it('still demotes at exactly the floor (boundary is strict: only scores ABOVE 90 are exempt)', () => {
    const neg: SignalItem[] = [];
    expect(applyDefensiveExitEntryGate('BULLISH', HIGH_CONVICTION_BULLISH_SCORE, undefined, exiting, neg)).toBe('NEUTRAL');
    expect(neg).toHaveLength(1);
    expect(neg[0].code).toBe('DEFENSIVE_EXIT_ENTRY_GATE');
  });
});

describe('trigger-contract integration — the demotion stops the ledger entry', () => {
  it('a gated (NEUTRAL) signal yields risk_warning, NOT bullish_entry_trigger', () => {
    // Before the gate: a BULLISH signal would be a tradable bullish_entry_trigger.
    expect(triggerTypeFor('BULLISH', true)).toBe('bullish_entry_trigger');
    // After the gate demotes it to NEUTRAL, the ledger-opening trigger type is gone.
    expect(triggerTypeFor('NEUTRAL', true)).toBe('risk_warning');
  });
});

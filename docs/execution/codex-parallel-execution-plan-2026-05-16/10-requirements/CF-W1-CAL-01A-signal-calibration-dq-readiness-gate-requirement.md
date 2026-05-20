# CF-W1-CAL-01A - Signal Calibration DQ Readiness Gate Requirement

Date: 2026-05-19

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Signal Calibration is only useful as research support when blocking DQ evidence cannot leak through as normal downstream influence. The remaining gap is narrower than `CF-W1-CAL-01`: a calibrated score may still exist, but if the latest DQ evaluation is missing or explicitly blocking, downstream consumers must not read that result as trustworthy calibration or confuse it with a normal trusted signal.

This child keeps calibration useful for inspection while preventing weak or absent DQ evidence from looking like a normal research signal. The next slice should make the trust state explicit so users can tell trusted, limited, diagnostic-only, and unavailable calibration apart without changing score math.

## Evidence

- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md` identified the blocking DQ states that still do not hard-gate calibration: `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` already separates calibration evidence, readiness, downstream influence, and authoritative score, so this child can stay additive.
- The same module doc already shows that missing DQ is treated as a data gap, not a first-class trust state, which is why the requirement needs explicit trust labeling instead of another score tweak.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/TEAM-06-lane2-dq-fail-closed-contract-draft-2026-05-17.md` and `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/TEAM-06-lane2-dq-fail-closed-qa-plan-2026-05-17.md` already name `CF-W1-CAL-01A`, confirming this is a narrower follow-on rather than a new module.
- `CF-W1-CAL-01` already covers calibration trust-state semantics; this child focuses only on the fail-closed DQ readiness gate.

## Dependencies

- Keep `CF-W1-CAL-01` as the trust-state parent.
- Use existing Signal Quality Lab and Data Quality Engine public outputs only.
- Do not widen into schema, route, controller, repository, frontend, or persistence changes.

## Bounded Requirement

Define a calibration DQ readiness gate that suppresses normal downstream influence whenever current DQ evidence is explicitly blocking or absent, and surface the result as a clear trust state rather than a silent penalty or generic warning.

The first child slice should focus on:

- `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID` mapping to blocked calibration influence;
- missing latest DQ evaluation remaining diagnostic-only or unavailable rather than normal influence;
- additive trust-state reasons and blockers inside the existing calibration readiness surface;
- a stable distinction between trusted, limited, diagnostic-only, and unavailable calibration output;
- no score-math rewrite and no duplicate DQ scoring logic.

## Acceptance Criteria

- Blocking DQ states do not produce normal downstream influence.
- Missing DQ evidence is explicit and not treated as trusted calibration.
- The calibration response can distinguish trusted, limited, diagnostic-only, and unavailable outcomes without changing the underlying score math.
- Existing calibrated/raw score behavior and current response fields stay intact.
- The user can tell whether calibration is trusted, limited, diagnostic-only, or unavailable.
- Focused tests cover each explicit DQ blocker and the missing-evidence case.

## Non-Goals

- No schema, route, controller, repository, or frontend changes.
- No new calibration model or score-math rewrite.
- No duplicate DQ scoring logic outside calibration.
- No provider, live-market, paid/cloud, broker, or telemetry work.

## Next Gate

Team 03 architecture and Team 04 QA prep for the bounded calibration DQ readiness child, then Team 00 routing if the existing `CF-W1-CAL-01` trust-state packet remains approved.

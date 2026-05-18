# CF-W1-CAL-01 - Signal Calibration Reliability Drift Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Signal Calibration is a trust surface for research and review, not just a score transform. Traders need to know when calibration is still only diagnostic, when downstream influence is limited, and when missing or weak quality evidence makes the calibrated result unreliable. Without that separation, calibration can drift into looking more authoritative than the evidence supports.

## Evidence

- Audit `11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md` found calibration records DQ but treats it as penalty evidence, not a hard gate.
- The same audit found `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID` are not currently hard blockers inside `calibrationReadiness()`.
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md` shows calibration already exposes `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, and evidence metadata, so a bounded trust-state refinement is viable.
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md` shows calibration depends on historical regime and context snapshots, so missing or sparse context can silently weaken trust unless surfaced clearly.

## Acceptance Criteria

- Calibration responses distinguish trusted, limited, unavailable, and diagnostic-only states with stable reasons.
- Missing DQ, insufficient sample, or blocking DQ evidence does not present normal downstream influence.
- The user can see why calibration is limited or unavailable, including the relevant evidence gap or blocker.
- Calibration keeps its current score math and response compatibility unless a later accepted contract explicitly changes the DTO.
- Focused tests cover trusted, limited, unavailable, missing-DQ, and insufficient-context scenarios.

## Non-Goals

- No raw signal generation rewrite.
- No Prisma schema, route registry, shared UI, frontend, provider, paid/cloud, broker, or telemetry work.
- No new calibration model or ML behavior.
- No duplicate DQ scoring logic outside the calibration module.

## Next Gate

Architecture contract and QA plan for a bounded Signal Calibration trust-state slice, with later implementation reserved to the signal-calibration-engine module only.

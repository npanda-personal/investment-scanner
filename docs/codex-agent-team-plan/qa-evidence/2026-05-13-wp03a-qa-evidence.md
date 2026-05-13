# QA Evidence - WP-2026-05-13-03A - 2026-05-13

## Decision

QA signs off `WP-2026-05-13-03A - Calibration Readiness Source Guardrails` after revision.

The prior rejection gap is fixed: `GET /api/v1/signals/calibration/health` now exposes health-level `calibrationEvidence` alongside conservative `calibrationReadiness`.

## Scope Verified

- Product brief: Brief 3, Calibration Readiness And Confidence Guardrails.
- Architecture contract: Brief 3, additive `calibrationEvidence` and `calibrationReadiness` on Calibration-owned responses, including health.
- Prior QA rejection: missing health-level `calibrationEvidence`.
- Current Signal Calibration source/tests only; no source or test files were modified by QA.

## Memory Gate

- Attempted memory check with `Microsoft.VisualBasic.Devices.ComputerInfo`.
  - Result: blocked/unavailable because the type is not loaded in this PowerShell environment.
- Attempted fallback memory check with `Get-CimInstance Win32_OperatingSystem`.
  - Result: blocked by sandbox access denial.
- Because memory telemetry was unavailable, QA limited process-heavy validation to focused backend Signal Calibration tests and backend build. No frontend or broad-suite checks were started.

## Commands Run By QA

- `backend`: `npm.cmd test -- signal-calibration-engine.service signal-calibration-engine.routes --runInBand`
  - Result: passed, 2 suites / 22 tests.
- `backend`: `npm.cmd run build`
  - Result: passed.
- `backend`: `npm.cmd test -- signal-calibration-engine --runInBand`
  - Result: passed, 4 suites / 29 tests.

## Source And Test Evidence

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
  - `health()` now returns `calibrationEvidence: this.healthCalibrationEvidence(...)`.
  - No persisted rows set `evidenceStatus: INSUFFICIENT`, zero overall/group samples, required thresholds through the standardized evidence shape, and `calibrationReadiness.status: UNAVAILABLE`.
  - Existing persisted rows without stored readiness evidence set `evidenceStatus: MISSING` and use `missingPersistedReadiness(...)`, which keeps `downstreamInfluence: NONE` and `authoritativeScore: RAW_SCORE`.
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
  - Covers no-row health evidence: `INSUFFICIENT`, zero samples, required thresholds, and `UNAVAILABLE/NONE`.
  - Covers persisted rows lacking readiness evidence: `MISSING`, zero samples, required thresholds, and `UNAVAILABLE/NONE/RAW_SCORE`.
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
  - Confirms the health API handler returns `calibrationEvidence` with horizon, evidence status, sample counts, and required sample thresholds alongside conservative readiness.

## Skipped Checks

- Frontend build and UI smoke were skipped for this revision verification.
  - Reason: the rejected gap was a backend health response contract gap, and the revision handoff states frontend checks were skipped because no frontend files changed for the revision.
  - Note: the shared worktree contains frontend modifications from other workers/packets, so QA did not use worktree dirtiness alone as evidence of this revision's scope and did not touch those files.
- Live authenticated API check was skipped.
  - Reason: focused service/route tests directly cover the revised health payload semantics, and memory telemetry was unavailable for broader process startup.

## Blockers

- None.

## Final Handoff

SIGN OFF.

No commit or push was performed by QA.

# TEAM-06 Lane 2 DQ Fail-Closed Audit

Date: 2026-05-17

Team: TEAM-06 - Strategy / Signal / Risk

Status: Audit complete. Not implementation approval.

## Scope

Read-only audit of Strategy / Signal / Risk modules after the ready queue confirmed that no Team 06 application-code item is currently Ready for Implementation.

Primary question: where do Lane 2 workflows still treat Data Quality as optional, advisory, or fail-open instead of hard gating trusted downstream use?

## Files Inspected

Backtesting Strategy Lab:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`

Signal Quality Lab:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.module.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

Signal Calibration Engine:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.validation.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.repository.test.ts`

## Queue Result

No Team 06 implementation item was pulled.

`12-ready-queue/ready-for-implementation.md` states that no active application-code item is Ready for Implementation. `CF-W1-TP-01B` remains the closest Team 06 candidate, but it still needs Team 00 Ready promotion after child QA acceptance.

## Backtesting Strategy Lab Findings

Current Data Quality behavior is optional and partly fail-open:

- `applyDataQualityFilter()` bypasses Data Quality Engine entirely when `config.useDataQualityFilter` is absent or false.
- When DQ filtering is enabled, missing quality defaults to warning/process because `excludeMissingQuality` defaults false and `missingQualityBehavior` becomes `WARN_AND_PROCESS`.
- `includeLimited` is derived from `!config.excludeNotReady`, so caller options can allow limited readiness into the backtest universe.
- Per-instrument price-history lookup failures are swallowed with `.catch(() => null)` and represented as missing history rather than failing the run.
- Benchmark gaps return `benchmarkDataStatus = UNAVAILABLE` and warnings rather than failing the backtest.

Current fail-closed behavior exists only in narrower paths:

- If DQ filtering is enabled and Data Quality Engine throws, the run path can persist a failed run.
- Invalid registered strategies are rejected before normal simulation behavior.

Performance and batch concerns:

- `ALL` universe is capped to 50 and reports cap metadata.
- `SYMBOLS` and `INSTRUMENTS` universes are not explicitly capped by validation.
- Symbol resolution can fan out with `Promise.all`.
- `POST /backtests/run` remains synchronous from the caller perspective; no job, cursor, cancellation, or visible progress contract exists.

Recommended candidate slice:

- `CF-W1-BT-01A` - Backtesting DQ characterization tests and contract.
- Scope: characterize existing optional/fail-open behavior before changing it.
- Stop before changing defaults, adding caps, introducing jobs, changing routes, changing Prisma, or changing registered strategy semantics.

## Signal Quality Lab Findings

Current Data Quality behavior is measurement-oriented, not a default trust gate:

- `history`, `outcomes`, `dashboard`, and `summary` route data through `applyDataQualityFilters()`.
- `applyDataQualityFilters()` returns raw signals unchanged unless a DQ query filter is present.
- DQ service failures in several metrics paths are converted to empty evaluation lists with `.catch(() => [])`.
- Missing evaluations are excluded only for strict query filters such as readiness, coverage, liquidity, min readiness score, or `onlySignalReady`; `excludePoorQuality` alone does not exclude missing evaluations.

This may be intentional for research measurement, but it is not a fail-closed contract for downstream strategy, calibration, or risk workflows.

Recommended candidate slice:

- `CF-W1-SQL-01A` - Signal Quality trusted-consumer DQ semantics contract.
- Scope: decide whether Signal Quality Lab stays opt-in for dashboards/history while adding explicit trust-state warnings or strict filter requirements for downstream consumers.
- Stop before changing default filters or response shape without Product/Architect approval.

## Signal Calibration Engine Findings

Signal Calibration has stronger evidence fields, but DQ still acts as penalty/context rather than a hard gate:

- Outputs include `calibrationEvidence`, `calibrationReadiness`, `downstreamInfluence`, and `authoritativeScore`.
- Missing or insufficient Signal Quality evidence can produce `UNAVAILABLE`, `downstreamInfluence = NONE`, and `authoritativeScore = RAW_SCORE`.
- DQ lookup failures are converted to `null`.
- Missing DQ evaluation is recorded as a data gap.
- `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID` appear in DQ evidence/penalties but are not currently hard blockers inside `calibrationReadiness()`.
- With enough Signal Quality evidence, calibration may still return `downstreamInfluence = NORMAL` even when latest DQ evidence is missing or not eligible.

Recommended candidate slice:

- `CF-W1-CAL-01A` - Calibration DQ readiness gate.
- Scope: if latest DQ evaluation is missing, unavailable, not calibration-eligible, not signal-eligible, `NOT_READY`, `UNUSABLE`, or `ILLIQUID`, calibration must not have normal downstream influence.
- Expected trusted outcome: `downstreamInfluence = NONE`, `authoritativeScore = RAW_SCORE`, `calibrationApplied = false`, and a blocker/warning explaining the DQ condition.
- Stop before adding persisted fields, changing route shapes, or changing downstream consumer behavior without explicit contract approval.

## Cross-Module Risk

The common pattern across Lane 2 is that DQ evidence often exists as metadata, warnings, penalties, or optional filters. That is useful for research diagnostics, but trusted downstream behavior needs a stronger contract:

- Research/history dashboards may remain measurable with warnings.
- Trusted signal, calibration, trade-plan, alert, portfolio, or copilot consumption must fail closed or visibly degrade to untrusted/no-influence state when DQ is missing, unavailable, or blocking.
- Downstream consumers must honor readiness fields instead of sorting or acting on raw/calibrated scores alone.

## Proposed Next Work Packets

1. `CF-W1-BT-01A` - Backtesting DQ characterization only.
   - Files: backtesting strategy lab tests and module docs only.
   - No source behavior change unless a later policy approves it.

2. `CF-W1-CAL-01A` - Calibration DQ hard gate.
   - Files: signal calibration service/types/docs and focused tests only.
   - Requires policy decision if DQ missing/error should be `UNAVAILABLE` vs `LIMITED`.

3. `CF-W1-SQL-01A` - Signal Quality trusted-consumer semantics.
   - Files: Signal Quality contract/QA first.
   - Requires policy decision before changing default dashboard/history filtering.

## Decisions

No Decision Packet was opened in this audit pass.

Reason: no implementation was attempted, and the ambiguity can remain as contract/readiness preparation until Team 00 promotes a bounded item. Implementation of `CF-W1-CAL-01A` or `CF-W1-SQL-01A` may require a future decision on how to classify DQ missing/error states.

## Validation

Tests not run.

Reason: read-only audit and no Ready implementation item.

## Team 06 Recommendation

Next implementation-ready candidate should remain `CF-W1-TP-01B` after Team 00 promotion.

Next non-implementation refinement candidate should be `CF-W1-BT-01A` because it can characterize existing backtesting DQ behavior without changing strategy policy or shared contracts.

# TEAM-06 Lane 2 DQ Fail-Closed Contract Draft

Date: 2026-05-17

Owner: TEAM-06 - Strategy / Signal / Risk

Status: Draft contract. Not Ready for Implementation.

Related audit: `11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md`

## Contract Intent

Lane 2 modules may keep research and diagnostic views measurable, but any output used as trusted strategy, signal, calibration, backtest, or trade-plan evidence must not silently proceed when Data Quality is missing, unavailable, or blocking.

## Trusted-Use Rule

For trusted downstream use, the following DQ states must prevent normal influence:

- missing latest DQ evaluation;
- DQ service unavailable/error when eligibility is required;
- `signalReadinessStatus = NOT_READY`;
- `signalReadinessStatus = LIMITED` unless a later accepted policy defines limited-review-only behavior;
- `coverageStatus = UNUSABLE`;
- `liquidityStatus = ILLIQUID`;
- `eligibleForSignals = false` where output supports signal/strategy workflows;
- `eligibleForCalibration = false` where output supports calibrated scores;
- stale, unsupported, scope mismatch, provider gap, or required-use-case blocker represented in DQ evidence.

Trusted outputs must degrade to a non-authoritative state such as:

- no generated trusted signal;
- no normal calibration influence;
- raw score as authoritative instead of calibrated score;
- blocked/not-ready trade-plan readiness;
- warning-only or research-only backtest evidence.

## Module-Specific Draft Rules

### Backtesting Strategy Lab

Current behavior is not changed by this draft.

Characterization should document:

- DQ filtering is opt-in through `useDataQualityFilter`;
- missing quality currently defaults to `WARN_AND_PROCESS`;
- `ALL` universe is capped while `SYMBOLS` and `INSTRUMENTS` are not explicitly capped;
- DQ service failure with filtering enabled should persist or surface a failed run;
- price-history fetch failure remains a diagnostic gap rather than a run failure.

Any change making DQ mandatory, adding request caps, introducing jobs/batches, or changing registered strategy semantics requires a new approved contract.

### Signal Quality Lab

Current dashboard/history measurement may remain opt-in for DQ filtering until Product/Architect approve a stricter default.

Trusted-consumer contract still needs approval:

- either require strict query filters such as `onlySignalReady=true`, or
- add explicit trust-state warnings so downstream workflows cannot treat unfiltered Signal Quality results as ready evidence.

Changing default filters or response shape is not approved by this draft.

### Signal Calibration Engine

Candidate trusted rule:

If latest DQ evidence is missing, lookup fails, not calibration-eligible, not signal-eligible, `NOT_READY`, `UNUSABLE`, or `ILLIQUID`, then calibration output must:

- set `downstreamInfluence = NONE`;
- set `authoritativeScore = RAW_SCORE` when raw score exists;
- set `calibrationApplied = false`;
- include a blocker or warning naming the DQ condition;
- avoid presenting `calibratedScore` as authoritative downstream evidence.

Whether less severe DQ states should map to `UNAVAILABLE` or `LIMITED` remains a policy decision before implementation.

## Proposed Candidate Requirement IDs

- `CF-W1-BT-01A` - Backtesting DQ characterization.
- `CF-W1-CAL-01A` - Calibration DQ readiness gate.
- `CF-W1-SQL-01A` - Signal Quality trusted-consumer DQ semantics.

## Allowed Future File Families After Ready Promotion

Backtesting characterization:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

Calibration gate:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Signal Quality trusted-consumer prep:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

## Forbidden Without Separate Approval

- Prisma schema or migrations;
- backend or frontend route registry changes;
- shared backend utilities;
- shared UI;
- package manifests;
- generated/common fixtures;
- providers, live data, startup/backfill, Angel One, broker, paid/cloud, or telemetry;
- frontend UI implementation;
- changing strategy/rule/exit/invalidation semantics;
- financial-advice or target-price wording.

## Acceptance Criteria For Future Ready Slices

- Existing behavior is characterized before risky policy changes.
- Trusted-use behavior fails closed or degrades to non-authoritative output when DQ is missing or blocking.
- Research-only outputs are clearly distinguishable from trusted downstream evidence.
- No arbitrary target prices, profit targets, or buy/sell recommendation wording is introduced.
- Focused tests prove the exact DQ state transitions.
- No shared file or route/schema/package changes occur without a new accepted packet.

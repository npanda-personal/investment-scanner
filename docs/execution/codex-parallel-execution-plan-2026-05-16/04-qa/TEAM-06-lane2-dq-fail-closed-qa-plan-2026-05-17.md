# TEAM-06 Lane 2 DQ Fail-Closed QA Plan

Date: 2026-05-17

Owner: TEAM-06 - Strategy / Signal / Risk

Status: Draft QA plan. Not approved to run as implementation validation.

Related audit: `11-module-audits/TEAM-06-lane2-dq-fail-closed-audit-2026-05-17.md`

## Scope

Focused backend QA planning for future Team 06 slices covering:

- Backtesting Strategy Lab DQ characterization.
- Signal Quality Lab trusted-consumer DQ semantics.
- Signal Calibration Engine DQ readiness gate.

No live provider, broker, paid/cloud service, UI implementation, route registry, Prisma, package, or shared utility changes are in scope.

## Candidate Test Commands

Run only after a bounded Ready item is promoted and laptop-safety checks pass:

```text
cd backend
npm test -- backtesting-strategy-lab
npm test -- signal-quality-lab
npm test -- signal-calibration-engine
```

Narrower file-level commands are preferred for implementation handoffs.

## Backtesting Characterization Coverage

Future `CF-W1-BT-01A` tests should prove:

- absent `useDataQualityFilter` does not call Data Quality Engine and proceeds with resolved instruments;
- enabled DQ filtering with absent `excludeMissingQuality` sends `missingQualityBehavior = WARN_AND_PROCESS`;
- enabled DQ filtering with `excludeMissingQuality = true` sends `missingQualityBehavior = SKIP`;
- DQ service failure with filtering enabled persists or surfaces failed-run behavior;
- one instrument price-history fetch failure completes with missing/coverage diagnostics rather than failing the whole run;
- `ALL` universe cap metadata remains present;
- `SYMBOLS` and `INSTRUMENTS` cap risk is documented but not changed in characterization scope.

## Signal Quality Coverage

Future `CF-W1-SQL-01A` tests should prove whichever contract is accepted:

- no DQ query filter preserves current research/history measurement behavior, if compatibility remains approved;
- strict filters such as `onlySignalReady=true` exclude missing or non-eligible DQ evaluations;
- DQ service failure under strict/trusted filters is either fail-closed or explicitly reported as DQ unavailable;
- `excludePoorQuality` behavior around missing evaluations is characterized before any change;
- downstream-facing summaries cannot be mistaken for trusted ready evidence when DQ was not applied.

## Signal Calibration Coverage

Future `CF-W1-CAL-01A` tests should prove:

- missing latest DQ evaluation with otherwise sufficient Signal Quality evidence does not produce normal downstream influence;
- DQ lookup rejection is surfaced as a blocker/warning and does not silently become trusted normal calibration;
- `eligibleForCalibration=false` sets no normal downstream influence;
- `eligibleForSignals=false` sets no normal downstream influence when calibration supports signal/strategy workflows;
- `NOT_READY`, `UNUSABLE`, and `ILLIQUID` DQ states block trusted calibration;
- output uses `authoritativeScore = RAW_SCORE` and `calibrationApplied = false` when raw score exists but DQ blocks calibration;
- persisted/top calibration reads do not require consumers to infer readiness from `calibratedScore` alone.

## Regression Checks

Each promoted slice should also verify:

- existing module route tests still pass if route-facing behavior is touched;
- no target-price, profit-target, buy/sell, guaranteed-return, or advice wording is introduced;
- no Prisma/schema, route registry, package manifest, generated/common fixture, shared utility, provider, startup, or UI file is touched without a separate reservation.

## Stop Conditions

Stop and return to Team 00 or Decision Inbox if implementation requires:

- deciding whether DQ missing/error maps to `UNAVAILABLE` or `LIMITED`;
- changing default Signal Quality dashboard/history filtering;
- changing API response shape consumed by frontend or other teams;
- adding request caps or async job/batch behavior to backtesting;
- editing shared files, route registries, Prisma/schema, packages, generated fixtures, or frontend UI.

## Evidence Standard

Future QA evidence must record:

- exact test command;
- focused files changed;
- DQ state fixtures used;
- expected readiness/downstream-influence status;
- skipped checks with reason;
- remaining risk and next owner.

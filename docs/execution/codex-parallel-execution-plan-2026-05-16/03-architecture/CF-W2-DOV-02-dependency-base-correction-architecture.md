# CF-W2-DOV-02 Dependency-Base Correction Architecture

Date: 2026-05-26

Owner: Team 03 - Architecture Factory

Mode: docs-only architecture and integration recommendation. No application source, tests, merge resolutions, routes, schema, generated files, packages, providers, startup/backfill files, or shared UI were modified.

## Recommendation

`WAIT FOR INTEGRATION SEQUENCING`

This is routine architecture/integration work, not a Product Owner consent blocker.

Team 00 should not open `CF-W2-DOV-02` from either accepted feature branch directly.

The safest path is a dedicated Team 00 release-integration branch that treats accepted `CF-W2-CAL-02A` behavior as the semantic baseline for Signal Calibration, then replays only the accepted `CF-W2-DOV-01` dashboard commit on top of that base.

## Why Direct Stacking Is Not The Safe Default

## Verified accepted dependency commits

- `a371e2f feat: add daily overview dashboard`
- `1be7d1a feat: add calibration evidence basis`

Neither is an ancestor of the other. Their common merge base is:

- `4519b14a1c10d93380cc39dbf89e70b46dc4ca25`

## Critical branch-history finding

The accepted `a371e2f` commit itself is narrowly scoped to Daily Overview files:

- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/**`
- `frontend/tests/ui/daily-overview-dashboard.spec.ts`

But the branch history between the merge base and `a371e2f` is not isolated. It also contains unrelated and cross-lane commits, including:

- `a566799 fix: harden signal calibration table`
- pipeline and market-data commits
- today-review and smart-money changes
- multiple execution-doc churn commits

That mixed history is why a tree-level merge against `1be7d1a` reports Signal Calibration conflicts even though the accepted DOV-01 commit does not itself edit those files.

Conclusion:

- stacking full `codex/team08-ux-research/CF-W2-DOV-01` onto CAL-02A would pull unrelated lane-2 and pipeline history into the DOV-02 dependency base;
- stacking full `codex/team06-strategy-signal/CF-W2-CAL-02A` onto DOV-01 would still force semantic reconciliation inside Signal Calibration against that mixed branch history;
- neither direct branch stack is the lowest-risk base for a bounded DOV-02 child.

## Required Integration Strategy

Team 00 should create a release-integration branch/worktree for dependency correction.

Recommended branch:

- `codex/team00-integration/CF-W2-DOV-02-dependency-base`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team00-CF-W2-DOV-02-dependency-base`

Recommended sequencing inside that integration branch:

1. Start from the Team 00 integration checkpoint that will host accepted downstream work.
2. Integrate accepted `1be7d1a` first and treat its Signal Calibration semantics as authoritative.
3. Replay only accepted `a371e2f` onto that branch.
4. Do not merge the full DOV-01 branch history as the dependency base for DOV-02 unless Team 00 separately chooses to absorb the unrelated calibration and pipeline commits through a dedicated release review.

This is still `wait for integration sequencing`, not `routine integration base`, because the safe base is a controlled release-integration branch rather than either accepted feature branch as-is.

## Signal Calibration Files Requiring Manual Semantic Review

If Team 00 performs any branch merge that carries the DOV-01 branch history rather than replaying only `a371e2f`, these files require explicit semantic review before DOV-02 can be promoted:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`
- `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`
- `frontend/src/features/signal-calibration-engine/types.ts`
- `frontend/tests/ui/signal-calibration-engine.spec.ts`

These are the files where the DOV-01 branch history and accepted CAL-02A both changed Signal Calibration behavior or its proof surface.

## Required CAL-02A Semantic Baseline Checks

The integration resolver must preserve accepted `CF-W2-CAL-02A` behavior exactly in substance, even if adjacent hardening changes are kept.

### 1. Backend contract and scope truth

In `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts` and `signal-calibration-engine.service.ts`, preserve:

- additive `CalibrationEvidenceBasisStatus`
- additive `calibrationEvidence.evidenceBasis`
- additive `pageSummary` on `/signals/calibration/top`
- additive scoped `CalibrationPageSummary`
- `signalQualityGeneratedAt`, `latestMeasurablePriceDate`, `nextEvaluableDate`, and `reasonSummary`
- compare/top alignment on the same visible scope basis for `region`, `assetType`, and `horizon`

Do not allow the integration result to:

- remove `pageSummary`
- collapse evidence-through timing back into row `generatedAt`
- reintroduce hidden compare-only `sector` or `country` scope widening
- infer page-level truth from the first row

### 2. Fail-closed evidence semantics

In `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`, preserve:

- `MEASURED`
- `HORIZON_LIMITED`
- `MISSING_SIGNAL_QUALITY_EVIDENCE`

and preserve the accepted fail-closed behavior:

- missing Signal Quality evidence yields unavailable page truth;
- horizon-limited evidence yields `nextEvaluableDate` when maturity is pending;
- `runEvidenceFromSummary(...)` does not short-circuit to the first row's evidence object.

### 3. Frontend hook behavior

In `frontend/src/features/signal-calibration-engine/hooks/useSignalCalibrationEngine.ts`, preserve:

- removal of `fetchCalibrationHealth` from page-summary truth
- fail-closed `pageSummary` fallback when scoped `/top` fails
- no health-based page-summary fallback

DOV-branch hardening changes such as default sorting or filter reset are acceptable only if they remain additive and do not undo the accepted CAL-02A page-summary behavior.

### 4. Frontend page-summary rendering

In `frontend/src/features/signal-calibration-engine/components/SignalCalibrationEnginePage.tsx`, preserve:

- summary cards sourced from `data.pageSummary`
- evidence-basis rendering
- evidence-through date display
- next-evaluable-date display when maturity is pending
- alerts sourced from page-summary warnings/blockers rather than first visible row proxies

Do not allow integration to revert page summary back to:

- `health.calibratedSignals`
- first warning row
- first blocker row
- first row readiness or influence

### 5. Tests that must still prove CAL-02A truth

In the backend and UI Signal Calibration tests, the post-integration result must still prove:

- measured evidence basis
- horizon-limited evidence basis
- missing Signal Quality evidence basis
- compare/top shared scope query shape
- fail-closed page-summary behavior
- frontend no-health-fallback behavior

If export, auth, table-sorting, or other DOV-branch hardening assertions are retained, they are additive only. They must not replace the accepted CAL-02A assertions.

## Promotion Gates Before DOV-02 Can Move Forward

Team 00 should require all of the following before promoting `CF-W2-DOV-02`:

1. Dependency ancestry or replay proof:
   - accepted CAL-02A behavior is present on the chosen integration HEAD;
   - accepted DOV-01 dashboard files are present on the chosen integration HEAD;
   - Team 00 records whether DOV-01 was replayed as `a371e2f` only or merged through a broader release sequence.

2. Signal Calibration semantic review completed against the eight files listed above.

3. CAL-02A focused validation still passes on the chosen integration branch:
   - `cd backend`
   - `npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`
   - `npm.cmd run build`
   - `cd frontend`
   - `npm.cmd run build`
   - `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1`

4. DOV-01 presence check completed:
   - `frontend/src/features/daily-overview-dashboard/**` exists
   - `frontend/tests/ui/daily-overview-dashboard.spec.ts` exists
   - DOV-02 still does not need `frontend/src/app/HomePage.tsx`

5. DOV-02 dependency truth check completed:
   - calibration scoped `pageSummary` exists on the chosen base
   - evidence-basis fields needed by DOV-02 are present
   - DOV-02 can remain inside the previously reserved frontend-only writer set

Only after those gates pass should Team 00 reopen DOV-02 implementation promotion.

## Team 00 Stop Conditions

Team 00 should stop and keep DOV-02 unpromoted if any of the following becomes true during dependency-base correction:

- the chosen integration path requires semantic rollback of accepted CAL-02A behavior;
- Signal Calibration `pageSummary` or `evidenceBasis` truth cannot be preserved unchanged in substance;
- integration requires route registry changes;
- integration requires schema, migrations, generated files, or package changes;
- integration requires shared UI, shared hooks, provider/live, startup, backfill, scheduler, or worker changes;
- replaying only `a371e2f` is not feasible and Team 00 cannot isolate the unrelated DOV-01 branch history for separate release review;
- DOV-02 would need to reopen `frontend/src/app/HomePage.tsx` or broaden beyond the DOV-02 bounded writer set.

## Consent Classification

This is not a true consent blocker.

Why:

- no new Product Owner product-direction decision is required;
- no schema, route, or paid/locality constraint change is being requested;
- the blocker is sequencing and branch-integration hygiene.

The consent threshold changes only if Team 00 discovers that preserving accepted CAL-02A behavior requires one of the forbidden higher-risk scopes above.

## Final Architecture Verdict

- Recommendation: `wait for integration sequencing`
- Classification: routine integration/architecture issue, not consent blocker
- Safest base: Team 00 release-integration branch with CAL-02A semantic baseline and replay of accepted DOV-01 commit only
- DOV-02 promotion status: keep blocked until the integration branch satisfies the validation gates above

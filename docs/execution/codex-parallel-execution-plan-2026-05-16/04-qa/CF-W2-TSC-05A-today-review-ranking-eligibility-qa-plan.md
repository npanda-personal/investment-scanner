# CF-W2-TSC-05A Today Review Ranking Eligibility QA Plan

Date: 2026-05-25
Owner: Team 04 - QA Factory
Status: ACCEPTED FOR PLANNING

## Work Item

- Child requirement: `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`
- Parent requirement: `CF-W2-TSC-05 - Today Review no-target ranking and eligibility reframe`
- Required base: accepted `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`
- Accepted base branch/commit: `codex/team07-portfolio-alerts/CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` at `68f0a19`

## Planning Verdict

ACCEPT the Team 03 packet as plannable on the accepted Team 07 base.

Reason:

- the accepted `TSC-04A` branch/worktree now exists and is auditable;
- the child remains bounded to Today Review-owned service/types/doc/spec files;
- the contract draws a clear semantic line between allowed rule-backed invalidation/risk context and disallowed target/reward, reward/risk, paper-readiness, and geometry-first trusted promotion inputs;
- the accepted `68f0a19` base still contains the semantic leakage points that QA must verify are removed in the next stacked child.

This is planning only. No application source verification was executed in this pass.

## Active Authority And Inputs Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-05-today-review-no-target-ranking-eligibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-TSC-05-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- accepted Team 07 worktree `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-04A` at `68f0a19`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts` on current main and accepted `68f0a19` base
- `backend/src/modules/today-trade-review/today-trade-review.md` on accepted `68f0a19` base
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts` on current main and accepted `68f0a19` base
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx` on accepted `68f0a19` base
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx` on accepted `68f0a19` base
- `frontend/tests/ui/today-trade-review.spec.ts` on current main and accepted `68f0a19` base

## QA Scope

This QA plan applies only after Team 00 routes `CF-W2-TSC-05A` onto a Team 07 implementation branch/worktree that is a descendant of `68f0a19`.

### In scope

- Today Review service-side candidate ranking, state, promotion, and explainability assertions
- Today Review list-page UI smoke
- Today Review candidate-detail UI smoke
- no-target/no-R:R/no-paper-readiness trusted-ranking assertions on touched Today Review surfaces
- preservation checks for documented invalidation/risk blockers, DQ readiness, active signal health, supporting evidence, and missing-evidence honesty
- changed-file guardrails for the reserved Today Review file set only

### Out of scope

- upstream `trade-plan-risk-engine`, `strategy-decision-engine`, `signal-generation-engine`, `data-quality-engine`, `signal-calibration-engine`, or `backtesting-strategy-lab` source behavior
- route changes
- shared UI or shared backend utility changes
- schema, migration, generated-file, or package changes
- Pipeline Ops controls or manual refresh controls
- broad Trade Plan or Strategy Decision semantic rewrites

## Architecture Preconditions For QA

QA execution may start only if the implementation handoff confirms all of the following:

1. the implementation branch/worktree is stacked on accepted base `68f0a19`
2. `git merge-base --is-ancestor 68f0a19 HEAD` passes in the Team 07 implementation worktree
3. changes stay inside the reserved Today Review file set from the Team 03 contract
4. no route/schema/shared/package/generated-file edits were introduced
5. no upstream module edits were introduced
6. UI smoke is run against the stacked Team 07 worktree server, not a pre-existing or stale `http://127.0.0.1:5173`

If any precondition fails, QA should reject the handoff back to Team 00 before test execution.

## Current Audit Anchors On The Accepted `68f0a19` Base

The accepted `TSC-04A` base cleaned wording, but it still exposes the semantic ranking and eligibility dependence that `TSC-05A` must remove:

- service logic still checks `tradePlan.rewardRiskRatio < 1.2` for Lite candidate state and score
- Lite candidate compatibility generation still synthesizes `target`, `target2`, `rewardRiskRatio`, and `paperReadinessStatus`
- service logic still reads `paperReadinessStatus` and `planStatus` into Today Review state and reason mapping
- ranking components still include `tradePlan`
- service and tests still surface `TRADE_PLAN_PROOF_CHAIN` as a trusted explainability category
- UI spec fixtures still carry compatibility fields such as `target`, `rewardRiskRatio`, and `paperReadinessStatus`

Those findings confirm both the need for the child and the exact QA regression surface.

## Acceptance Coverage

### 1. Backend focused tests

Run focused backend tests whenever the implementation touches:

- `today-trade-review.service.ts`
- `today-trade-review.types.ts`
- `today-trade-review.service.test.ts`

Required semantic scenarios:

1. strong strategy/rule evidence with acceptable DQ and no hard blocker remains eligible even if compatibility-only target or reward/risk fields are missing, null, weak, or below prior thresholds
2. Lite candidates no longer become `WATCH_ONLY`, `BLOCKED`, or lower-ranked because of:
   - synthetic `2R/3R` target math
   - `rewardRiskRatio`
   - target quality/method
   - paper-readiness status derived only from target-shaped compatibility semantics
3. strategy candidates no longer become `WATCH_ONLY` or lower-ranked merely because public Trade Plan payloads report target-shaped compatibility states such as `paperReadinessStatus = WATCH_ONLY`
4. documented invalidation/risk blockers still force the expected blocked behavior when they are rule-backed and evidence-backed
5. DQ absence or DQ hard failure still maps to `INSUFFICIENT_DATA` or equivalent documented non-promotion behavior
6. active signal health, supporting trust evidence, and missing-evidence honesty remain present in candidate DTOs and explainability
7. ranking breakdowns and promotion reasons stop using trade-plan-first trusted framing
8. compatibility-only fields may remain readable, but assertions must prove they do not change:
   - candidate state
   - candidate score
   - candidate rank
   - promotion reason text

Suggested assertion shape:

- use paired fixtures where only compatibility-only target/R:R/paper-readiness fields differ
- assert that paired candidates keep the same trusted state/rank unless a documented non-target blocker differs
- assert hard blockers only on explicit invalidation/risk evidence, not on target-shaped fields
- assert explainability labels and reason summaries avoid trade-plan-first trusted explanations

### 2. Frontend/UI smoke

Run focused Today Review Playwright smoke against the stacked Team 07 implementation worktree only.

Required list-page checks:

- Today Review still loads on the existing route and grouped sections still render
- candidate rank/order/state on touched mocked scenarios no longer change when only target/R:R/paper-readiness compatibility fields vary
- list rows do not present target/reward, reward/risk, paper-readiness, or trade-plan geometry as trusted promotion basis
- rule-backed invalidation/risk blockers still appear when present
- DQ readiness, active signal health, supporting evidence, and missing-evidence honesty remain visible
- compact status remains read-only only
- no page-local manual rerun, bulk refresh, or Pipeline Ops control appears

Required candidate-detail checks:

- detail page no longer frames target/reward or reward/risk as trusted review evidence
- invalidation and risk context remain visible when documented
- strategy/rule/version provenance remains visible
- supporting evidence remains visible without trade-plan-first trusted framing
- missing evidence is stated explicitly when source-proven evidence is absent
- no direct buy/sell/advice-like language appears

### 3. Phrase scan expectations

Run a user-facing string scan on the reserved Today Review files after implementation.

Hard-fail phrases on touched user-facing/service-label/spec-string surfaces:

- `R:R`
- `reward/risk`
- `target / reward`
- `target/reward`
- `modeled reward`
- `paper review`
- `paper-readiness`
- `trade-plan geometry`
- `Trade-plan proof-chain`
- `ready for paper review`
- `trusted because of trade plan`
- `buy now`
- `sell now`
- `must buy`
- `must sell`
- `financial advice`

Manual-review expectations for compatibility-only raw keys:

- raw payload keys such as `target`, `rewardRiskRatio`, or `paperReadinessStatus` may remain only if they are compatibility-only
- if those keys still exist in fixtures or DTOs, QA must verify they are not used as trusted rank/state/promotion inputs and are not rendered as trusted evidence text
- do not fail on unrelated fields such as `targetTradingDate`

### 4. Positive preservation assertions

Assert presence of approved or approved-equivalent research-support wording where the underlying evidence exists:

- `Trusted Signal Candidate` or approved-equivalent candidate-safe label
- `entry trigger`
- `trigger price`
- `reason summary`
- strategy/rule/version provenance
- rule-backed invalidation or risk wording
- active signal health
- supporting evidence
- `missing evidence` or `evidence unavailable` only when that absence is true

### 5. Guardrails / non-regression checks

QA must reject the slice if any of the following drift appears:

- edits outside the reserved Today Review file set
- repository/controller/router/validation/index edits
- frontend `api/**`, `hooks/**`, or `routes.tsx` edits for Today Review
- backend or frontend route-registry edits
- shared UI or shared backend utility edits
- schema, migration, generated-file, or package changes
- upstream Trade Plan, Strategy Decision, Signal Generation, Data Quality, Calibration, or Backtesting source/test edits
- local Pipeline Ops controls added to Today Review
- truthful implementation requires upstream semantic separation that the reserved Today Review files cannot provide

## Execution Steps After Implementation

1. Confirm the Team 07 implementation worktree path recorded by Team 00.
2. Confirm `git merge-base --is-ancestor 68f0a19 HEAD` passes there.
3. Confirm changed files stay inside the reserved Today Review file set.
4. Read the implementation diff and note any remaining compatibility-only trade-plan fields.
5. Run focused backend tests and backend build in the stacked worktree.
6. Run frontend build in the stacked worktree.
7. Start a dedicated frontend server from the stacked worktree on a non-stale QA port.
8. Run focused Today Review Playwright smoke with `PLAYWRIGHT_BASE_URL` pointed at that dedicated port.
9. Run the focused phrase scan and manually inspect any remaining compatibility-only raw keys.
10. Record pass/fail evidence in a separate QA verification artifact.

## Focused Commands For Team 00 / Implementer

Use the actual Team 00-recorded stacked Team 07 worktree path for `CF-W2-TSC-05A`. Do not run these from the root `dev` workspace.

Preflight and base verification:

```powershell
$team07Worktree = 'C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A'
git -C $team07Worktree rev-parse --abbrev-ref HEAD
git -C $team07Worktree merge-base --is-ancestor 68f0a19 HEAD
Get-Counter '\Memory\% Committed Bytes In Use'
```

Focused backend validation:

```powershell
Set-Location "$team07Worktree\backend"
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

Focused frontend build:

```powershell
Set-Location "$team07Worktree\frontend"
npm.cmd run build
```

Recommended dedicated frontend server for UI smoke:

```powershell
Set-Location "$team07Worktree\frontend"
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4173'
npm.cmd run dev -- --host 127.0.0.1 --port 4173
```

Focused UI smoke against the stacked worktree server:

```powershell
Set-Location "$team07Worktree\frontend"
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:4173'
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Phrase scan on reserved Today Review surfaces:

```powershell
Set-Location $team07Worktree
rg -n "\"(R:R|reward/risk|target / reward|target/reward|modeled reward|paper review|paper-readiness|trade-plan geometry|Trade-plan proof-chain|ready for paper review|buy now|sell now|must buy|must sell|financial advice)\"" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

Compatibility-only raw-key review:

```powershell
Set-Location $team07Worktree
rg -n "rewardRiskRatio|paperReadinessStatus|paperReadinessReasons|target:|target2|TRADE_PLAN_PROOF_CHAIN|tradePlan:" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## QA Stop Conditions

Return the packet to Team 00 / Team 03 without QA signoff if implementation requires or introduces:

- upstream `trade-plan-risk-engine` edits
- upstream `strategy-decision-engine` edits
- upstream `signal-generation-engine`, `data-quality-engine`, `signal-calibration-engine`, or `backtesting-strategy-lab` edits
- repository/controller/router/validation/index edits
- route or route-registry edits
- shared UI/shared utility edits
- Prisma/schema/migration/generated-file changes
- package changes
- inability to preserve documented invalidation/risk blockers without also reusing target-shaped paper-readiness semantics
- inability to prove UI smoke against the correct stacked Team 07 worktree server

## Risks And Notes

- The accepted `68f0a19` base still contains reward/risk and paper-readiness semantic leakage in service logic, tests, and fixtures, so QA must verify semantics and not stop at copy checks.
- `frontend/playwright.config.ts` defaults to `http://127.0.0.1:5173`; QA should override `PLAYWRIGHT_BASE_URL` to a dedicated Team 07 worktree server to avoid false passes against a stale local frontend.
- Compatibility-only trade-plan payload fields may remain in DTOs or fixtures; QA must distinguish raw compatibility data from trusted ranking/state behavior.

## Planned QA Result Type

Expected post-implementation outcome:

- PASS only if target/reward, reward/risk, paper-readiness, and trade-plan-geometry semantics stop affecting Today Review trusted rank/state/promotion while documented invalidation/risk blockers, DQ readiness, signal health, supporting evidence, and missing-evidence honesty remain intact.
- FAIL if any touched trusted surface or service-path still uses target-shaped compatibility semantics as trusted evidence, or if the slice widens beyond the reserved Today Review file set.

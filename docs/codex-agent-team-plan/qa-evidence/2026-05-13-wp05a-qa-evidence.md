# QA Evidence - WP-2026-05-13-05A - 2026-05-13

## Decision

SIGN OFF `WP-2026-05-13-05A - Trade Plan Proof Chain Source Funnel`.

## Verification Scope

- Verified the developer handoff against WP-2026-05-13-05A, Brief 5 architecture contract, and Brief 5 QA plan.
- Write scope respected: QA edited only this evidence file.
- Source/test inspection stayed inside Trade Plan Risk Engine files and assigned UI/test surfaces, plus read-only checks for schema/route registry diffs.
- Dirty worktree noted with unrelated active edits in Research Hub, Signal Calibration, docs, and other packet files. QA did not revert or modify source/test work.

## Implementation Evidence

- `paperReadinessProofChain` is additive and derived at response time, not persisted.
- Backend adds proof-chain output to batch generation, funnel diagnostics, latest detail, and list rows.
- Proof-chain stages include `DATA_QUALITY`, `STRATEGY_DECISION`, `STRATEGY_PROOF`, `BACKTEST_EVIDENCE`, `RISK_GEOMETRY`, `SCOPE`, and `PAPER_READINESS`.
- Proof-chain fields include scope, generated count, paper-ready count, stage status, affected count, hard-blocker count, top blockers, prioritized blockers, source module, next action label, and target route.
- Hard blockers remain authoritative through canonical readiness/geometry repair. Blocked plans clear positive `paperReadinessReasons`; UI only renders positive reasons when status is `READY_FOR_PAPER_REVIEW` and no active blockers exist.
- Dashboard and detail UI render proof-chain stage status and prioritized next actions.
- No diffs were present in `backend/prisma/schema.prisma`, `backend/src/api/routes.ts`, `frontend/src/app/routes.tsx`, or `frontend/src/app/NavigationLayout.tsx`.

## Commands Run By QA

Memory gate:

- Initial `Get-CimInstance Win32_OperatingSystem` was denied by Windows permissions.
- Alternate memory check via `Microsoft.VisualBasic.Devices.ComputerInfo`:
  - Before focused backend validation: `85.95%` used.
  - Before frontend build: `85.06%` used.
  - Before UI smoke: `89.3%` used.
  - Result: below the 95% stop gate; process-heavy validation was allowed.

Backend:

- `backend`: `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand`
  - Result: passed, 2 suites / 37 tests.
- `backend`: `npm.cmd run build`
  - First attempt timed out at the 120s command limit.
  - Rerun with longer timeout passed.

Frontend:

- `frontend`: `npm.cmd run build`
  - Result: passed.
  - Existing Vite large chunk warning remains.
- `frontend`: `npm.cmd run test:ui -- trade-plan-risk-engine.spec.ts --workers=1`
  - First attempt failed before test execution with `EPERM: operation not permitted, unlink '...\frontend\test-results\.last-run.json'`.
  - Rerun with approved escalation for Playwright test artifact metadata passed, 5 tests.

Live/local API:

- Existing server on port 3000 appeared stale and returned Trade Plan funnel readiness counts without `paperReadinessProofChain`.
- QA started the freshly built backend on port 3003 and ran authenticated read-only GET checks with `codex.test@example.com`.
- No provider-heavy, mutating generation, backtest, repair, or batch action was run for QA.

## Live API Evidence

Authenticated `GET /api/v1/trade-plans/funnel?region=IN&assetType=STOCK` on fresh backend port 3003:

- Generated plans: `22`
- Ready for paper review: `0`
- Blocked: `12`
- Watch-only: `10`
- Insufficient data: `0`
- Proof-chain generated count: `22`
- Proof-chain paper-ready count: `0`
- Prioritized blockers:
  - `DATA_QUALITY_BLOCKED=2` from Data Quality Engine -> `/data-quality`
  - `STRATEGY_DECISION_BLOCKED=2` from Strategy Decision Engine -> `/strategy-decisions`
  - `WEAK_OR_UNPROVEN_STRATEGY=22` from Strategy Framework -> `/strategy-framework`
  - `PLAN_STATUS_NOT_VALID=12` from Trade Plan Risk Engine -> `/trade-plans`
  - `RISK_GRADE_HIGH=13` from Trade Plan Risk Engine -> `/trade-plans`
- Stage statuses:
  - `DATA_QUALITY: BLOCKED`, affected `2`, hard `2`
  - `STRATEGY_DECISION: BLOCKED`, affected `2`, hard `2`
  - `STRATEGY_PROOF: UNPROVEN`, affected `22`, hard `0`
  - `BACKTEST_EVIDENCE: PASS`, affected `0`, hard `0`
  - `RISK_GEOMETRY: BLOCKED`, affected `13`, hard `36`
  - `SCOPE: PASS`, affected `0`, hard `0`
  - `PAPER_READINESS: BLOCKED`, affected `22`, hard `0`

Authenticated `GET /api/v1/trade-plans/candidates?region=IN&assetType=STOCK&paperReadyOnly=true&limit=5`:

- Total: `0`
- Returned rows: `0`

Authenticated blocked detail sample via list plus latest detail for `LT.NS`:

- List sample status: `BLOCKED`
- Paper readiness reasons: empty
- Paper readiness blockers include plan status blocked, high risk grade, active blockers, and unproven strategy rating.
- Detail proof chain: generated `1`, paper-ready `0`
- Detail stages include `STRATEGY_PROOF: UNPROVEN`, `RISK_GEOMETRY: BLOCKED`, and `PAPER_READINESS: BLOCKED`.

## Acceptance Checks

PASS: proof chain prevents paper-ready optimism when blockers exist.

- Current local data has `0` paper-ready plans in funnel proof-chain and persisted `paperReadyOnly=true` filtering.
- Blocked detail sample has no positive readiness reasons beside active blockers.
- Hard blocker counts and affected counts are visible in the proof-chain stages.

PASS: blocker counts and target routes are visible.

- Funnel proof chain exposes prioritized blockers with counts, source modules, and target routes for Data Quality, Strategy Decision, Strategy Framework, and Trade Plan remediation paths.

PASS: batch generation remains scoped and bounded.

- Source inspection and UI smoke confirm batch generation sends scoped bounded requests.
- QA did not need to run a mutating batch generation action for signoff.

PASS: no schema or route registry change.

- No assigned verification diff found in Prisma schema, backend route registry, frontend app routes, or navigation layout.

## Skipped Checks

- Full backend and full frontend test suites were not run. Reason: WP-05A verification is scoped, other workers have active unrelated edits, and focused checks cover the changed Trade Plan behavior.
- Today Review live consumption was not verified. Reason: WP-05A explicitly forbids Today Review edits and defers Today Review consumption to a later integration packet after WP-01 clears gates.
- No broad batch generation, provider sync, market-data repair, or backtest generation was run. Reason: QA focus was proof-chain read surfaces and current local no-paper-ready evidence; mutating/provider-heavy actions were not required.

## Blockers

None.

## Final Handoff

SIGN OFF.

- Trade Plan proof-chain surfaces are additive and non-persisted.
- Current local API proves `paperReady=0`, blocker counts, hard-blocker stage status, source modules, and target routes.
- Blocked plans remain blocked across funnel, list filter, and detail sample, with positive readiness reasons suppressed.
- Backend tests, backend build, frontend build, focused UI smoke, and authenticated live API checks passed.
- No commit or push was performed.

# TEAM-06 Current Assignment

Date: 2026-05-18

Team: TEAM-06 - Strategy / Signal / Risk

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-06-strategy-signal-risk.md`

## Assignment

Pull `CF-W1-SQLAB-01` for bounded backend-only implementation.

State: Ready for Implementation after Team 00 promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace and accepted implementation branches are parked in separate worktrees. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SQLAB-01`
- Base: current local `dev` after the Team 00 Ready-promotion docs update.

Record the branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-06-outbox.md`.

## Work Item

`CF-W1-SQLAB-01` - Signal Quality Lab outcome-confidence and readiness labeling.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-SQLAB-01-signal-quality-outcome-confidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- Work packet: `08-work-packets/CF-W1-SQLAB-01-work-packet.md`
- QA plan: `04-qa/CF-W1-SQLAB-01-qa-plan.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

Optional only if endpoint-level additive response assertions are added:

- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan source/tests
- backend and frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Do not run providers, startup/backfill flows, live provider calls, Prisma migrations, package installs, broad services, or UI smoke tests for this slice.

## Implementation Requirements

- Add additive outcome-confidence metadata equivalent to `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, and `UNTRUSTED`.
- Use stable reason codes equivalent to:
  - `TRUSTED_READY_EVIDENCE`
  - `LIMITED_PARTIAL_SELECTED_HORIZON`
  - `DIAGNOSTIC_DQ_OPTIONAL_OR_MISSING`
  - `UNTRUSTED_NO_SELECTED_HORIZON_EVIDENCE`
  - `UNTRUSTED_DQ_LOOKUP_FAILED`
- Derive states from existing selected-horizon evidence and Data Quality evaluation presence/blockers.
- Consume only existing Data Quality Engine public evaluation outputs already used by the module.
- Preserve existing `evidenceUsability`, `evaluationDiagnostics`, grouped metric statuses, `recommendedAction`, warnings, and response field compatibility.
- Do not make DQ required by default or change existing query/filter behavior.
- Do not duplicate DQ scoring logic.
- Keep wording research-support oriented; do not introduce advice, target-price, guarantee, trade-instruction, broker, or automation wording.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
npm.cmd run build
```

If route-level additive assertions are added:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

If any focused command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- Prisma/schema changes
- route, controller, router, validation, repository, or query-contract changes
- Data Quality Engine source/export changes
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan source/test changes
- shared DTO/helper files or shared frontend components
- package, generated-file, provider, startup/backfill, live-provider, paid/cloud, telemetry, or broker scope
- frontend/UI work
- changing default DQ filtering behavior instead of adding additive confidence metadata
- editing a file outside the allowed list

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md` with:

- exact branch/worktree used
- starting commit
- exact files changed
- exact files inspected
- behavior changed
- tests run and results
- tests skipped and reasons
- forbidden files confirmed untouched
- assumptions, risks, blockers
- next gate: Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, or Team 00 blocker routing

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Rework `CF-W1-SMI-01` after Team 10 `REJECT`.

This assignment supersedes older Team 06 tails above. Work only in the dedicated Smart Money worktree. You are not alone in the codebase; do not revert or overwrite edits made by Team 04 or Team 10 evidence writers.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SMI-01`

## Blocking Finding To Fix

Team 10 found that `smart-money-intelligence.service.ts` maps only `ownershipDataStatus === 'MISSING'` to `PARTIAL_OWNERSHIP_GAP`; `PARTIAL` and `ERROR` ownership statuses currently map to `COMPLETE`. That can allow `evidenceStatus = USABLE` for degraded ownership evidence, which violates the `CF-W1-SMI-01` trust contract.

## Allowed Files

You may edit only:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- generated files
- backend or frontend route registries
- Smart Money controller/router/repository/module/index/validation/provider files
- downstream module source
- frontend source or UI tests
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or credentials
- Team 04 or Team 10 review evidence files except by referencing them in your handoff

## Required Fix

- Treat ownership trust as `COMPLETE` only when `ownershipDataStatus === 'COMPLETE'`.
- Treat `MISSING`, `PARTIAL`, and `ERROR` as degraded ownership evidence.
- Ensure persisted/current rows with degraded ownership remain `LIMITED`, not `USABLE`.
- Add focused tests for persisted/current `PARTIAL` and `ERROR` ownership statuses.
- Preserve existing ordering, distribution, current evidence fields, and research-support wording.

## Focused Validation

Run after rework:

```powershell
cd backend
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Before build/test work, check memory/resource safety if practical.

## Stop Conditions

Stop and return to Team 00 if the fix requires:

- any forbidden file;
- schema/generated/route/shared changes;
- provider/live-data or durable storage implementation;
- frontend or downstream consumer adoption;
- paid/cloud, telemetry, broker, or credential scope.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md` and `18-integration-queue/CF-W1-SMI-01-developer-handoff.md` with:

- exact rework summary;
- changed files;
- tests run and results;
- forbidden files confirmed untouched;
- residual risks;
- next gate: Team 04 QA rerun.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-SMI-01` - Smart Money evidence freshness and partial-trust framing.

This assignment supersedes older Team 06 tails for the next spawned implementation agent. Do not touch unrelated Strategy / Signal / Risk modules. You are not alone in the codebase; do not revert edits made by others and stay within the reserved writer set.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SMI-01`

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SMI-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SMI-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SMI-01-qa-plan.md`
- Ready promotion: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/team-00-CF-W1-SMI-01-ready-promotion.md`

## Allowed Files

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`

## Forbidden Files / Scope

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.controller.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.router.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.validation.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.module.ts`
- `backend/src/modules/smart-money-intelligence/index.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- Market Data source, Data Quality source, Historical Context source, Market Context source, Signal Calibration/Generation source, Research Hub source
- shared backend utilities, shared DTOs, shared frontend components
- frontend source or tests
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or automation flows

## Required Behavior

- Add additive Smart Money evidence metadata to stock/list summary payloads without removing or renaming existing fields.
- Distinguish persisted daily snapshot evidence (`PERSISTED_SNAPSHOT`) from on-demand derived detail fallback (`ON_DEMAND_DERIVED`).
- Expose requested range, data-through/snapshot framing, stale/missing evidence, insufficient-history fallback, and ownership-placeholder partial trust.
- Keep persisted-only read paths downstream-safe and do not trigger auto-generation.
- Preserve ranking/order, scoring behavior, routes, query params, current response shapes, and research-support wording.

## Focused Validation

Run in the worktree backend:

```powershell
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Check memory/resource safety before heavy commands if practical.

## Stop Conditions

Stop and return to Team 00 if implementation requires any forbidden file, schema/generated/route/shared change, Market Data or DQE source change, durable readiness storage, frontend trust surfacing, provider/live-data, startup/backfill, package work, paid/cloud, broker, telemetry, or advice-like/target-like wording.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Perform bounded `CF-W1-TP-02` rework after Team 10 review `REJECT`.

This is a rework pass in the existing Team 06 Trade Plan worktree. Do not start a new branch. Do not commit.

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-02`
- Branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Base reference: accepted `CF-W1-TP-01B` commit `8ff22fd`

## Blocking Finding To Fix

Team 10 rejected because `exitConditions[]` and `invalidationConditions[]` are built before persistence, but the real returned DTO loses them after `repository.upsert()`.

Fix this without touching the repository file if possible. The approved path is service-side DTO preservation after persistence, similar to how `persistWithReadiness()` already preserves readiness fields from the pre-persist result.

## Allowed Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts` only if type adjustment is strictly needed
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts` only if validation follow-up is strictly needed
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- Today Review, Strategy Decision, backtesting, frontend Trade Plan, shared backend utilities, shared UI, package manifests
- provider/live-data, startup/backfill, paid/cloud, broker integration, or telemetry scope

## Required Rework

- Preserve `exitConditions[]` and `invalidationConditions[]` on the actual DTO returned from `generate()` after `repository.upsert()`.
- Keep legacy `target` and `invalidationRules` compatibility behavior unchanged.
- Preserve accepted `TP-01B` DQ hard-block behavior.
- Add or adjust focused service tests so at least one test fails if repository `upsert()` returns a legacy-shaped DTO without the new arrays.
- Do not mask a repository/schema need by claiming durable persistence of the arrays. This slice only needs returned DTO semantics to survive the existing persistence boundary without repository/schema widening.

## Validation

Run from the worktree backend after rework:

```powershell
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
npm.cmd run build
```

## Expected Output

Update the developer handoff and Team 06 outbox with:

- exact files changed
- how the Team 10 rejection was fixed
- tests/build run and results
- forbidden files confirmed untouched
- residual risks
- whether ready for Team 04 QA rerun

---

# Parallel Dispatcher Assignment

Date: 2026-05-18

## Assignment

Implement `CF-W1-SMI-01` in a separate Team 06 worktree while `CF-W1-TP-02` rework continues.

This is safe to parallelize because `CF-W1-SMI-01` reserves only `smart-money-intelligence` files, while `CF-W1-TP-02` reserves only `trade-plan-risk-engine` files.

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SMI-01`
- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`

## Source Input

- Ready promotion: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/team-00-CF-W1-SMI-01-ready-promotion.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SMI-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SMI-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SMI-01-qa-plan.md`

## Allowed Files

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.controller.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.router.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.validation.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.provider.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.module.ts`
- `backend/src/modules/smart-money-intelligence/index.ts`
- routes, Prisma, generated files, shared backend utilities, shared UI, frontend source/tests, package manifests
- `market-data-foundation` source, `data-quality-engine` source, downstream consumer source
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry

## Required Validation

```powershell
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Do not commit. Report ready for Team 04 QA Verification when complete.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-TP-02` - bounded Trade Plan exit and invalidation semantics.

This latest override supersedes older Team 06 assignment tails above. Do not implement in shared `dev`.

## Branch / Worktree

- Base branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- Base commit: `8ff22fd`
- Branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-02`

`CF-W1-TP-01B` is accepted branch-locally but not yet an ancestor of `dev`; preserve its DQ hard-block behavior.

## Evidence To Use

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-plan.md`
- Ready promotion: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/team-00-CF-W1-TP-02-ready-promotion.md`

## Allowed Files

You may edit only:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-developer-handoff.md`

## Forbidden Files

Do not edit:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- Today Review backend/frontend files
- frontend Trade Plan files
- Strategy Decision or backtesting source/tests
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

- Preserve accepted `CF-W1-TP-01B` DQ hard-block behavior.
- Add additive `exitConditions` and `invalidationConditions`.
- Keep legacy `target` and `invalidationRules` as compatibility output only.
- Do not treat target-shaped fields as trusted readiness proof.
- Reject non-finite `targetRewardRisk` and values outside `0.5` to `5.0` inclusive.
- Use modeled exit/invalidation language, not target-price advice.
- Preserve existing routes and avoid repository/schema/frontend migration.

## Focused Validation

Run in the Team 06 worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-02\backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires repository, Prisma/schema, route, frontend, Today Review, Strategy Decision, backtesting, shared utility/UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md` and `18-integration-queue/CF-W1-TP-02-developer-handoff.md` with exact files changed, behavior changed, tests run/results, skipped checks, forbidden files confirmed untouched, assumptions, risks, blockers, and next gate: Team 04 QA.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Rework `CF-W1-CAL-01` after Team 04 QA REJECT.

Do not broaden scope. Fix only the QA finding that context-gap cases can still return `TRUSTED` instead of the required `LIMITED` readiness. Add focused regression coverage for `context-gap -> LIMITED`.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## QA Reject Evidence

- QA evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-verification.md`
- QA outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Allowed Files

You may edit only:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`

## Required Fix

- Sufficient-sample, non-blocking-DQ calibration evidence with missing regime / sector leadership / smart-money context must return `LIMITED`, not `TRUSTED`.
- Keep fail-closed hard blockers unchanged: `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`.
- Preserve existing score math and current response fields.
- Do not invent external data, durable evidence, new providers, route contracts, shared utilities, frontend behavior, schema changes, generated files, or package changes.

## Focused Validation

Run after rework:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01\backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

Before build, check memory/resource safety if practical.

## Expected Outbox

Update the Team 06 outbox and developer handoff with:

- exact fix applied;
- regression test added for `context-gap -> LIMITED`;
- commands run/results;
- forbidden files confirmed untouched;
- next gate: Team 04 QA rerun.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-SIG-TRIGGER-02A` - bounded Signal Generation trigger-audit surfacing and provenance labeling.

This final override supersedes older Team 06 assignment tails above. Do not implement the full durable `CF-W1-SIG-TRIGGER-02` parent. Stay inside the backend-only first child.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SIG-TRIGGER-02A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-TRIGGER-02A`

## Evidence To Use

- Requirement: `10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- Architecture review: `03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- Work packet: `08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- QA plan: `04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`
- Prior accepted trigger projection: `09-summaries/CF-W1-SIG-TRIGGER-01-po-acceptance-packet.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SIG-TRIGGER-02A-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- generated files
- backend/frontend route registries
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/ai-investment-copilot/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/**`
- shared backend utilities
- shared frontend components
- package manifests
- providers, live-data, startup/backfill, paid/cloud, broker, or telemetry paths

## Implementation Requirements

- Surface persisted `SignalResult.createdAt` and `SignalResult.updatedAt` in additive trigger audit metadata for current rows.
- Surface additive generation-run status/timing evidence only when `generationRunId` resolves to a run row.
- Label `trigger_timestamp` semantics as source-price-date, source-data-date, or unavailable.
- Label transient `strategyMatches[]` provenance as compatibility-only; do not upgrade it into durable trigger provenance.
- Keep `trigger_price`, rule ids, timeframe, and unproven lifecycle state unavailable unless module-owned evidence proves the optional `detected` mapping.
- Preserve legacy incomplete handling, incomplete reasons, and strict DQ trusted read/run/latest behavior.
- Do not create durable rule provenance, rule-defined trigger price, new trigger tables, shared contracts, routes, frontend adoption, or downstream consumer changes.

## Focused Validation

Run after implementation:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SIG-TRIGGER-02A\backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

Before build, check memory/resource safety if practical.

## Stop Conditions

Stop and return to Team 00 if implementation requires any forbidden file, schema/generated/route/shared/package/frontend/provider/startup/live change, downstream consumer adoption, durable rule provenance, rule-defined trigger price, or broader lifecycle ownership.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md` and `18-integration-queue/CF-W1-SIG-TRIGGER-02A-developer-handoff.md` with exact files changed, behavior changed, tests run/results, skipped checks and reasons, forbidden files confirmed untouched, assumptions, risks, blockers, and next gate: Team 04 QA.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Perform bounded QA-rejection rework for `CF-W1-BT-02` in the existing Team 06 worktree.

This latest override supersedes older implementation-only tails above. Team 04 reran executable QA after dependency junctions were created, so this is no longer a toolchain-only blocker. Do not widen scope. Do not commit.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`

## QA Findings To Fix

Use Team 04 evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`

Fix only:

1. Backend trusted-review fixture expected `TRUSTED_REVIEW`, but current derivation returns `DIAGNOSTIC_ONLY` because `LOW_TRADE_SAMPLE` is added before trusted/partial evaluation.
2. Frontend legacy-invalid saved-run scenario does not render `Review Disposition` evidence for the mocked `WITHHELD` review fields.

## Allowed Files

You may edit only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

## Forbidden Files

Do not edit Prisma schema or migrations, generated files, backtesting repository/controller/router/validation/module/index files, backend or frontend route registries, `backend/src/modules/strategy-framework/**`, `backend/src/modules/trade-plan-risk-engine/**`, frontend backtesting API/hooks/routes, shared backend utilities, shared frontend components, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical docs.

## Required Validation

Run in the Team 06 worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

Run because frontend files are in scope:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

If Playwright hits sandbox process restrictions, record the exact blocker and command. Do not edit package manifests.

## Next Gate

Return the revised developer handoff to Team 00. Team 00 will route Team 04 QA rerun, then Team 10 review, Team 03 Architect Signoff, delegated PO acceptance, and scoped local commit if accepted.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Perform bounded rework for `CF-W1-BT-02` after Team 04 QA rejection.

This is a routine QA rejection inside the existing Team 06 reservation. Do not widen scope. Do not edit forbidden files. Do not commit.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`

Dependency junctions already exist:

- `backend\node_modules` -> main repo backend `node_modules`
- `frontend\node_modules` -> main repo frontend `node_modules`

## QA Findings To Fix

Team 04 QA evidence:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`

Findings:

1. Backend focused test fails on trusted-review coverage. The `trusted` fixture expects `TRUSTED_REVIEW`, but current derivation returns `DIAGNOSTIC_ONLY` because `LOW_TRADE_SAMPLE` is added before trusted/partial evaluation.
2. Frontend UI smoke fails in the legacy-invalid saved-run scenario because `Review Disposition` is not visible, despite mocked `WITHHELD` review fields.

## Allowed Files

You may edit only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- generated files
- backtesting repository/controller/router/validation/module/index
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- frontend backtesting API/hooks/routes
- shared backend utilities or shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical docs

## Required Validation

Run:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

Run because frontend files are in scope:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

If Playwright hits sandbox process restrictions, record the blocker and command; do not edit package manifests.

## Expected Output

Update:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

Return changed files, tests run, scope confirmation, remaining risks, and whether Team 04 QA rerun can proceed.
---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Bounded rework for `CF-W1-SQLAB-01` after Team 10 review rejection.

Team 10 rejected the first implementation because hard Data Quality blockers are counted but then collapse into `LIMITED` outcome confidence. Team 00 resolves the routine policy clarification under delegated authority: hard DQ blockers must map to `UNTRUSTED` with an explicit hard-blocker reason, not `LIMITED` or `DIAGNOSTIC`.

## Source Handoff

- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SQLAB-01`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-developer-handoff.md`
- QA verification: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-qa-verification.md`
- Team 10 rejection: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-team10-review-release.md`

## Allowed Rework Files

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-developer-handoff.md`

## Required Rework

- Map hard DQ blockers such as `NOT_READY`, `UNUSABLE`, and `ILLIQUID` evidence to `UNTRUSTED`.
- Add or use an explicit reason code for hard DQ blockers.
- Add focused service-test coverage proving hard blockers do not return `LIMITED`.
- Preserve the existing `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, no-selected-horizon, and DQ-lookup-failure tests.
- Preserve default DQ filter/query behavior and additive response compatibility.

## Forbidden Scope

- Prisma schema or migrations
- `signal-quality-lab` repository, controller, router, or validation source
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, Trade Plan source/tests
- backend/frontend route registries
- shared backend utilities, shared DTOs, shared UI
- package manifests, generated files, frontend source/tests
- providers, startup/backfill, live-provider, paid/cloud, broker, telemetry, or automation flows

## Focused Commands

Run in the Team 06 worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SQLAB-01\backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
npm.cmd run build
```

## Next Gate

After rework, return to Team 04 QA rerun, then Team 10 re-review.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-CAL-01` in a dedicated Team 06 worktree after Team 00 Ready promotion.

This latest override supersedes older Team 06 assignment tails above. `CF-W1-BT-02` remains in Team 04 QA rerun in its own worktree. Do not edit that worktree or reuse its files.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## Work Item

`CF-W1-CAL-01` - Signal Calibration readiness trust-state and DQ hard-block framing.

## Evidence To Use

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`
- Ready queue handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Optional only if endpoint-level additive payload assertions are needed:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`

## Forbidden Files

Do not edit:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/historical-context-snapshots/**`
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

## Implementation Requirements

- Add additive calibration trust-state metadata inside existing `calibrationReadiness`.
- Represent trusted, limited, diagnostic-only, unavailable-no-evidence, and unavailable-blocking-DQ states.
- Fail closed for `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`.
- Keep missing-DQ and blocking-DQ reasons distinct and explicit.
- Preserve existing score math, current readiness/evidence fields, route behavior, response compatibility, and research-support language.
- Do not change Signal Quality Lab, Data Quality Engine, Historical Context, route contracts, schema, frontend, shared files, packages, or generated files.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

If route-level payload assertions are added:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 if implementation requires any forbidden file, DQE/HCTX/SQLAB source changes, schema/generated/route/shared/package/frontend/provider/startup/live-provider scope, score-math rewrites, or vague missing-DQ/blocking-DQ messaging that does not preserve the QA-plan distinctions.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md` and `18-integration-queue/CF-W1-CAL-01-developer-handoff.md` with branch/worktree, starting commit, files changed/inspected, behavior changed, tests run, skipped checks, scope confirmation, risks, blockers, and whether Team 04 QA can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-STRAT-02A` in a dedicated Team 06 worktree after Team 00 Ready promotion.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-STRAT-02A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-STRAT-02A`

## Allowed Files

- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-STRAT-02A-developer-handoff.md`

## Forbidden Files

- Prisma schema or migrations
- generated files
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- Strategy Framework evaluator or repository tests
- Data Quality Engine source or exports
- frontend API, route files, route registries
- shared backend utilities, shared UI, package manifests
- provider/startup, live-provider, paid/cloud, broker, telemetry, or market-data ownership changes

## Required Behavior

- Add additive source-declared `ruleRevision` metadata to registered strategy rule declarations.
- Add additive declarative DQ gate policy metadata to strategy definitions.
- Add additive trust/versioning fields to list/detail/proof payloads and Strategy Framework UI.
- Keep trust/versioning metadata separate from existing `StrategyProofStatus`.
- Preserve evaluator math, proof grading, standalone backtest action rules, routes, query params, and API paths.
- Do not present source-declared revisions as durable persisted history.

## Focused Validation

```powershell
cd backend
npm.cmd test -- strategy-framework.service.test.ts --runInBand
npm.cmd run build
```

If frontend files are changed:

```powershell
cd frontend
npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1
npm.cmd run build
```

## Next Gate

Return developer handoff to Team 00 for Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, and scoped local commit.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Implement `CF-W1-BT-02` in a dedicated Team 06 worktree after Team 00 Ready promotion.

This is the current Team 06 assignment. It supersedes older SQLAB/STRAT tails above.

You are not alone in the codebase. Do not revert or overwrite edits made by others. Do not implement in the shared `dev` worktree.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`

## Work Item

`CF-W1-BT-02` - Backtesting canonical review disposition and saved-list/detail reason-summary normalization.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Architecture review: `03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `08-work-packets/CF-W1-BT-02-work-packet.md`
- QA plan: `04-qa/CF-W1-BT-02-qa-plan.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Allowed reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- generated files
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical docs

## Implementation Requirements

- Add additive run-level review-disposition fields equivalent to:
  - `TRUSTED_REVIEW`
  - `PARTIAL_REVIEW`
  - `DIAGNOSTIC_ONLY`
  - `LEGACY_REPAIRED`
  - `WITHHELD`
- Add one concise reason summary and a specific reason list derived from current module evidence.
- Derive review disposition only from existing availability, calculation-audit, coverage, benchmark, exit-diagnostic, and trade-count evidence.
- Ensure saved-run list and selected-run detail show the same disposition label and reason summary for the same run.
- Preserve existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence.
- Preserve registered and custom-run execution behavior, routes, query params, and current payload fields.
- Keep research-support language and avoid direct advice, target-price, guarantee, broker, or automation wording.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

If frontend files are changed:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

Before builds or UI smoke, check memory/resource safety if practical.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- any forbidden file;
- schema/generated/route/shared changes;
- `strategy-framework` or `trade-plan-risk-engine` source edits;
- frontend API/hook/route changes;
- simulation math, benchmark math, route-contract, shared UI, or cross-module source changes;
- trade-level structured rule-ID expansion;
- provider/startup/live-provider/paid/cloud/telemetry/broker scope.

## Expected Outbox

Update `17-team-outboxes/TEAM-06-outbox.md` with:

- exact branch/worktree used
- starting commit
- exact files changed
- exact files inspected
- behavior changed
- tests run and results
- tests skipped and reasons
- forbidden files confirmed untouched
- assumptions, risks, blockers
- next gate: Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, or Team 00 blocker routing

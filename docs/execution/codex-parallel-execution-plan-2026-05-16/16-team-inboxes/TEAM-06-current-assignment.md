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

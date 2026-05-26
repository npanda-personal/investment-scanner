# TEAM-04 - CF-W1-UX-01B QA Plan Outbox

Date: 2026-05-26

Owner: Team 04 - QA Factory

## Assignment

Prepare a docs-only QA plan for `CF-W1-UX-01B - Stock Research Workbench Trust Evidence Contract`, using root `AGENTS.md` as authoritative and keeping work inside the active execution folder only.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-UX-01B-qa-plan-outbox.md`

No application code, tests, route registries, Prisma/schema/migrations, package manifests, generated files, shared UI, shared contexts, or historical docs were changed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-UX-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-UX-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-UX-01B-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-upstream-dependency.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-shared-file.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/blocked-by-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-UX-05-product-language-status-qa-plan.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui`

## QA Plan Result

`QA-PLAN READY`

Recorded QA coverage includes:

- verified scope match
- unverified scope
- unsupported scope
- scope mismatch
- evidence timestamp available and unavailable states
- visible blocker and limitation reasons
- widget limited state
- widget blocked suppression
- no unsupported asset fakery
- research-support language guard

## Architecture Reservation Verdict

The Team 03 allowed file set is acceptable for QA.

Why:

- it is module-local to Stock Research Workbench
- it does not require the active SPL shared route/nav reservation
- backend route/service/validation test files already exist for focused coverage
- the only missing planned QA artifact is `frontend/tests/ui/stock-research-workbench.spec.ts`, which must be added during implementation or explicitly blocked

## Required Commands Later

```powershell
cd backend
npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

```powershell
rg -n -i "buy|sell|target|price target|profit target|reward/risk|risk:reward|R:R|safe to trade|trusted signal|eligible strategy|guaranteed|financial advice|latest trusted data date" backend/src/modules/stock-research-workbench backend/tests/modules/stock-research-workbench frontend/src/features/stock-research-workbench frontend/tests/ui/stock-research-workbench.spec.ts
```

## Rejection Criteria

Reject the future implementation handoff if:

- the change set widens beyond the Team 03 reservation set
- any shared file, route/nav file, MarketScopeContext file, Signal/Strategy feature file, or SPL-reserved file is touched
- unsupported scope is silently treated as supported
- scope mismatch is hidden as generic not-found despite known unscoped instrument existence
- timestamp basis is fabricated or mixed-source max timestamp lacks a limitation reason
- blocker or limitation reasons are not visible
- `LIMITED` renders without nearby page-owned reason
- `BLOCKED` still renders the widget
- widget status widens beyond `LIMITED` or `BLOCKED`
- the Workbench UI changes but `frontend/tests/ui/stock-research-workbench.spec.ts` is still absent without explicit blocker documentation
- advice-like, target-like, reward/risk, or guarantee wording appears

## Team 00 Recommendation

Team 00 may promote `CF-W1-UX-01B` after recording exact reservations unchanged from Team 03 and keeping the packet out of active SPL route/nav files.

Promotion-time notes Team 00 should record:

- implementation remains inside the documented Workbench file set only
- all shared/high-risk files remain forbidden
- `frontend/tests/ui/stock-research-workbench.spec.ts` is required in the implementation handoff unless an explicit UI-test blocker is recorded

## Tests Run

- none

## Tests Skipped

- backend focused Workbench tests
- backend build
- frontend build
- focused Workbench Playwright smoke
- language-guard scan

## Skipped-Test Reason

Docs-only QA planning task with no implementation handoff and explicit instruction not to run release-gate verification.

## Blockers

No QA-planning blocker remains.

Executable QA remains blocked until Team 00 promotes the item and receives an implementation handoff.

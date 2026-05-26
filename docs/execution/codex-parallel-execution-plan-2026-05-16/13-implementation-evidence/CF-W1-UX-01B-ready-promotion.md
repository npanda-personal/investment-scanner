# CF-W1-UX-01B Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

Status: `Ready for Implementation`

## Work Item

`CF-W1-UX-01B` - Stock Research Workbench trust evidence contract.

Purpose: add page-owned Workbench trust evidence that truthfully shows requested scope, verification state, blocker/limitation reasons, latest page-owned evidence timestamp/basis, and downstream widget limitation/blocking without widening into shared UI, route/navigation, Market Data, DQ, Signal, or Strategy source changes.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract-requirement.md`
- Architecture review: `03-architecture/CF-W1-UX-01B-architecture-review.md`
- Contract: `06-contracts/CF-W1-UX-01B-stock-research-workbench-trust-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-UX-01B-work-packet.md`
- QA plan: `04-qa/CF-W1-UX-01B-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-CF-W1-UX-01B-architecture-outbox.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-CF-W1-UX-01B-qa-plan-outbox.md`
- Open decisions: 2, affecting only `CF-W1-MD-02B` and `CF-W1-DQ-02-RS1`; neither blocks this Workbench slice.

## Branch / Worktree

- Branch: `codex/team08-ux-research/CF-W1-UX-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-UX-01B`
- Required base: stack from accepted Workbench trust-framing branch `codex/team08-ux-research/CF-W1-UX-01A` at `246d5a3 feat: add workbench trust framing`, then merge current `dev` before implementation starts.

## Allowed Implementation Files

- `backend/src/modules/stock-research-workbench/stock-research-workbench.controller.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.service.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.types.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.validation.ts`
- `backend/src/modules/stock-research-workbench/stock-research-workbench.md`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.service.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.validation.test.ts`
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`
- `frontend/src/features/stock-research-workbench/types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-UX-01B-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-UX-01B-developer-handoff.md`

## Forbidden Scope

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `frontend/src/features/signal-generation-engine/**`
- `frontend/src/features/strategy-decision-engine/**`
- `frontend/src/shared/**`
- Prisma schema, migrations, generated files, package manifests, lockfiles, provider/live, startup/backfill, scheduler, worker, queue, paid/cloud, broker, or telemetry files.

## Required Behavior

- Add an additive page-owned `trust_evidence` contract without removing or renaming existing Workbench response fields.
- Send and reflect requested `region` and `assetType` from the Workbench client.
- Expose scope verification as explicit statuses such as `VERIFIED_MATCH`, `UNVERIFIED`, `MISMATCH`, or `UNSUPPORTED`.
- Show latest page-owned evidence timestamp only when there is a truthful basis.
- Use `UNKNOWN` / unavailable evidence when the current source cannot prove a timestamp.
- Surface blocker and limitation reasons locally on the Workbench page.
- Keep downstream Signal and Strategy widgets only `LIMITED` or `BLOCKED`; do not emit or render `ALLOWED`.
- Suppress blocked widgets and show page-owned blocked reasons.
- Keep research-support wording and avoid advice, target, reward/risk, guarantee, and action-authorizing language.

## Required Validation

```powershell
cd backend
npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand
npm.cmd run build
cd frontend
npm.cmd run build
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Required language guard:

```powershell
rg -n -i "buy|sell|target|price target|profit target|reward/risk|risk:reward|R:R|safe to trade|trusted signal|eligible strategy|guaranteed|financial advice|latest trusted data date" backend/src/modules/stock-research-workbench backend/tests/modules/stock-research-workbench frontend/src/features/stock-research-workbench frontend/tests/ui/stock-research-workbench.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires route/navigation edits, shared UI, shared context, upstream module source/test changes, schema/migration/generated/package scope, provider/live/startup/backfill/scheduler changes, unsupported-scope fakery, downstream widget internals, or user-facing language drift.

## Ready Decision

Team 00 promotes `CF-W1-UX-01B` because all routine gates pass:

- requirement exists;
- acceptance criteria exist;
- architecture review, contract, and work packet exist;
- QA plan exists and is `QA-PLAN READY`;
- exact file reservations exist;
- open Product Owner decisions do not affect this workstream;
- active SPL-02 route/navigation reservation does not overlap this file set;
- no shared-file conflict exists if Team 08 stays inside the reserved Workbench files.

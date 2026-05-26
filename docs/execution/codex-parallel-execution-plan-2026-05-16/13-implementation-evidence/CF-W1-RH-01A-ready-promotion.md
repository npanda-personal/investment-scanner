# CF-W1-RH-01A Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W1-RH-01A` - Research Hub actionability evidence-date wiring.

## Gate Verdict

Ready for bounded implementation as one Research Hub-owned backend + feature-local frontend child.

This promotion does not authorize route changes, DTO/type expansion, upstream module edits, shared UI, shared utilities, package changes, Prisma/schema/generated files, provider/live calls, calibration evidence-through semantics, or any advice/target/R:R wording.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- Architecture review: `03-architecture/CF-W1-RH-01A-architecture-review.md`
- Contract: `06-contracts/CF-W1-RH-01A-research-hub-evidence-date-contract.md`
- Work packet: `08-work-packets/CF-W1-RH-01A-work-packet.md`
- QA plan: `04-qa/CF-W1-RH-01A-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-CF-W1-RH-01A-architecture-outbox.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-CF-W1-RH-01A-qa-plan-outbox.md`
- Open decisions: one unrelated DQ-RS1 decision only; it does not block this workstream.

## Branch / Worktree

- Branch: `codex/team08-research/CF-W1-RH-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01A`
- Required base: latest `dev` after Team 00 docs checkpoint containing this Ready promotion.

## Allowed Implementation Files

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-01A-implementation-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-01A-developer-handoff.md`

## Required Behavior

- Keep `/api/v1/research/overview` route and public shape unchanged.
- Populate only truthful actionability dimension `evidenceDate` values:
  - `marketEnvironment`: market gate `updatedAt`
  - `signalEvidence`: Signal Quality summary `generatedAt` only when that read succeeds
  - `todayReviewReadiness`: latest run `finishedAt`, falling back to `sourceSnapshot.generatedAt` only when a run exists
  - `tradePlanReadiness`: Trade Plan funnel diagnostics `generatedAt`
- Keep `dataReadiness`, `strategyProof`, and `calibrationReadiness` evidence dates `null` on the current base.
- Render evidence date on Research Hub actionability tiles only when present.
- Suppress the date line when `evidenceDate` is `null`.
- Date presence must not upgrade a conservative status to `READY`.
- Preserve region/assetType scoped request behavior and research-support language.

## Forbidden Scope

- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `backend/src/modules/research-hub/index.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- backend or frontend route registries
- shared UI/components
- shared backend utilities
- upstream module source/tests
- Prisma schema/migrations/generated files
- package manifests
- provider/live-data, telemetry, broker, paid/cloud, startup/backfill work
- `frontend/src/app/HomePage.tsx`
- `frontend/src/features/daily-overview-dashboard/**`
- `backend/src/modules/signal-position-ledger/**`

## Required Validation

```powershell
cd backend
npm.cmd run build
npm.cmd test -- research-hub --runInBand
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Language guard:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|reward/risk|risk:reward|R:R|guaranteed|broker|order|execute|automation" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation requires files outside the allowed five-file writer set, route registry edits, shared UI, type/API expansion, upstream module edits, calibration basis work, schema/generated/package/provider scope, or advice/target/R:R wording.

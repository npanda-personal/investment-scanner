# TEAM-08 Assignment - CF-W1-RH-01A

Date: 2026-05-26

Team: TEAM-08 - UX / Research / Copilot

## Assignment

Implement `CF-W1-RH-01A` as a bounded Research Hub evidence-date wiring child.

This is a separate parallel Team 08 assignment from `CF-W2-DOV-01`. Do not edit Daily Overview files in this worktree.

## Branch / Worktree

- Branch: `codex/team08-research/CF-W1-RH-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-01A`
- Required base: Team 00 docs checkpoint commit containing `13-implementation-evidence/CF-W1-RH-01A-ready-promotion.md`

## Evidence To Use

- Requirement: `10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- Architecture review: `03-architecture/CF-W1-RH-01A-architecture-review.md`
- Contract: `06-contracts/CF-W1-RH-01A-research-hub-evidence-date-contract.md`
- Work packet: `08-work-packets/CF-W1-RH-01A-work-packet.md`
- QA plan: `04-qa/CF-W1-RH-01A-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W1-RH-01A-ready-promotion.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-01A-implementation-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-01A-developer-handoff.md`

## Forbidden Files

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

## Expected Handoff

Update:

- `17-team-outboxes/TEAM-08-CF-W1-RH-01A-implementation-outbox.md`
- `18-integration-queue/CF-W1-RH-01A-developer-handoff.md`

Include branch/worktree, base commit, changed files, inspected files, behavior changed, tests run, skipped checks, forbidden files confirmed untouched, risks, blockers, and next gate: Team 04 QA Verification.

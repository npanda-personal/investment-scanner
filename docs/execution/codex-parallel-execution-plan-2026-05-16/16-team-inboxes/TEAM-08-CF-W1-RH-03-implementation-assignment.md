# TEAM-08 Assignment - CF-W1-RH-03

Date: 2026-05-20

Owner: Team 08 - UX / Research / Copilot

Assigned by: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W1-RH-03` - Research Hub explainability and trust labels.

## State

Ready for bounded implementation.

## Branch / Worktree

- Branch: `codex/team08-ux-research/CF-W1-RH-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-RH-03`
- Base commit: `f391a6d feat: fail closed research hub comparison basis`

Team 00 sequencing decision:

- `RH-03` must stack on `CF-W1-RH-02A` commit `f391a6d`.
- `f391a6d` already contains `CF-W1-RH-01` commit `fd88c62`.
- Do not implement from plain `dev` because `dev` does not contain the accepted Research Hub base commits yet.

## Required Inputs

- Requirement: `10-requirements/CF-W1-RH-03-research-hub-explainability-trust-labels-requirement.md`
- Audit: `11-module-audits/audit-research-hub-explainability-2026-05-20.md`
- Architecture review: `03-architecture/CF-W1-RH-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-RH-03-research-hub-explainability-trust-labels-contract.md`
- Work packet: `08-work-packets/CF-W1-RH-03-work-packet.md`
- QA plan: `04-qa/CF-W1-RH-03-qa-plan.md`

If these docs are not present in the branch worktree, read them from the main control workspace at:

`C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\`

## Allowed Implementation Files

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Allowed Branch-Local Evidence Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W1-RH-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-RH-03-developer-handoff.md`

## Required Behavior

- Add explicit `nextBestAction.sourceModule` ownership or equivalent source-owned metadata.
- Stop relying on route substring inference for action source ownership.
- Keep raw signal counts visible only as raw evidence; do not present count presence as trusted reliability.
- Use honest trust states such as `LIMITED`, `UNPROVEN`, `INSUFFICIENT_DATA`, `BLOCKED`, or equivalent contract-approved labels.
- Make `dataReadiness` wording distinguish local availability from trusted review readiness.
- Preserve `RH-02A` fail-closed What Changed behavior and remove stale temporal copy when no auditable comparison basis exists.
- Keep all wording research-support only.

## Forbidden Scope

- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/index.ts`
- `frontend/src/features/research-hub/hooks/**`
- all upstream module source/tests outside Research Hub
- Prisma schema or migrations
- generated files
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- durable snapshot/history storage
- provider/live-data/startup/backfill files
- paid/cloud/broker/telemetry files
- broad UX redesign
- unrelated Research Hub feature work

## Required Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- --runInBand --runTestsByPath tests/modules/research-hub/research-hub.service.test.ts
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Also run an `rg` copy scan for:

- `since the last evaluation`
- `buy`
- `sell`
- `target`
- `recommendation`
- `profit`
- `guaranteed`

## Handoff Required

Write:

- `17-team-outboxes/TEAM-08-CF-W1-RH-03-outbox.md`
- `18-integration-queue/CF-W1-RH-03-developer-handoff.md`

Include:

- exact files changed
- exact files inspected
- behavior changed
- tests run and output summary
- UI smoke result or blocker
- copy scan result
- confirmation that `RH-01` and `RH-02A` behavior remains preserved
- skipped checks and reasons
- next gate: Team 04 QA verification

## Product Owner Action

Not required.

No open Decision Inbox item blocks this bounded child.

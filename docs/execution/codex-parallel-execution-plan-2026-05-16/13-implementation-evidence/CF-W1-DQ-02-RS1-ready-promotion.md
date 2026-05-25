# CF-W1-DQ-02-RS1 Ready Promotion

Date: 2026-05-25

Owner: Team 00 - Orchestrator / Integration

## Work Item

`CF-W1-DQ-02-RS1` Data Quality Engine read-side/public-contract currentness reconstruction.

## Promotion Verdict

Promoted to Ready for Implementation and assigned to Team 05.

This promotion is valid only in the dedicated Team 05 worktree:

- Branch: `codex/team05-market-data/CF-W1-DQ-02-RS1`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-02-RS1`
- Base branch: `dev`

Do not implement this slice from the shared `dev` workspace.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- Architecture review: `03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- Contract: `06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- Work packet: `08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- QA plan: `04-qa/CF-W1-DQ-02-read-side-currentness-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 QA outbox: `17-team-outboxes/TEAM-04-CF-W1-DQ-02-read-side-currentness-qa-outbox.md`
- Open decisions: none.

## Allowed Implementation Files

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-CF-W1-DQ-02-RS1-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02-RS1-developer-handoff.md`

## Forbidden Scope

- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/market-data-foundation/**`
- Prisma schema, migrations, generated files, and durable stored currentness fields
- package manifests and lockfiles
- shared backend utilities
- provider, scheduler, worker, queue, startup, or backfill files
- all frontend source/tests and shared UI
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required Behavior

- Add one DQE-owned read-side currentness reconstruction path or equivalent shared basis.
- Apply the same reconstructed basis to `summary()`, `list()`, `diagnostics()` when a persisted row exists, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()`.
- Add explicit additive currentness semantics for:
  - `CURRENT_COMPLETED_SESSION`
  - `CURRENT_FINALIZATION_PENDING`
  - `STALE_COMPLETED_SESSION_MISSED`
  - `MISSING_LATEST_PRICE`
  - `SESSION_EVIDENCE_UNAVAILABLE`
  - `PROVIDER_GAP_BLOCKED`
  - `CONTRADICTORY_EVIDENCE`
- Derive summary currentness counts from the same per-row reconstruction basis used by row/detail/latest-helper reads.
- Preserve fail-closed eligibility behavior for missing, blocked, unavailable, stale, or contradictory evidence.
- Keep existing DQ score/status/gap/blocker/warning/use-case-tier fields backward-compatible.

## Required Validation

```powershell
cd backend
npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires Market Data source edits, DQE controller/router/route widening, Prisma/schema/migration/generated/package/shared-utility/frontend/provider/startup/backfill scope, or durable stored currentness fields.

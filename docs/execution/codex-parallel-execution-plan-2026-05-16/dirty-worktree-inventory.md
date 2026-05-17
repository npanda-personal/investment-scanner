# Dirty Worktree Inventory

Captured from `git status --short --branch` during Sprint 0 setup.

## Branch

- Current branch: `dev`
- Tracking: `origin/dev`
- Status: dirty

## Root AGENTS.md Status

- `AGENTS.md` is untracked.
- It was loaded successfully and treated as the authoritative instruction file for this Sprint 0 setup.
- Do not stage or commit it until the Product Owner explicitly approves.

## docs/AGENTS.md Status

- `docs/AGENTS.md` is tracked by git but currently deleted in the working tree.
- It was not restored.
- It was not modified.
- It is treated as legacy guidance only if restored later.

## Modified Tracked Files

- `.gitignore`
- `backend/.env.example`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.catalog-sources.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/server.ts`
- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `docs/AGENTS.md` deleted
- `docs/codex-agent-team-plan/active-work-board.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md`
- `docs/codex-agent-team-plan/blocker-register.md`
- `docs/codex-agent-team-plan/codex-agent-team.md`
- `docs/codex-agent-team-plan/github-check-in/2026-05-13-market-data-provider-metadata-parallelism-github-check-in.md`
- `docs/codex-agent-team-plan/operations/2026-05-14-md-a5-operational-drain-report.md`
- `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-full-module-po-audit.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-14-md-a5-operational-drain-qa-evidence.md`
- `docs/codex-agent-team-plan/sdlc-operating-model.md`
- `docs/codex-agent-team-plan/team-operating-model.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-top5-work-packets.md`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/DataIngestion.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/types.ts`

## Untracked Files And Folders

- `AGENTS.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-market-data-business-metadata-remediation-contract.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-p0-1c-angel-one-readonly-provider-contract.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-angel-one-readonly-provider-architect-signoff.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-market-data-diagnostics-architect-rejection.md`
- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-15-angel-one-data-sync-redesign.md`
- `logs/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/` created by approved Sprint 0

## Files That Block Implementation

- All modified `backend/src/modules/market-data-foundation/*` files.
- All modified `frontend/src/features/market-data-foundation/*` files.
- All modified Market Data backend tests.
- `backend/src/server.ts`, because scheduler/startup behavior is shared runtime behavior.
- `backend/.env.example`, because provider/env defaults affect local/free and secret safety.
- `docs/AGENTS.md` deletion and untracked root `AGENTS.md`, because instruction authority is unsettled in git.

## Files Requiring Product Owner Decision

- `AGENTS.md`: whether to stage/commit as root authority.
- `docs/AGENTS.md`: whether to keep deleted, neutralize, archive, or replace with pointer-only file.
- Angel One provider path: whether read-only broker-account market data remains allowed under local/free constraints.
- Historical plan docs: whether to archive untouched or later migrate selected evidence.

## Files Requiring Architect Decision

- Market Data provider/scheduler/service changes.
- `backend/src/server.ts` scheduler startup behavior.
- `backend/.env.example` provider flags and defaults.
- Any Prisma schema or migration impact discovered later.
- Any route registry impact discovered later.

## Prohibited Actions Not Taken

- No staging.
- No commit.
- No push.
- No revert.
- No deletion.
- No restoration.
- No application code modification.

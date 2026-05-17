# Sprint 0.5 Governance Cleanup Proposal

## Purpose

This proposal reviews the Sprint 0 artifacts for internal consistency and defines the minimum governance cleanup needed before Sprint 1 can be safely approved.

Sprint 0.5 is governance-only. It must not implement product behavior, refactor application code, change Prisma schema, modify route registries, modify shared utilities or shared UI, install packages, stage files, commit, push, delete files, restore files, or revert files unless separately approved by the Product Owner.

## Review Scope

Reviewed Sprint 0 artifacts:

- `README.md`
- `current-state-audit.md`
- `legacy-instruction-review.md`
- `existing-plan-review.md`
- `legacy-delta-review.md`
- `legacy-influence-register.md`
- `first-principles-vs-legacy-delta.md`
- `module-ownership-map.md`
- `shared-file-control.md`
- `dependency-graph.md`
- `contract-inventory.md`
- `qa-baseline-plan.md`
- `risk-register.md`
- `sprint-0-plan.md`
- `sprint-1-candidates.md`
- `active-work-board.md`
- `release-checklist.md`
- `docs-agents-neutralization-proposal.md`
- `instruction-authority-report.md`
- `dirty-worktree-inventory.md`

Additional read-only checks:

- `git status --short`
- `git ls-files AGENTS.md docs/AGENTS.md`
- `Test-Path docs/AGENTS.md`

## Internal Consistency Findings

- Sprint 0 artifacts consistently treat root `AGENTS.md` and current Product Owner direction as authoritative.
- Sprint 0 artifacts consistently treat `docs/codex-agent-team-plan/` as historical evidence only.
- Sprint 0 artifacts consistently reject the old active board as a current source of truth.
- Sprint 0 artifacts consistently make GitHub push optional and disabled by default.
- Sprint 0 artifacts consistently identify Market Data Foundation and Data Quality readiness as the first safe Sprint 1 focus after governance blockers are resolved.
- Sprint 0 artifacts consistently block implementation until requirements, contracts, QA plan, file reservations, and review gates exist.
- The largest unresolved inconsistency is source-control state: the authoritative root `AGENTS.md` is untracked while historically tracked `docs/AGENTS.md` is deleted.

## A. Root `AGENTS.md` Decision

### Recommendation

Root `AGENTS.md` should be added and tracked after Product Owner approval.

It should be committed before Sprint 1 implementation begins because it is the only authoritative AGENTS instruction file and future work depends on stable instruction authority.

### Risk If It Remains Untracked

- Future sessions may not load the authoritative instruction file from source control.
- A checkout, branch switch, worktree, or cleanup could lose the file.
- `docs/AGENTS.md` deletion would become ambiguous without a tracked replacement authority file.
- Sprint 1 agents could fall back to stale legacy guidance or incomplete prompt context.
- Release audit cannot prove the active governance source is versioned.

### Exact Files To Stage Later If Approved

For the root instruction authority decision, stage only:

- `AGENTS.md`

For a separate Sprint 0 planning evidence commit, stage only after explicit approval:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/README.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/current-state-audit.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/legacy-instruction-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/existing-plan-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/legacy-delta-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/legacy-influence-register.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/first-principles-vs-legacy-delta.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/module-ownership-map.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/dependency-graph.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/contract-inventory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/qa-baseline-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/risk-register.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/sprint-0-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/sprint-1-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/release-checklist.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/docs-agents-neutralization-proposal.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/instruction-authority-report.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/dirty-worktree-inventory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/sprint-0-5-governance-cleanup-proposal.md`

Do not stage application source files, Market Data files, old plan files, or `docs/AGENTS.md` as part of the root instruction authority decision unless the Product Owner explicitly approves that broader scope.

## B. `docs/AGENTS.md` Decision

### Current State

- `docs/AGENTS.md` is tracked by git.
- It is currently deleted in the working tree.
- It was not restored or modified during Sprint 0.
- It is not authoritative under the current Product Owner direction.

### Is The Deletion Intentional?

The deletion appears aligned with the current root-only authority direction, but it still needs an explicit Product Owner source-control decision before staging or committing.

### Should It Remain Deleted?

Preferred recommendation: keep `docs/AGENTS.md` deleted if the Product Owner wants the cleanest instruction model.

Alternative recommendation: replace it with a pointer-only neutral file if the Product Owner wants a visible marker under `docs/`.

Do not restore the old file unchanged.

### Should It Be Replaced With A Pointer-Only Neutral File?

Use a pointer-only neutral file only if discoverability is more important than removing the nested AGENTS filename entirely.

If approved later, the file should say only that:

- root `AGENTS.md` is the only authoritative AGENTS instruction file.
- `docs/AGENTS.md` is not an instruction source.
- legacy planning docs are historical evidence only.

### Should It Be Archived?

Archive only after Product Owner approval and only under a non-AGENTS filename. This prevents automatic nested-instruction loading while preserving historical content.

### Risk If It Reappears As Active Guidance

- Codex may load it as nested instruction guidance.
- Stale legacy rules could override or confuse root authority.
- Old work boards, GitHub check-in workflows, QA evidence, and PO acceptance records could be treated as current.
- Parallel teams could inherit conflicting ownership, approval, or release expectations.

## C. Dirty Worktree Decision

### Planning-Only Or Governance-Only Changes

Planning-only or governance-only files currently visible in source control state:

- `AGENTS.md` untracked
- `docs/AGENTS.md` deleted
- `docs/execution/codex-parallel-execution-plan-2026-05-16/` untracked
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
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-market-data-business-metadata-remediation-contract.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-16-p0-1c-angel-one-readonly-provider-contract.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-angel-one-readonly-provider-architect-signoff.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-16-p0-1c-market-data-diagnostics-architect-rejection.md`
- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-15-angel-one-data-sync-redesign.md`

`logs/` is untracked local evidence/runtime output and should not be staged without a separate evidence-retention decision.

`.gitignore` is not application code, but it is source-control configuration. It requires Product Owner or Orchestrator approval before staging because it can change what future agents see as untracked or ignored.

### Application Or Source Files

Application/source files currently modified or untracked:

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
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `backend/src/server.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/DataIngestion.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/types.ts`

Test source files currently modified:

- `backend/tests/modules/market-data-foundation/market-data.provider.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.scheduler.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

Configuration or module documentation files currently modified:

- `backend/.env.example`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`

### Market Data / Data Quality Related Files

Market Data / Data Quality related files include:

- all `backend/src/modules/market-data-foundation/*` modified or untracked files
- all `backend/tests/modules/market-data-foundation/*` modified files
- all `frontend/src/features/market-data-foundation/*` modified files
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/.env.example`
- `backend/src/server.ts`

### Files That Block Sprint 1

Sprint 1 is blocked by:

- untracked `AGENTS.md`
- deleted tracked `docs/AGENTS.md`
- all dirty Market Data Foundation backend files
- all dirty Market Data Foundation frontend files
- all dirty Market Data Foundation backend tests
- untracked Angel One provider file
- `backend/src/server.ts`
- `backend/.env.example`
- unresolved `.gitignore` changes
- modified historical `docs/codex-agent-team-plan/` files that could be accidentally staged or treated as active

### Files Requiring Product Owner Decision

- `AGENTS.md`: add/track/commit before Sprint 1 or not.
- `docs/AGENTS.md`: keep deleted, pointer-only neutral file, archive, or restore for review only.
- `docs/execution/codex-parallel-execution-plan-2026-05-16/`: whether to stage/commit the new active planning artifacts.
- `.gitignore`: whether source-control ignore behavior should change.
- `backend/.env.example`: whether provider flags/defaults align with local-first and zero-incremental-cost constraints.
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`: whether read-only broker-account market data is allowed within the no broker-integration/no real-money-execution boundary.
- `docs/codex-agent-team-plan/*`: whether to preserve modified historical evidence untouched or later archive/migrate selected content.

### Files Requiring Architect Decision

- all `backend/src/modules/market-data-foundation/*` source files
- `backend/src/server.ts`
- `backend/.env.example`
- `frontend/src/features/market-data-foundation/*`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- all Market Data test changes if they define or imply runtime contracts
- any future route registry, Prisma schema, market-scope, shared utility, auth, subscription, package, or generated-type impact discovered during review

### Files Requiring QA Validation

- all Market Data Foundation backend source changes
- all Market Data Foundation frontend changes
- all Market Data Foundation backend tests
- `backend/src/server.ts`
- `backend/.env.example`
- Data Quality readiness assumptions in `backend/src/modules/data-quality-engine/data-quality-engine.md`
- any future local data ingestion, repair, scheduler, provider metadata, or DQ eligibility behavior

### Files That Should Not Be Touched Yet

Do not touch these before a specific approval:

- application source files
- Market Data tests
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/`
- `logs/`
- Prisma schema and migrations
- backend or frontend route registries
- shared backend utilities
- shared frontend components
- package manifests

## D. Old Plan Decision

### `docs/codex-agent-team-plan/`

Confirmed: `docs/codex-agent-team-plan/` remains historical evidence only.

It must not be treated as the active execution plan, even where files are modified or untracked.

### Old `active-work-board.md`

Confirmed: old `docs/codex-agent-team-plan/active-work-board.md` is not active.

The new active board is:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/active-work-board.md`

The new active board is Sprint-0-only and contains no migrated active implementation items.

### Old GitHub Check-In Workflow

Confirmed: old GitHub check-in workflow is not mandatory.

The new release checklist is local-first. GitHub push remains optional and disabled by default unless explicitly approved by the Product Owner.

### Old QA / PO Evidence

Confirmed: old QA evidence, PO acceptance docs, architecture signoffs, GitHub check-ins, work packets, and developer handoffs are historical only.

They may inform future review, but they do not prove current correctness and do not authorize Sprint 1 implementation.

## E. Sprint 1 Readiness

### Is Sprint 1 Ready To Approve Now?

No.

Sprint 1 is not ready to approve until governance and dirty-worktree blockers are resolved.

### Exact Blockers Remaining

1. Root `AGENTS.md` is untracked.
2. `docs/AGENTS.md` is tracked but deleted, and the intended source-control outcome is not approved.
3. Market Data Foundation has broad dirty backend, frontend, and test changes.
4. `backend/src/server.ts` is dirty and affects shared runtime startup/scheduler behavior.
5. `backend/.env.example` is dirty and may affect provider defaults, local/free constraints, and secret safety.
6. The untracked Angel One provider needs Product Owner and Architect review against no broker integration, no real-money execution, and local/free constraints.
7. Modified historical `docs/codex-agent-team-plan/` files may be accidentally staged or misread as active if source-control scope is not controlled.
8. `.gitignore` is dirty and requires a source-control policy decision.
9. Sprint 1 still needs a Product Owner-approved requirement, architecture contract, QA plan, file reservations, and explicit stop conditions.

### Minimum Safe Next Approval Request

Request approval for Sprint 0.5 governance cleanup only, with no application implementation:

- add and track root `AGENTS.md`
- choose the `docs/AGENTS.md` outcome: keep deleted, replace with pointer-only file, or archive under a non-AGENTS filename
- optionally stage/commit the new `docs/execution/codex-parallel-execution-plan-2026-05-16/` planning artifacts as planning evidence
- keep all application source, Market Data tests, old plan docs, `.gitignore`, `.env.example`, and logs untouched unless separately approved
- keep GitHub push disabled by default

### Recommended First Sprint 1 Candidate After Blockers Clear

Recommended first Sprint 1 candidate:

- Market Data Foundation + Data Quality Engine trust revalidation.

Reason:

- downstream signals, strategy rules, backtests, trade plans, portfolio overlays, alerts, and copilot outputs depend on trustworthy OHLC, provider metadata, market scope, and data quality readiness.

Minimum Sprint 1 entry criteria for this candidate:

- root instruction authority settled in source control
- `docs/AGENTS.md` outcome settled
- dirty Market Data worktree reviewed and reserved
- Product Owner approves the requirement
- Solution Architect approves the Market Data/DQ contract
- QA approves the verification plan
- Orchestrator assigns one writer per file and blocks parallel shared-file edits

## Proposed Sprint 0.5 Decision Set

1. Track root `AGENTS.md` before Sprint 1.
2. Keep `docs/AGENTS.md` deleted unless the Product Owner prefers a pointer-only neutral file.
3. Do not restore old `docs/AGENTS.md` unchanged.
4. Keep `docs/codex-agent-team-plan/` historical only.
5. Keep old GitHub check-in workflow optional and non-mandatory.
6. Treat old QA/PO/signoff evidence as historical only.
7. Do not approve Sprint 1 until dirty Market Data and instruction-authority blockers are resolved.
8. Start Sprint 1 with Market Data Foundation + Data Quality trust revalidation once blockers clear.

## Approval Boundary

Approval of this proposal should not authorize Sprint 1 implementation.

The next approval should be for Sprint 0.5 governance cleanup only.

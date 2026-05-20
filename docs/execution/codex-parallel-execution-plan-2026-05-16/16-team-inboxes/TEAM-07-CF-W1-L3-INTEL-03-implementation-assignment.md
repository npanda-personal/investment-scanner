# TEAM-07 Assignment - CF-W1-L3-INTEL-03

Date: 2026-05-20

Owner: Team 07 - Portfolio / Watchlist / Alerts

Assigned by: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W1-L3-INTEL-03` - Portfolio Intelligence concentration review.

## State

Ready for bounded implementation.

## Branch / Worktree

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-INTEL-03`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-INTEL-03`
- Base commit: `d0305c8 feat: add portfolio intelligence review traceability`

Team 00 sequencing decision:

- `INTEL-03` must stack on accepted `CF-W1-L3-INTEL-02` commit `d0305c8`.
- `d0305c8` already contains accepted `DQ-01B` commit `56b286f` and the accepted portfolio readiness baseline.
- `INTEL-03` may run in parallel with active `TREV-02` because the file reservations are disjoint.

## Required Inputs

- Requirement: `10-requirements/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-INTEL-03-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-INTEL-03-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-INTEL-03-qa-plan.md`

If these docs are not present in the branch worktree, read them from:

`C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\`

## Allowed Implementation Files

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `frontend/src/features/portfolio-intelligence/types.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
- optional new focused UI smoke: `frontend/tests/ui/portfolio-intelligence.spec.ts`

## Allowed Branch-Local Evidence Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-INTEL-03-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-INTEL-03-developer-handoff.md`

## Required Behavior

- Add additive concentration-review fields to the existing Portfolio Intelligence response.
- Derive holding, sector, and country concentration review from existing summary/allocation inputs only.
- Rank exposures deterministically using the approved priority and tie-break rules.
- Explain why each exposure deserves review using existing allocation, review, red-flag, signal-overlay, and unrealized-loss evidence only.
- Keep user-visible changes inside the existing Portfolio Intelligence panel.
- Preserve existing routes, hooks, API calls, and current response fields.
- Avoid optimizer, rebalance, target-allocation, tax, broker, and advice language.

## Forbidden Scope

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
- all `backend/src/modules/portfolio-management/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/strategy-decision-engine/**`
- backend/frontend route registries
- `frontend/src/features/portfolio-intelligence/api/portfolioIntelligenceService.ts`
- `frontend/src/features/portfolio-intelligence/hooks/usePortfolioIntelligence.ts`
- `frontend/src/features/portfolio-intelligence/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- Prisma schema or migrations
- optimizer, rebalance, tax, broker, provider/startup, paid/cloud, telemetry, or live-flow work

## Required Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

If the optional UI smoke is added or already exists:

```powershell
cd frontend
npm.cmd run test:ui -- portfolio-intelligence.spec.ts --workers=1
```

Also run a copy scan for changed concentration-review wording to reject optimizer, rebalance, target-allocation, target-price, broker, execution, guaranteed-outcome, or direct-advice language.

## Handoff Required

Write:

- `17-team-outboxes/TEAM-07-CF-W1-L3-INTEL-03-outbox.md`
- `18-integration-queue/CF-W1-L3-INTEL-03-developer-handoff.md`

Include:

- exact files changed
- exact files inspected
- behavior changed
- tests run and output summary
- UI smoke result or blocker
- copy scan result
- confirmation that `INTEL-02` reliability/traceability behavior remains preserved
- skipped checks and reasons
- next gate: Team 04 QA verification

## Product Owner Action

Not required.

No open Decision Inbox item blocks this bounded child.

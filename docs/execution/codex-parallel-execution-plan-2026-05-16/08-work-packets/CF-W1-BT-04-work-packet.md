# CF-W1-BT-04 Work Packet

Date: 2026-05-20

## Work Item

Backtesting saved-run freshness and current-proof labels.

## State

Architecture-ready candidate. Not Ready for Implementation until Team 04 QA planning exists and Team 00 confirms stacked sequencing.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Backend module: `backtesting-strategy-lab`
- Frontend feature: `backtesting-strategy-lab`

## Smallest Honest First Child

Add one explicit current-proof projection that tells the user whether a saved run is:

- the latest comparable proof,
- older stale proof,
- repaired historical proof, or
- limited historical proof

and render that label consistently in the saved-run list and selected-run result panel.

## Allowed Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Branch / Worktree Requirement

Worktree required: yes.

Recommended future isolation after Team 00 promotion:

- Branch: `codex/team06-strategy-signal/CF-W1-BT-04`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-BT-04`
- Base: accepted `CF-W1-BT-03` commit `8f984b1`

Reason:

- current `dev` does not contain the accepted parked backtesting trust writer set
- the reserved files overlap the accepted `BT-03` packet exactly
- one writer only is required across the full module-local packet

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- upstream module source/tests outside Backtesting
- shared backend utilities
- shared frontend components
- package manifests
- generated files

## Required Behavior

Future implementation must:

- add an additive current-proof object or equivalent stable fields
- derive the label from current module evidence only
- compare runs against the latest comparable saved run without widening into repository redesign
- render the same status and summary in the saved-run list and selected-run panel
- preserve current benchmark, coverage, audit, exit-diagnostic, and proof-basis behavior
- preserve research-support language

## Explicitly Deferred

- walk-forward, holdout, or optimizer engines
- repository redesign
- route or controller work
- shared UI changes
- Trade Plan or Strategy Framework source changes
- Prisma/schema or generated-file work

## One-Writer Constraint

- Reserve the full backtesting backend/frontend writer set to one writer.
- Do not run `CF-W1-BT-04` in parallel with any other `backtesting-strategy-lab` source packet.

## QA Handoff Needed

Team 04 should prepare QA for:

- `CURRENT_PROOF`
- `STALE_PROOF`
- `REPAIRED_HISTORICAL`
- `LIMITED_HISTORICAL_PROOF`
- list/detail consistency for the same run
- preserved benchmark, warning, and audit surfaces
- absence of fabricated forward-validation claims

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits
- route or controller changes
- shared UI changes
- new validation engines
- Prisma/schema or migration changes
- generated-file changes
- branching from plain `dev` instead of the accepted backtesting stack

## Next Gate

Route `CF-W1-BT-04` to Team 04 QA planning next.

After Team 04 QA planning exists, Team 00 can evaluate it for Ready promotion on the stacked backtesting base.

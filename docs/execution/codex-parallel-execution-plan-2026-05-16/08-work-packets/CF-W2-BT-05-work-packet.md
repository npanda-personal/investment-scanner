# CF-W2-BT-05 Work Packet

Date: 2026-05-24

## Work Item

Backtesting documented-rule exit / invalidation supporting evidence, separated from optional take-profit simulation assumptions.

## State

Architecture-ready candidate. Not Ready for Implementation until Team 04 QA planning exists and Team 00 confirms stacked sequencing.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Backend module: `backtesting-strategy-lab`

## Smallest Honest First Child

Add one backend-only evidence projection that tells downstream consumers:

- whether the run is a documented registered-strategy run or an unsupported custom-rule run,
- whether the run is the latest comparable registered run,
- which exit counts are documented rule exits,
- which exit counts are operational risk/forced exits,
- which exit counts are optional simulation assumptions,
- and which invalidation facts are missing rather than inferred.

## Allowed Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`

## Branch / Worktree Requirement

Worktree required: yes.

Recommended future isolation after Team 00 promotion:

- Branch: `codex/team06-strategy-signal/CF-W2-BT-05`
- Worktree: `../investment-scanner-worktrees/team06-CF-W2-BT-05`
- Base: accepted `CF-W1-BT-04` commit `2bd794f`

Reason:

- current `dev` does not contain the accepted backtesting trust stack
- the reserved writer set overlaps the parked accepted backtesting branch
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
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/features/backtesting-strategy-lab/**`
- `frontend/src/features/today-review/**`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `frontend/tests/ui/today-review*.spec.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files

## Required Behavior

Future implementation must:

- add an additive rule-evidence object or equivalent stable fields
- use existing run timestamps for freshness
- keep documented exit rule evidence separate from simulation assumptions
- keep invalidation evidence explicitly missing when the module does not model it
- keep custom-rule runs out of trusted supporting-evidence status
- preserve existing run DTO compatibility
- preserve research-support language
- avoid target-price, profit-target, or R:R semantics

## Explicitly Deferred

- frontend rendering
- Today Review adoption
- signal-quality or strategy-decision consumers
- repository redesign
- route or controller work
- shared UI changes
- shared utility changes
- Strategy Framework source changes
- Prisma/schema or generated-file work
- provider/live-data changes
- startup/backfill work

## One-Writer Constraint

- Reserve the full backtesting backend writer set to one writer.
- Do not run `CF-W2-BT-05` in parallel with any other `backtesting-strategy-lab` implementation packet.

## QA Handoff Needed

Team 04 should prepare backend QA for:

- registered strategy run with explicit documented exit rule codes
- registered legacy run with missing historical rule-code evidence
- custom-rule run marked unsupported
- comparable-run freshness on existing saved runs
- take-profit isolated into simulation-assumption counts only
- stop loss, trailing stop, max hold, and end-of-test isolated from documented invalidation proof
- no target/profit-target/R:R wording in evidence fields

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits
- route or controller changes
- frontend changes
- shared utility changes
- Strategy Framework source edits
- schema or migration changes
- generated-file changes
- branching from plain `dev` instead of the accepted backtesting stack

## Next Gate

Route `CF-W2-BT-05` to Team 04 QA planning next.

After Team 04 QA planning exists, Team 00 can evaluate it for Ready promotion on the stacked backtesting base.

## Team 00 Promotion Checklist

Before promotion, Team 00 should copy these exact reservations into the Ready queue:

- allowed files: the four files listed in `Allowed Files After Ready Promotion`
- forbidden files: the full forbidden list above, including repository, route, frontend, shared utility/UI, schema, package, generated, provider/live, startup/backfill, target/R:R/profit-target, and Today Review scope
- recommended branch: `codex/team06-strategy-signal/CF-W2-BT-05`
- recommended worktree: `../investment-scanner-worktrees/team06-CF-W2-BT-05`
- required base: accepted `CF-W1-BT-04` commit `2bd794f`

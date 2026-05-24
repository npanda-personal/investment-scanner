# CF-W1-TP-03 Work Packet

Date: 2026-05-20

Update: 2026-05-24

Status: Paused / stale as framed. Do not implement.

Product Owner redirected the workflow away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing. This work packet must not be executed unless Team 00 reframes it into Trusted Signal Candidate health/evidence support with no Trade Plan-first UX.

## Work Item

Trade Plan proof snapshot freshness / currentness labels for generated plans.

## State

Architecture-ready candidate. Not Ready for Implementation until Team 04 QA planning exists and Team 00 confirms stacked sequencing.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Backend module: `trade-plan-risk-engine`
- Frontend feature: `trade-plan-risk-engine`

## Smallest Honest First Child

Add one explicit proof-freshness projection that tells the user whether a plan is:

- current,
- partially refreshed,
- stale, or
- historical-only

and render that label consistently in the existing Trade Plan list and detail surfaces.

## Allowed Files After Ready Promotion

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `frontend/src/features/trade-plan-risk-engine/types.ts`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanTable.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`

## Branch / Worktree Requirement

Worktree required: yes.

Recommended future isolation after Team 00 promotion:

- Branch: `codex/team06-strategy-signal/CF-W1-TP-03`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-TP-03`
- Base: accepted `CF-W1-TP-01A` commit `309a853`

Reason:

- current `dev` does not contain the accepted parked Trade Plan trust stack
- `309a853` already contains accepted `CF-W1-TP-02` commit `1222daf`
- the reserved Trade Plan backend/frontend files are not parallel-safe

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.controller.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.router.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.module.ts`
- `backend/src/modules/trade-plan-risk-engine/index.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.repository.test.ts`
- `frontend/src/features/trade-plan-risk-engine/api/**`
- `frontend/src/features/trade-plan-risk-engine/hooks/**`
- `frontend/src/features/trade-plan-risk-engine/routes.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDashboard.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- upstream module source/tests outside Trade Plan
- shared backend utilities
- shared frontend components
- package manifests
- generated files

## Required Behavior

Future implementation must:

- add an additive proof-freshness object or equivalent stable fields
- derive the label from existing proof timestamps and proof metadata only
- expose a concise summary plus lagging component reasons
- render the same status and summary in the Trade Plan list and detail views
- preserve current DQ hard-blocking, exit/invalidation semantics, geometry, and paper-readiness behavior
- preserve research-support language

## Explicitly Deferred

- persistence redesign or backfill
- repository read-path rewrites
- dashboard-level proof-freshness rollups
- route or controller work
- shared UI or navigation work
- upstream DQ, Strategy Decision, Strategy Framework, or Backtesting source edits
- Prisma/schema or generated-file work

## One-Writer Constraint

- Reserve the full backend/frontend Trade Plan writer set to one writer.
- Do not run `CF-W1-TP-03` in parallel with any other `trade-plan-risk-engine` source packet.

## QA Handoff Needed

Team 04 should prepare QA for:

- `CURRENT`
- `PARTIALLY_REFRESHED`
- `STALE`
- `HISTORICAL_ONLY`
- list/detail consistency for the same plan
- preserved blocker and readiness behavior
- no target/advice drift in new copy

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- trade-plan-risk-engine.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits
- route or controller changes
- shared UI changes
- upstream module source edits
- Prisma/schema or migration changes
- generated-file changes
- branching from plain `dev` instead of the accepted Trade Plan stack

## Next Gate

Route `CF-W1-TP-03` to Team 04 QA planning next.

After Team 04 QA planning exists, Team 00 can evaluate it for Ready promotion on the stacked Trade Plan base.

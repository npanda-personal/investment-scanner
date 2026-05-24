# CF-W1-TP-03 Architecture Review

Date: 2026-05-20

Update: 2026-05-24

Owner: Team 03 Architecture Factory

## Status

PAUSED / STALE AS FRAMED.

This packet is not Ready for Implementation. Product Owner redirected the workflow away from Trade Plan, R:R, arbitrary targets, synthetic targets, and target-price framing.

Do not execute this architecture packet unless Team 00 first reframes it into Trusted Signal Candidate health/evidence support without Trade Plan-first UX.

## Queue Check

No higher-priority live Architect Signoff was waiting in the active integration flow at this pass.

Most recent Team 00 runtime evidence shows:

- `CF-W1-HCTX-03` already has accepted branch commit `f6034c6`
- `CF-W1-L3-TREV-02` already has accepted branch commit `f1de1d5`
- `CF-W1-MCTX-02` already has accepted branch commit `0c802c2`
- `CF-W1-SQLAB-02A` already has accepted branch commit `abac241`

This pass therefore moves to the next unassigned direct-value Trade Plan child.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-03-trade-plan-proof-snapshot-freshness-labels-for-generated-plans-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-02-work-packet.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `frontend/src/features/trade-plan-risk-engine/types.ts`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanTable.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`
- `git branch --contains 309a853`
- `git branch --contains 1222daf`

## Current Source Findings

- The backend already persists and returns the raw ingredients needed for truthful proof-freshness framing:
  - `proofGeneratedAt`
  - `snapshotVersion`
  - `paperReadinessProofChain`
  - `strategyDecisionSnapshot.generatedAt`
  - `dataQualitySnapshot.generatedAt`
  - `marketDataSnapshot.latestPriceTimestamp`
  - backtest proof summary timestamps where present
- The current frontend already has module-local list and detail trust surfaces, but it does not render any explicit proof-freshness label. A backend-only change would leave the user-facing trust gap open.
- The required UI work stays feature-local. No shared UI component, route, or hook change is required if the packet is limited to existing Trade Plan table/detail views.
- The current `dev` branch does not contain accepted Trade Plan trust work parked on `CF-W1-TP-01A` / `CF-W1-TP-02`. A new Trade Plan writer pass must not branch from plain `dev`.

## Architecture Decision

Prepare `CF-W1-TP-03` as one bounded `trade-plan-risk-engine` plus feature-local `trade-plan-risk-engine` UI packet.

A backend-only child is technically possible, but it is not the right direct-value packet because the current user-visible surfaces would still hide the new truth signal. The smallest honest investor/trader packet is:

- additive backend freshness classification and summary projection; plus
- feature-local list/detail rendering of that same label and summary.

## Proposed Contract Shape

The first child should add a stable additive proof-freshness object equivalent to:

```ts
type TradePlanProofFreshnessStatus =
  | 'CURRENT'
  | 'PARTIALLY_REFRESHED'
  | 'STALE'
  | 'HISTORICAL_ONLY';

type TradePlanProofFreshnessReasonCode =
  | 'ALL_COMPONENTS_ALIGNED'
  | 'MARKET_DATA_LAGGING'
  | 'DATA_QUALITY_SNAPSHOT_LAGGING'
  | 'STRATEGY_DECISION_SNAPSHOT_LAGGING'
  | 'BACKTEST_PROOF_LAGGING'
  | 'MISSING_COMPONENT_TIMESTAMP'
  | 'PERSISTED_PROOF_ONLY';

interface TradePlanProofFreshness {
  status: TradePlanProofFreshnessStatus;
  summary: string;
  reasonCodes: TradePlanProofFreshnessReasonCode[];
  laggingComponents: string[];
  freshestComponentAt: string | null;
  stalestComponentAt: string | null;
}
```

Exact field names may differ, but behavior must remain stable.

## Required Mapping Rules

- `CURRENT`
  - plan proof snapshot exists
  - current component timestamps are present
  - no component materially lags the others for the same generated plan
  - current data-quality / latest-price evidence does not already imply stale or missing support
- `PARTIALLY_REFRESHED`
  - the plan is still usable as current research support
  - but one or more proof components are older than the freshest component
  - the summary must name the lagging component category
- `STALE`
  - latest market-data or DQ evidence materially lags the plan proof chain, or
  - the plan is explicitly preserved from an older proof snapshot and should not read like current support
- `HISTORICAL_ONLY`
  - the plan can only prove historical saved evidence because one or more required component timestamps are absent, or
  - the response is relying on persisted proof metadata without enough timestamp evidence to call it current

The summary must stay concise and user-facing. It must not invent certainty, advice, or execution framing.

## Module Boundary

- Backend owner: `trade-plan-risk-engine`
- Frontend owner: `trade-plan-risk-engine`
- No upstream module source ownership opens in this child
- No route-registry, shared UI, package, generated, Prisma, or shared utility ownership opens in this child

## Exact Future File Reservations

Allowed future writer set:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`
- `frontend/src/features/trade-plan-risk-engine/types.ts`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanTable.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`
- `frontend/tests/ui/trade-plan-risk-engine.spec.ts`

## Exact Forbidden Files

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
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/shared/components/**`
- package manifests
- generated files

## Dependencies And Sequencing

- Hard implementation base: accepted `CF-W1-TP-01A` commit `309a853`
- `309a853` already contains accepted `CF-W1-TP-02` commit `1222daf`
- Do not branch this child from current `dev`
- Do not combine this child with fresh `TP-01A`, `TP-01B`, or `TP-02` semantics work
- One writer only across the full Trade Plan backend/frontend reservation above

## Shared-File Risk Assessment

- Shared route registries: no change allowed
- Shared UI: no change allowed
- Shared backend utilities: no change allowed
- Shared risk is sequencing risk, not architectural sprawl:
  - the entire reserved Trade Plan file set overlaps existing parked Trade Plan trust branches
  - Team 00 must keep the child in an isolated stacked worktree

## QA Implications

Team 04 should prepare QA for:

- `CURRENT` proof freshness
- `PARTIALLY_REFRESHED` with named lagging component
- `STALE` plan proof
- `HISTORICAL_ONLY` fallback
- list label and detail label showing the same status and summary for the same plan
- preserved DQ hard-block, exit/invalidation, and geometry behavior
- absence of advice-like wording such as `price target`, `profit target`, `buy now`, or `sell now`

## Architecture Verdict

- Item: `CF-W1-TP-03`
- Result: `ARCHITECTURE-READY-CANDIDATE`
- Blocked: no
- Next gate: Team 04 QA planning, then Team 00 Ready evaluation on stacked Trade Plan base `309a853`

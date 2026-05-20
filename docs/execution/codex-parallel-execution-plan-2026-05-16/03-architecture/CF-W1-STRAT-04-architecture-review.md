# CF-W1-STRAT-04 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness packet prepared for a bounded first slice.

Readiness result: `Not Ready for Implementation`.

This item remains a draft requirement. This packet does not move it to Ready.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-04-strategy-evidence-freshness-and-stale-summary-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02B-durable-revision-history-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-03-work-packet.md`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`
- active-scope conflict references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-CF-W1-SQLAB-02A-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`

## Current Source Findings

- `strategy-framework.service.ts` already owns all compact strategy-evidence read paths used by the existing feature:
  - catalog/list rows via `list(...)`
  - detail/performance summaries via `detail(...)` and `performance(...)`
  - proof registry rows via `proofRegistry(...)` and `proofDetail(...)`
- Existing compact evidence already exposes the main inputs needed for a bounded freshness derivation:
  - `generatedAt`
  - `tradeCount`
  - `ratingGrade`
  - `ratingWarnings`
  - `ratingCapsApplied`
  - `dataCoveragePercent`
  - `benchmarkCagr`
  - `excessCagr`
  - `missingEvidenceReason`
  - proof sample sufficiency
- The module docs already acknowledge that historical persisted rows can lack warning/cap fields until rerun. That gap is directly relevant to this requirement and can be surfaced without repository or schema changes.
- `StrategyFrameworkPage.tsx` currently renders status, rating, readiness, evidence-gap copy, and performance metrics, but it does not render a compact freshness or stale-summary label on catalog, proof, or performance surfaces.
- The frontend API client is a passthrough and does not need a route or query-contract change for additive DTO fields.

## Module Ownership

`strategy-framework` owns this requirement.

Reasons:

- the compact evidence summary and proof vocabulary already belong to Strategy Framework;
- the requirement is about summary trust framing, not backtesting simulation internals;
- Backtesting Strategy Lab should remain the detailed internals surface, while Strategy Framework stays the compact catalog/proof surface.

## Architecture Verdict

Bounded no-schema, no-route, no-shared-file first slice is feasible.

The smallest useful first slice is module-local full-stack inside Strategy Framework:

- additive backend DTO metadata;
- feature-local frontend rendering in the existing Strategy Framework page;
- no repository, schema, route, shared utility, shared UI, package, or generated-file widening.

Pure backend-only metadata is technically possible, but it would not satisfy the requirement's stated catalog/performance user-value surface in one pass. Team 00 should therefore treat the recommended first slice as module-local backend + feature-local UI, still fully inside owned non-shared files.

## Recommended First-Slice Semantics

The first slice should add a stable evidence-freshness packet equivalent to:

- freshness status:
  - `CURRENT`
  - `STALE`
  - `PARTIAL`
  - `STRUCTURALLY_LIMITED`
- summary age basis from existing `generatedAt`
- rerun-needed boolean
- stable reason codes derived from:
  - missing compact summary
  - sample sufficiency
  - warning/cap presence
  - missing warning/cap/coverage/benchmark basis on historical rows
  - stale age of the compact summary
- one concise stale-summary label and one reason summary suitable for catalog, proof, and performance reuse

Recommended status intent:

- `CURRENT`: compact summary exists, is recent enough, and does not show structural evidence gaps for this first slice.
- `STALE`: compact summary exists but should be rerun because the evidence age is too old for a "current" label.
- `PARTIAL`: compact summary exists but the basis is incomplete or cautionary, such as low sample, warnings/caps, or historical rows missing diagnostic basis fields.
- `STRUCTURALLY_LIMITED`: draft/support-rule/no-summary/insufficient-sample states where compact proof should not read like current evidence.

## Exact Future File Reservations

If Team 00 later promotes a first implementation slice, reserve only:

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Exact Forbidden Files

- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/src/modules/strategy-framework/index.ts`
- repository or evaluator tests
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- `frontend/src/features/strategy-framework/routes.tsx`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Dependency Risks And Stop Conditions

Stop and return to Team 00 if the first slice requires:

- repository or schema changes to persist a new freshness model;
- route/controller/validation changes;
- Strategy Framework registry or evaluator rewrites;
- Backtesting Strategy Lab source changes;
- shared component extraction;
- feature-wide navigation or route changes.

Specific risks:

- freshness age policy is bounded only if the first slice uses one documented module-local max-age rule over `generatedAt`; if Team 00 wants timeframe-specific persisted rerun cadence or run-history provenance, split a second child instead of widening;
- historical rows that predate persisted warning/cap diagnostics can be labeled honestly from current nullable fields, but they cannot be backfilled in this slice.

## Parallel-Safety With Active Teams

- Safe in parallel with active `CF-W1-SQLAB-02A` because that work reserves only `signal-quality-lab/**`.
- Safe against current active Team 06 rework assignments because none reserve `strategy-framework` files in the runtime queue evidence inspected for this pass.
- Not safe to parallelize with any other future `strategy-framework` writer because the proposed file set spans the owned module's service/types/docs and the feature page/spec.

## QA Planning Handoff Notes

Future Team 04 planning should cover:

- current summary state on recent complete evidence;
- stale summary state when `generatedAt` exceeds the documented freshness window;
- partial state from low-sample, warning/cap, or missing-basis historical rows;
- structurally limited state for no-summary, draft, blocked, or insufficient-sample rows;
- preserved rating/readiness/proof math and existing next-action links;
- visible catalog, proof, and performance labels staying research-supportive and not implying trade advice.

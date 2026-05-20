# CF-W1-L3-INTEL-02 Work Packet

Date: 2026-05-20

## Work Item

Portfolio Intelligence review traceability.

## State

Architecture-readiness refreshed. Not Ready for Implementation.

Do not promote this child to Ready from Team 03.

Current blockers before any Team 00 Ready evaluation:

- active `CF-W1-L3-WATCH-01` remains ahead of this child in Lane 3 direct-value sequencing;
- hard upstream dependency on accepted `CF-W1-L3-PORT-01A` readiness semantics remains unmet on plain current `dev`;
- `CF-W1-L3-INTEL-01` still shares the exact same `portfolio-intelligence` writer set;
- no dedicated `CF-W1-L3-INTEL-02` QA plan exists yet.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Lane 3 implementer assigned by Team 00 after `WATCH-01` clears
- Lane: Lane 3
- Module: `portfolio-intelligence`

## Allowed Files After Team 00 Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`

## Current Forbidden Files

- application source/tests before Team 00 Ready promotion
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.module.ts`
- `backend/src/modules/portfolio-intelligence/index.ts`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all `frontend/src/features/portfolio-intelligence/**`
- all `frontend/tests/ui/**`
- alerts-monitoring source/tests
- notifications-delivery source/tests
- providers, startup/backfill, paid/cloud, broker, or telemetry flows
- `CF-W1-L3-WATCH-01` docs or Team 07 worktree

## Dependency Summary

- `CF-W1-L3-WATCH-01`: sequencing dependency only. This child should stay behind the active WATCH-01 path in Team 00 routing, but it does not share application files with WATCH-01.
- `CF-W1-L3-PORT-01A`: hard contract and implementation-base dependency. Current plain `dev` lacks the accepted readiness DTO fields, so future implementation must stack on accepted `f1432e6` or a later clean `dev` that includes it.
- `CF-W1-L3-PORT-01B`: no code dependency. `INTEL-02` must not read watchlist readiness DTOs or widen into watchlist-management scope.
- `CF-W1-L3-INTEL-01`: same writer set. Team 00 must combine or strictly sequence the two `portfolio-intelligence` children.

## Required Behavior

Future implementation must:

- consume accepted portfolio readiness metadata through `PortfolioManagementService.summary()`;
- add additive review-traceability metadata that distinguishes reliable, limited, diagnostic, and blocked states;
- surface source modules, blocker reasons, and latest trusted data date where available;
- preserve current Portfolio Intelligence response fields and route behavior;
- avoid duplicating DQE scoring logic;
- stay backend-only for the first child.

## QA Handoff Needed

Yes. QA plan refresh is required.

Current state:

- `CF-W1-L3-INTEL-01` has a QA plan.
- `CF-W1-L3-INTEL-02` does not yet have a dedicated QA plan file.

Team 04 should either:

1. create `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-INTEL-02-qa-plan.md`, or
2. explicitly merge INTEL-02 scenarios into a combined `INTEL-01 + INTEL-02` QA packet after Team 00 chooses the single-writer sequencing path.

Minimum QA scope:

- reliable review traceability;
- limited review traceability;
- diagnostic-only review traceability;
- blocked review traceability;
- source-module and blocker propagation;
- backward-compatible existing response fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Portfolio Management source changes
- watchlist-management source changes
- DQE source/export changes
- Prisma/schema/generated changes
- route or shared-utility/shared-UI changes
- frontend or UI smoke scope
- plain current `dev` as the base when `f1432e6` is still absent
- splitting this child in parallel with `CF-W1-L3-INTEL-01`

## Next Gate

1. let active `CF-W1-L3-WATCH-01` stay ahead in Team 00 Lane 3 sequencing;
2. keep `CF-W1-L3-INTEL-02` parked until Team 00 chooses a safe base that includes accepted `PORT-01A` semantics;
3. refresh QA planning through Team 04;
4. have Team 00 choose one writer strategy for `INTEL-01` plus `INTEL-02` before any future Ready evaluation.

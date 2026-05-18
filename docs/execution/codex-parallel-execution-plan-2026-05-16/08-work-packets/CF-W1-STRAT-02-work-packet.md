# CF-W1-STRAT-02 Work Packet

Date: 2026-05-18

## Work Item

Strategy Framework rule versioning and Data Quality gate policy.

## State

Split required. Not Ready for durable implementation.

This packet prepares the no-schema first child only: explicit source-declared rule revisions plus explicit DQ gate policy exposure inside Strategy Framework. Durable version-keyed persistence remains out of scope and blocked.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `strategy-framework`
- Frontend feature: `strategy-framework`

## Allowed Files After Ready Promotion

- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `frontend/tests/ui/strategy-framework.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/src/modules/data-quality-engine/**`
- `frontend/src/features/strategy-framework/api/strategyFrameworkApi.ts`
- `frontend/src/features/strategy-framework/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- paid/cloud, provider/startup, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add additive `ruleRevision` metadata to registry-backed rule declarations;
- add additive declarative DQ gate policy metadata to strategy definitions;
- add additive trust/versioning metadata to list/detail/proof payloads without changing existing proof-performance status meaning;
- show that stronger review requires DQE `signal` tier `READY`;
- show that trusted standalone backtest promotion requires DQE `backtest` tier `READY`;
- keep limited or missing DQ evidence review-visible only;
- preserve current evaluator math, proof grading, standalone backtest gating, routes, and page tabs.

## Explicitly Deferred

- durable version-keyed `StrategyDefinition` persistence;
- Prisma/schema, migration, generated, or repository identity changes;
- evaluator math, scoring, or backtest-config changes;
- Data Quality Engine source changes;
- controller/router/validation/API-client changes;
- shared UI/navigation or route expansion.

## Dependency Notes

- This first child is source-supported because Strategy Framework list/detail/proof are registry-backed.
- Full durable/stable rule revisioning remains blocked until Team 00 / Architect authorize a schema/generated/repository child.
- Team 00 should not promote another Strategy Framework source packet in parallel with this slice. The registry/types/service/doc/test and page/type/UI spec form one writer set.

## QA Handoff Needed

Team 04 should prepare no-schema child QA only.

Required QA focus:

- backend service coverage for versioned rule metadata, legacy undeclared rule fallback, and DQ gate policy payload exposure;
- UI smoke coverage for catalog/detail/proof trust metadata, research-support wording, and unchanged standalone backtest action rules;
- additive compatibility checks so existing Strategy Framework consumers do not break.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- strategy-framework.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- strategy-framework.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema or generated file changes;
- repository identity changes or version-keyed persistence;
- evaluator math or score semantics changes;
- Data Quality Engine source changes;
- controller/router/validation or route-registry changes;
- shared utility/UI or package changes.

## Next Gate

Team 04 QA planning can start for the no-schema child now.

Team 00 should keep the parent requirement out of Ready and choose one of two paths:

1. promote the no-schema trust-surfacing child only; or
2. open a separate approval-gated durable persistence child for schema/repository work.

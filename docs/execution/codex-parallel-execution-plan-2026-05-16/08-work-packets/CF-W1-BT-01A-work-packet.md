# CF-W1-BT-01A Work Packet

Date: 2026-05-18

## Work Item

Backtesting DQ fail-closed characterization.

## State

Characterization-only.

This packet is intentionally narrower than a normal implementation-ready child. It is limited to proving current behavior with focused tests and module-doc clarification.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future execution owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Module: `backtesting-strategy-lab`

## Smallest Bounded Child

Characterize the current `backtesting-strategy-lab` DQ gate behavior without changing source behavior:

- DQ disabled baseline;
- DQ enabled default missing-quality warning/process behavior;
- limited/not-ready option pass-through;
- strict missing-quality skip option;
- registered history-completeness outcomes.

This child does not rewrite simulation math, default policy, or frontend trust framing.

## Allowed Files After Team 00 Promotion

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

## Current Forbidden Files

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- all frontend files
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- package manifests
- provider/live-data/startup/backfill/paid-cloud/broker/telemetry files

## Required Behavior

The future execution pass must:

- add focused service tests that characterize current DQ behavior;
- update the module doc so the current optional/filter-default semantics are explicit;
- avoid changing runtime behavior.

Required assertions:

- `useDataQualityFilter` absent or false leaves the universe unchanged;
- enabled DQ defaults to `excludeNotReady=true`, `includeLimited=false`, `excludeMissingQuality=false`, and `missingQualityBehavior=WARN_AND_PROCESS`;
- `excludeNotReady=false` flips the current call shape to allow limited readiness;
- `excludeMissingQuality=true` flips the current call shape to skip missing DQ;
- registered runs with no qualifying history return `INSUFFICIENT_HISTORY`;
- registered runs with mixed qualifying and non-qualifying history return `PARTIAL`.

## Explicitly Deferred

- no fail-closed default-policy change
- no service/types source change
- no route/repository/controller/validation change
- no frontend/UI work
- no BT-02 review-disposition work
- no trade-level rule traceability
- no schema/generated/provider/shared-file work

## Dependency And Sequencing Notes

- `CF-W1-BT-02` is accepted and locally committed outside `dev`, so Team 00 must sequence this child behind that accepted backtesting branch or place both under one writer in a dedicated worktree.
- This is still a useful child because it reduces ambiguity before any larger DQ policy change.
- The child remains backend-only and module-local.

## QA Handoff Needed

Team 04 should prepare a focused QA plan for current-behavior characterization, not desired-policy enforcement.

Required QA focus:

- prove the DQ-disabled fail-open baseline;
- prove the DQ-enabled default missing-quality warning/process call shape;
- prove explicit strict missing-quality skip behavior when requested;
- prove explicit limited/not-ready pass-through when requested;
- prove `INSUFFICIENT_HISTORY` and `PARTIAL` history outcomes for registered runs;
- confirm research-support wording remains intact.

## Stop Conditions

Stop and return to Team 00 / Architect if characterization unexpectedly requires:

- service or types edits
- route/repository/controller/validation changes
- frontend work
- shared utility changes
- schema/generated/provider/package changes
- a policy decision about what the default DQ behavior should become

## Next Gate

Team 04 QA planning can proceed now.

Team 00 should route this only as a characterization-only child and sequence it behind the accepted `CF-W1-BT-02` backtesting branch state.

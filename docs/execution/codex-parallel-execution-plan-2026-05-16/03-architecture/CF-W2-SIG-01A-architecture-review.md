# CF-W2-SIG-01A Architecture Review

Date: 2026-05-24

## Work Item

`CF-W2-SIG-01A` - Signal Generation run-path Data Quality fail-closed behavior.

## Architecture Status

Architecture prepared.

Team 00 can route this to Team 04 for QA planning. It is not implementation-Ready until Team 04 produces or refreshes a QA plan and Team 00 promotes the slice with an exact handoff.

## Source Inspected

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Current Behavior Evidence

- `parseRunRequest()` already defaults omitted `useDataQualityFilter` to `true` while preserving explicit `false`.
- `SignalGenerationEngineService.run()` also defensively treats `request.useDataQualityFilter !== false` as filtered mode.
- The run path calls `DataQualityEngineService.filterEligibleInstruments()` with `missingQualityBehavior: request.missingQualityBehavior ?? 'SKIP'`.
- If the DQ filter throws, the run path converts the failure into an empty eligible set, counts the resolved universe as excluded by DQ, records a warning, and does not call `generateForInstrument()`.
- When the DQ filter returns eligibility evidence, the run path passes per-instrument eligibility snapshots into generation and preserves them on generated signal output where current DTO behavior supports it.
- Existing tests already cover default request parsing, strict DQ filtering, missing evaluation skip behavior, DQ filter failure, eligibility evidence preservation, and no target/advice wording in generated signal evidence.

## Architectural Decision

Use the existing Signal Generation service boundary and the existing public Data Quality Engine filter service. Do not add a new DQE dependency path, repository, route contract, persistence model, frontend behavior, generated type, package dependency, or shared helper.

This slice is backend-only and module-local:

- request normalization belongs in `signal-generation-engine.validation.ts`;
- run-path enforcement belongs in `signal-generation-engine.service.ts`;
- DQ readiness evaluation remains owned by Data Quality Engine;
- Signal Generation consumes DQE eligibility results and records run-level counts/evidence;
- explicit `useDataQualityFilter: false` remains a legacy/research bypass and must not be described as a trusted run.

## Allowed Implementation Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Forbidden Files And Boundaries

- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`, unless Team 00 explicitly reopens the reservation because current types prove insufficient
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/index.ts`
- `frontend/src/**`
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities
- shared frontend UI
- package manifests
- generated/common fixtures
- provider/live-data, Angel One, broker, paid service, startup/backfill, telemetry, or credential files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required QA Focus

- Omitted `useDataQualityFilter` defaults to `true` at validation and service behavior.
- Explicit `useDataQualityFilter: false` remains preserved and is treated as outside trusted enforcement.
- Default missing DQ behavior is `SKIP`.
- Strict DQ runs generate only DQ-ready instruments.
- DQ filter failure fails closed with zero generated signals, zero attempted generation, and DQ exclusion/missing counts for the resolved universe.
- Generated eligible signals preserve available DQ eligibility evidence.
- Skipped/excluded DQ instruments are not counted as generation failures.
- No target price, R:R, synthetic target, direct buy/sell advice, or guaranteed-outcome wording is introduced.

## Parallel Safety

This slice is isolated from active `CF-W1-MD-05` Market Data files and active `CF-W1-TSC-02A` Today Review files. It can be prepared in parallel by Team 03 and Team 04. Implementation should use a dedicated Team 06 worktree and must wait for Team 00 Ready promotion.

Recommended implementation branch:

- `codex/team06-strategy-signal/CF-W2-SIG-01A`

Recommended implementation worktree:

- `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SIG-01A`

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- DQE source/test changes;
- new DQE public contract, generated DTO, or shared type changes;
- Signal Generation type/repository/controller/router/module/index changes beyond the allowed reservation;
- Prisma/schema/migration changes;
- route registry changes;
- frontend/UI changes;
- provider/live/startup/backfill behavior;
- package changes;
- target/R:R/Trade Plan/advice semantics;
- a second active writer on any allowed file.

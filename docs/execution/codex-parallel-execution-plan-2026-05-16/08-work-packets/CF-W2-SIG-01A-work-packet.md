# Work Packet: CF-W2-SIG-01A Signal Generation Run-Path DQ Fail-Closed Behavior

Date: 2026-05-24

## Status

Architecture-prepared.

Team 00 may send this packet to Team 04 for QA planning. Do not start implementation until Team 04 QA planning is complete and Team 00 records a Ready promotion.

## Requirement

Default Signal Generation run requests to DQ-filtered behavior and fail closed when DQ filtering is unavailable.

## Recommended Owner

Team 06 - Strategy / Signal / Risk.

Recommended branch:

- `codex/team06-strategy-signal/CF-W2-SIG-01A`

Recommended worktree:

- `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SIG-01A`

Recommended base:

- latest `dev` at Team 00 Ready promotion time, unless another active Signal Generation writer is open.

## Allowed Files

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Allowed branch-local reporting docs after Ready promotion:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SIG-01A-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SIG-01A-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`, unless Team 00 explicitly widens the reservation
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/index.ts`
- `frontend/src/**`
- Prisma schema or migrations
- Route registries
- Shared backend utilities
- Shared UI
- Package manifests
- Generated/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One, live provider, broker, paid-service, startup/backfill, telemetry, credential, or UI files

## Required Behavior

- Omitted `useDataQualityFilter` defaults to `true`.
- Explicit `useDataQualityFilter: false` remains preserved and is documented as outside trusted DQ enforcement.
- Missing DQ behavior defaults to `SKIP`.
- Strict DQ-filtered runs pass only DQ-ready instruments to `generateForInstrument()`.
- DQ filter exceptions fail closed with zero generated signals and zero attempted generation.
- DQ-excluded and missing-evaluation instruments count as skipped/excluded by DQ, not generation failures.
- Eligible generated signals preserve DQ eligibility evidence where current DTO behavior supports it.
- No target-price, R:R, synthetic target, direct advice, guaranteed-outcome, or Trade Plan-first wording is introduced.

## Validation

Run:

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- any forbidden file;
- new Data Quality Engine behavior or public contract;
- Signal Generation response type changes;
- repository/controller/router/module/index changes;
- schema, generated, route, shared, package, provider, live, startup, backfill, frontend, UI, paid/cloud, broker, or credential scope;
- target/R:R/Trade Plan/advice semantics;
- changing downstream Today Review, Signal Quality, Strategy Decision, Backtesting, Portfolio, Watchlist, Alert, Copilot, or Research Hub behavior.

## Limitations To Preserve

- Full `CF-W1-SIG-01` remains incomplete.
- Read-path filtering and persisted trust classification are separate future requirements.
- `topSignals()`, `screener()`, and `latestForInstrument()` DQ trust enforcement remain out of scope.
- Downstream modules remain separate requirements.

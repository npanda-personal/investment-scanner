# CF-W1-STRAT-03 Work Packet

Date: 2026-05-18

## Work Item

Strategy Decision review provenance and concise reason-summary exposure.

## State

Ready candidate for a bounded backend-local child. Not yet promoted for implementation.

This slice is intentionally additive, no-schema, no-route, and backend-only.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signal / Risk
- Lane: Lane 2
- Module: `strategy-decision-engine`

## Allowed Files After Ready Promotion

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.repository.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.controller.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.router.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.validation.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.module.ts`
- `backend/src/modules/strategy-decision-engine/index.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.repository.test.ts`
- backend and frontend route registries
- all frontend `strategy-decision-engine` files
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/research-hub/**`
- providers, startup/backfill, live-provider, paid/cloud, broker, or telemetry files

## Required Behavior

Future implementation must:

- add additive top-level provenance metadata to Strategy Decision DTOs;
- add additive top-level `reasonSummary`;
- label persisted rows as `FRAMEWORK_BACKED` or `LEGACY_FALLBACK` from current persisted fields;
- label `READ_PATH_CREATED` only when the current request created the row on a lookup miss;
- set `legacyIncludedByRequest=true` only for explicit `includeLegacy=true` persisted legacy reads;
- preserve default legacy exclusion and current proof-safe latest-date behavior;
- preserve decision math, score thresholds, evaluator behavior, routes, query params, and persistence keys;
- preserve research-support wording.

## Explicitly Deferred

- durable stored read-path-created provenance across later history/list reads
- repository changes
- schema/generated changes
- controller/router/validation changes
- frontend trust rendering
- downstream consumer adoption in Research Hub, Today Review, or Trade Plan
- shared DTO or shared utility work

## Dependency And Parallel-Safety Notes

- `CF-W1-STRAT-03` is still a docs-only refinement item and is not currently in Ready.
- Active Team 06 `CF-W1-BT-01A` reserves only backtesting module doc/test files in its stacked worktree.
- `CF-W1-STRAT-03` future writer set is entirely inside `strategy-decision-engine`.

Result:

- no overlap with active Team 06 `CF-W1-BT-01A`
- safe for parallel routing from a file-reservation standpoint

Non-blocking lineage notes:

- accepted `CF-W1-STRAT-01` stays closed;
- accepted `CF-W1-STRAT-02A` stays closed;
- proposal-only `CF-W1-STRAT-02B` durable-history work stays separate and does not block this child.

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend QA for:

- persisted framework-backed candidate/history rows
- persisted legacy rows when `includeLegacy=true`
- default candidate read still excluding legacy rows
- direct lookup miss path returning request-local `READ_PATH_CREATED`
- watchlist and portfolio responses carrying request-local read-path provenance when a member row is created on demand
- later persisted reads not fabricating durable read-path provenance
- stable `reasonSummary` precedence and research-support wording

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- repository edits
- Prisma/schema/generated changes
- route/controller/validation changes
- frontend work
- shared utility or shared DTO changes
- Strategy Framework, DQE, Signal Generation, Calibration, Smart Money, Market Context, Research Hub, or Trade Plan source edits
- durable stored provenance instead of request-local response decoration

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

This packet is bounded enough for Ready review, but Team 03 does not self-promote implementation.

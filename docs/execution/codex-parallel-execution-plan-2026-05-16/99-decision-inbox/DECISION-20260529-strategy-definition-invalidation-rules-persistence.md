# DECISION-20260529 - Strategy Definition Invalidation Rules Persistence

Date: 2026-05-29

## Status

Open.

## Summary

QA-authored TDD coverage for `CF-W3-STRAT-05` proves that persisted Strategy Framework definitions drop `invalidationRules`.

Current code has first-class `invalidationRules` in the TypeScript `StrategyDefinition` contract and registry, but the Prisma `StrategyDefinition` model does not include an `invalidationRules` column. `StrategyFrameworkRepository.toDefinitionData()` cannot safely persist the field without a Prisma schema/generated-client change, and `toDefinitionDto()` currently maps persisted rows back with `invalidationRules: []`.

## Affected Workstream

`CF-W3-STRAT-05` Strategy Framework review findings, persistence sub-slice only.

Other no-schema slices may continue:

- evaluator fail-closed gate hardening,
- Strategy Framework current-version ranking guard,
- backtesting operational-exit evidence isolation,
- registered backtest proxy-context correction,
- Signal Generation market-context gating.

## Decision Needed

Choose whether to approve a bounded Prisma/schema/generated-client implementation slice for Strategy Definition invalidation-rule persistence.

## Option A - Approve Additive Schema Field

Approve a bounded additive schema/generated-client slice:

- add `StrategyDefinition.invalidationRules Json` to Prisma schema;
- generate Prisma client;
- update repository definition persistence and DTO mapping;
- keep route/API shape additive;
- add/keep focused repository regression tests;
- no route registry, package manifest, frontend, provider, live data, or broad strategy rewrite scope.

## Option B - Defer Durable Persistence

Do not change Prisma schema now.

Effects:

- keep registry/API invalidation rules in memory only;
- mark persisted database-backed Strategy Definition invalidation rules as unsupported/blocked;
- adjust or quarantine the QA red-bar repository tests as a blocked persistence requirement;
- continue no-schema Strategy Framework hardening.

## Recommendation

Option A is the clean technical path because the product contract already requires explicit invalidation rules. The slice should remain strictly additive and limited to Prisma schema/client generation plus Strategy Framework repository tests/source.

## Scope Guardrails

This decision does not approve:

- strategy-rule semantic redesign,
- registry/evaluator rewrite,
- frontend implementation,
- route registry changes,
- package manifest changes,
- data migration/backfill beyond the additive column,
- provider/live data calls,
- target-price/R:R/trade-plan wording.

## Current Evidence

QA-authored tests added in:

- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`

Expected red-bar failures:

- `upsertDefinitions()` does not include `invalidationRules` in create/update payloads;
- `listDefinitions()` maps persisted `invalidationRules` back to `[]`.

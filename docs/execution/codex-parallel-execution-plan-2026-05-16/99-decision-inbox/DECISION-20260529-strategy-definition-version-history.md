# DECISION-20260529 - Strategy Definition Version History

Date: 2026-05-29

## Status

Open.

## Summary

Latest Strategy Framework review found that persisted strategy definitions are not version-safe.

`StrategyDefinition.code` is currently unique in Prisma, and `StrategyFrameworkRepository.upsertDefinitions()` upserts by `code`. When a registered strategy version changes, the persisted row is overwritten instead of preserving the historical rule definition for the prior version. Performance summaries are keyed by `strategyCode + strategyVersion`, but the durable definition table cannot reconstruct the rule contract that produced older proof.

## Affected Workstream

`CF-W3-STRAT-05` Strategy Definition persistence/history sub-slice only.

No-schema Strategy Framework, Strategy Decision, Signal Generation, frontend display, and proof filtering slices may continue as long as they do not alter Prisma schema, generated client, migrations, route registries, or package manifests.

## Decision Needed

Choose whether to approve a bounded Prisma/schema/migration/generated-client slice for version-safe Strategy Definition history.

## Option A - Approve Version-Safe Definition Persistence

Approve a bounded schema/generated-client/migration slice:

- change Strategy Definition natural key from `code` only to `code + version`;
- preserve historical definition rows for older strategy versions;
- update repository upsert/get/list behavior to use current registry definitions while allowing historical lookup where needed;
- add focused repository/service tests proving historical versions are not overwritten;
- document migration/backfill behavior and rollback notes.

## Option B - Defer Durable Version History

Do not change Prisma schema now.

Effects:

- keep the registry as the source of current in-memory definitions;
- proof/performance services must filter stale versions and avoid presenting stale proof as current;
- historical rule reconstruction from persisted definitions remains unsupported;
- future version-safe persistence must return through a separate schema-approved slice.

## Recommendation

Option A is the clean long-term path, but it is not required to continue no-schema hardening. The immediate no-schema slice should filter stale-version proof and clearly avoid presenting old proof as current.

## Scope Guardrails

This decision does not approve:

- strategy-rule semantic redesign;
- evaluator rewrite;
- frontend implementation;
- route registry changes;
- package manifest changes;
- provider/live data calls;
- target-price/R:R/trade-plan wording;
- broad migration beyond Strategy Definition version-history persistence.

## Current Evidence

Reviewed files:

- `backend/prisma/schema.prisma`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`

Observed behavior:

- Prisma `StrategyDefinition.code` is unique;
- `upsertDefinitions()` uses `where: { code }`;
- older rule definitions are overwritten when a new registry version is seeded.

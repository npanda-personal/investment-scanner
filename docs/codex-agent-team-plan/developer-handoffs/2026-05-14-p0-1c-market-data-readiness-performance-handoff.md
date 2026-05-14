# P0.1C Market Data Readiness Performance Developer Handoff - 2026-05-14

Mode: Implementation Mode
Owner: Market Data backend developers
Architecture: [P0.1C performance contract](../architecture-contracts/2026-05-14-p0-1c-market-data-readiness-performance-contract.md)
QA plan: [P0.1C performance QA plan](../qa-plans/2026-05-14-p0-1c-market-data-readiness-performance-qa-plan.md)
Status: `Ready for Implementation`

## Assignment Rules

- Developers are not alone in the codebase. Do not revert edits made by others.
- One developer owns one slice at a time.
- Do not edit outside the assigned write scope without Orchestrator approval.
- Run focused validation before handing off to QA.
- If blocked, report blocker, exact file/function, and next decision needed.

## Slice A - Repository Stats Optimization

Primary owner: one backend developer.

Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- repository tests under `backend/tests/modules/market-data-foundation/`

Goal:

- Remove per-symbol recent price query fanout from `priceReadinessStatsForSymbols` / `priceQualityRowsForSymbols` while preserving output semantics.

Developer validation:

- Focused repository tests.
- Add or update a mocked-call-count test proving the implementation does not issue one recent-price query per symbol.

## Slice B - Service Snapshot Reuse

Primary owner: a second backend developer if Slice A is active; otherwise the same developer can continue after Slice A.

Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- service tests under `backend/tests/modules/market-data-foundation/`

Goal:

- Reuse full-universe readiness snapshots inside `reviewReadinessSummary` and dry-run `repairRun`.

Developer validation:

- Focused service tests for `repairPlan`, `reviewReadinessSummary`, dry-run `repairRun`, and no-mutation behavior.

## Slice C - Bounded Price Backfill Concurrency

Primary owner: Orchestrator assigns only after Slice A/B review, unless no file conflict exists.

Write scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- service tests under `backend/tests/modules/market-data-foundation/`

Goal:

- Use conservative bounded workers for selected price-backfill page execution without changing trust gates or provider policy.


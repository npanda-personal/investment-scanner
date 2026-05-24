# Team 02 Outbox - Market Data Freshness Requirement - 2026-05-24

## Work Item

- `CF-W1-MD-05`
- Title: Catalog sync latest session freshness and skip explainability
- Mode: Requirement discovery / refinement only
- Owner: Team 02 Product Owner / Requirement Factory
- Lane: Lane 1 - Market Data / Data Quality

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-market-data-freshness-requirement-2026-05-24.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/types.ts`

## Requirement Summary

The current market-data freshness gap is requirement-worthy because catalog sync can report a coarse skipped/no-new-data outcome while stock rows still show stale data-through dates. Source inspection shows the backend already distinguishes latest-completed-session catch-up from fully final-confirmed freshness, but that truth is not surfaced clearly enough in run responses or UI. `CF-W1-MD-05` narrows the fix to additive freshness-basis evidence and skip explainability on existing catalog sync and stock-list surfaces.

## Product Decisions Recorded

1. Treat this as upstream direct investor/trader value, not as admin convenience.
2. Do not widen this into provider approval, startup/backfill, schema, or route-registry work.
3. Keep DQ ownership intact. This requirement exposes freshness evidence; it does not create a second DQ system.

## Recommended Priority Placement

Recommend Team 00 place `CF-W1-MD-05`:

1. ahead of `CF-W1-TSC-02`
2. ahead of `CF-W1-TSC-03`
3. ahead of `CF-W1-DQ-02` residual parent
4. ahead of practical execution on `CF-W1-MD-02A`, while leaving `MD-02A` proposal-only because storage consent is still closed

## Architecture Path Recommendation

- Team 03: prepare an additive contract/UX truth packet on existing Market Data Foundation routes and DTOs
- Team 04 or the next Lane 1 implementation team: module-owned backend/frontend work only after reservation
- QA: define stale-catch-up, fully current, and pre-fetch-skipped proof scenarios

## Blockers / Open Decisions

- Team 00 must decide whether to re-rank the queue immediately or carry `MD-05` as the next Lane 1 requirement-ready prep item.
- Team 03 must confirm the additive DTO shape without route-registry edits.
- UX wording still needs validation so "session freshness" and "instrument freshness" are distinct and non-misleading.

## Tests Run

- None. Requirement/doc pass only.

## Tests Skipped

- Builds, typecheck, unit, integration, UI smoke, and live provider validation were skipped because this pass was requirement discovery only and source remained read-only.

## Risks

- If `MD-05` is left behind downstream Today Review work, stale-candle ambiguity will continue to undermine trust in candidate review.
- If implementation collapses session freshness and instrument freshness into one status again, the bug will remain in softer wording.
- If this is widened into storage/schema work, it will block behind consent and lose the bounded trust value.

## Teams Ready To Pick Up New Tasks

- Team 03 Solution Architect: ready for architecture contract and DTO/UX truth refinement on `CF-W1-MD-05`
- QA planning lane: ready for acceptance scenario planning on `CF-W1-MD-05`
- Team 02 Requirement Factory: ready to hand off and continue rolling discovery after Team 00 placement decision

## Next Gate

- Team 00 priority placement decision
- Team 03 architecture prep

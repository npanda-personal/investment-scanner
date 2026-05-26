# TEAM-03 - CF-W2-SPL-02 Architecture Outbox

Date: 2026-05-26

Owner: Team 03 - Solution Architecture Factory

State: Docs-only architecture packet complete. Ready for Team 04 QA planning and Team 00 sequencing. Not implementation approval by itself.

## Work Item

- Requirement: `CF-W2-SPL-02`
- Title: `Signal Position Ledger active positions surface`
- Lane / module family: Lane 2 signal evidence with Lane 3 user-facing surface
- Mode: docs/architecture only

## Verdict

`READY-CANDIDATE AFTER QA`

## Product Owner Decision Needed

No true Product Owner Decision Packet is needed if the implementation stays inside this architecture packet.

Team 00 still must record explicit one-writer reservations for:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`

Decision escalation is needed only if a later team wants closed-history truth, backend aggregate summaries, server-side search/filter expansion, schema/storage, package changes, shared UI redesign, Home Page exposure, broker/execution/portfolio semantics, or target/reward-risk language.

## Architecture Decisions

- Backend route mounting uses the accepted `ca31d79` `signalPositionLedgerRouter`.
- Mount path is `/api/v1`, making the active endpoint `/api/v1/signals/position-ledger/active`.
- No closed-history endpoint is allowed.
- Frontend route is `/signal-position-ledger`.
- Navigation label is `Signal Position Ledger`.
- Navigation group is `Daily Work`, placed after `Today Review`.
- `Active Positions` is the default truth-bearing tab.
- `Closed History` is placeholder-only with no rows, counts, mock data, or API call.
- Preserve the `CF-W2-SPL-01B` active-list DTO shape.
- Do not add backend summary aggregates in slice 1.
- Use `totalCount` for scope-wide active count.
- Any status counts beyond `totalCount` must be derived from returned page items and visibly labeled `This page`.
- Default ordering must be backend-applied newest entry trigger first before pagination.
- No client-side sort/search/filter over one page of paginated data.
- No row-detail route in slice 1.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-02-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/ux-ui-best-practices.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/shared-file-control.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-08-CF-W2-SPL-02-ux-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- accepted commit `ca31d79` backend SPL module files
- selected frontend feature route/API/hook and shared component patterns

## Allowed Files For Implementation

Backend:

- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- optional: `backend/tests/api/routes.test.ts`

Frontend:

- `frontend/src/features/signal-position-ledger/types.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/ActivePositionsTable.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/src/features/signal-position-ledger/components/ClosedHistoryPlaceholder.tsx`
- `frontend/src/features/signal-position-ledger/routes.tsx`
- `frontend/src/features/signal-position-ledger/index.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests and lockfiles
- `backend/src/db/**`
- `backend/src/shared/**`
- `frontend/src/shared/**`
- `frontend/src/contexts/MarketScopeContext.tsx`
- `frontend/tests/ui/support/**` unless Team 04 reserves it
- `frontend/src/app/HomePage.tsx`
- Today Review implementation files
- Trade Plan Risk Engine implementation files
- Portfolio implementation files
- Backtesting implementation files
- provider/live/startup/backfill/scheduler/worker/queue files
- closed-history source files
- row-detail route/page files

## Tests Run

None.

## Tests Skipped

Builds, backend tests, frontend tests, UI smoke, and live local validation were skipped because this was a docs-only architecture pass with no application source changes.

## Risks

- The implementation base must contain accepted commit `ca31d79`; current main workspace inspection showed no SPL module on the live tree.
- Shared route/navigation files require Team 00 one-writer control.
- Newest-entry ordering needs a narrow backend read-model correction before the UI can claim the required default order.
- Page-local status counts must be labeled clearly to avoid fake scope-wide counts.

## Blockers

No architecture blocker remains for the active-surface child.

Remaining normal gates:

- Team 04 QA plan for this surfaced page.
- Team 00 shared-file reservation and Ready promotion.
- Implementation handoff, QA verification, code review, architect signoff, and Product Owner acceptance.

## Next Gate

Team 04 QA planning for the bounded active-surface plus closed-placeholder behavior.


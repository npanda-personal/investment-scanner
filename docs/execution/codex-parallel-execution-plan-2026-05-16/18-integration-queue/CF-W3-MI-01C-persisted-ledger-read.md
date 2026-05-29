# CF-W3-MI-01C - Persisted Signal Position Ledger Read

Date: 2026-05-29

## Status

Accepted for scoped local commit.

## Scope

Second Market Intelligence target-state slice.

Implemented:

- `GET /api/v1/signals/position-ledger/persisted/active`
- `GET /api/v1/signals/position-ledger/persisted/closed`
- Service methods that read only saved `SignalPositionLedgerEntry` rows.
- Trigger Monitor frontend reads moved to persisted-only endpoints.
- UI smoke test guard against legacy materializing GET reads and refresh POST.

Not included:

- Prisma schema or migration changes.
- Backend route registry changes.
- Shared utility or shared UI changes.
- Signal generation, DQ, strategy, or pipeline module changes.
- User navigation change for Trigger Monitor.

## Files Changed

- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `frontend/src/features/signal-position-ledger/api/signalPositionLedgerApi.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`

## TDD Evidence

- QA first added failing tests for `listPersistedActiveRows`, `listPersistedClosedRows`, persisted route registration, and UI use of persisted paths.
- Red run failed on missing service methods and missing route registration before production code changed.
- Production implementation then made the tests pass.

## Validation

- `backend`: `npm.cmd test -- --runTestsByPath tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts --runInBand` passed, 2 suites / 16 tests.
- `backend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run build` passed.
- `frontend`: `npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1 --project=chromium --reporter=list` passed, 2 tests.
- `git diff --check` passed with normal CRLF warnings only.

Temporary Vite process was stopped after UI validation.

## Review Gates

- QA final review: accepted.
- Architect final review: accepted.

## Next Slice

Continue with durable read models for index context and official breadth after this slice is accepted and committed.

# CF-W2-SPL-02 Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Verdict

`Ready for Implementation`

Team 00 promotes `CF-W2-SPL-02 - Signal Position Ledger active positions surface` as a bounded Team 06 implementation slice.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- UX plan: `05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- Architecture review: `03-architecture/CF-W2-SPL-02-architecture-review.md`
- Contract: `06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- Work packet: `08-work-packets/CF-W2-SPL-02-work-packet.md`
- QA plan: `04-qa/CF-W2-SPL-02-qa-plan.md`
- Required accepted dependency: Team 06 branch commit `ca31d79 feat: add signal position ledger read model`
- Open decisions: 2, affecting only `CF-W1-MD-02B` and `CF-W1-DQ-02-RS1`; neither blocks SPL-02.

## Branch And Worktree

- Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
- Required base: branch must keep `ca31d79` as an ancestor and include current `dev` active execution docs before implementation starts.

## Shared File Reservation

Team 00 reserves the shared files below for a single Team 06 writer in this implementation pass:

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`

No other team may edit these files until SPL-02 is handed off, rejected, or explicitly released by Team 00.

## Allowed Implementation Files

Backend:

- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- optional only if direct route-registry coverage is added: `backend/tests/api/routes.test.ts`

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

Reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`

## Forbidden Scope

- closed-history API, rows, counts, mocks, close date, close price, close reason, closed return, durable lifecycle storage, or row-detail routes
- Prisma schema, migrations, generated files, package manifests, lockfiles, shared backend utilities, shared frontend components, shared test helpers unless Team 04 later reserves them
- `frontend/src/app/HomePage.tsx`
- Today Review, Trade Plan, Portfolio, Backtesting, Market Data, Data Quality, provider, live, startup, backfill, scheduler, worker, or queue files
- broker execution, portfolio accounting, realized P/L, target-price, reward/risk, `R:R`, direct buy/sell wording, guarantee wording, or financial-advice framing

## Required Behavior

- Mount the accepted `signalPositionLedgerRouter` so `GET /api/v1/signals/position-ledger/active` is reachable.
- Preserve the accepted active-list DTO shape and query semantics from `CF-W2-SPL-01B`.
- Ensure active rows are ordered by newest entry trigger timestamp before pagination.
- Add a dedicated `/signal-position-ledger` frontend route.
- Add `Signal Position Ledger` to first-class navigation under `Daily Work` after `Today Review`.
- Render `Active Positions` as the default truth-bearing tab.
- Render `Closed History` as placeholder-only with no API call, no rows, no counts, and no inferred closed evidence.
- Use current market scope and reset pagination on scope changes.
- Label any page-local summary counts as `This page`; only `totalCount` may be scope-wide.

## Required Validation

Check memory before build or UI smoke commands.

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

Backend:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
npm.cmd run build
```

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

Language guard:

```powershell
rg -n -i '\b(active trade|active trades|open trade|open trades|closed trade|closed trades|buy|sell|target|profit target|price target|reward/risk|risk:reward|R:R|broker|execution|realized P/L|realized profit|financial advice|must buy|must sell)\b' backend/src/api/routes.ts backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger frontend/src/app/routes.tsx frontend/src/app/navigationMetadata.tsx frontend/src/features/signal-position-ledger frontend/tests/ui/signal-position-ledger.spec.ts
```

## Stop Conditions

Stop and return to Team 00 if implementation needs:

- any forbidden file;
- closed-history proof or API;
- backend aggregates, filters, search, or row-detail semantics;
- schema, package, generated, provider, live, startup, scheduler, or shared UI scope;
- product-language drift into targets, reward/risk, broker execution, advice, or direct action wording;
- a shared-file collision with another active team.

## Next Gate

Team 06 implementation in the dedicated SPL-02 worktree. After developer handoff, route to Team 04 QA Verification.

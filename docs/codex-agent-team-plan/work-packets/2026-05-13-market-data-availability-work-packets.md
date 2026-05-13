# Market Data Availability Work Packets - 2026-05-13

## Scope

This track is the active priority before Cycle 3 feature backlog work. The goal is to make missing market data available inside Market Data Foundation so downstream Signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans consume real current data instead of receiving missing/insufficient-data states.

Cycle 3 backlog is parked until this track reaches Product Owner acceptance or the Product Owner explicitly releases it.

Inputs:

- [PO market data audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [Architect root-cause notes](../architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md)

## MD-A1 - Latest Completed EOD Catch-Up Gate

State: `Ready for Implementation`
Mode: `Implementation Mode`
Owner: Lane 1 Market Data developer
Lane/module: Lane 1, `market-data-foundation`

### Product Goal

When the latest completed daily candle is missing, Market Data must fetch the missing completed EOD data even if the current market session cannot produce a useful new daily candle. The system must not stay stale just because the current session is before open, during market hours with in-progress candles disabled, or otherwise not useful for today's incomplete candle.

### Architecture Contract

- Compare latest stored trading date with `latestCompletedTradingDateForRegion(region, now)`.
- If latest stored trading date is older than the latest completed trading date, the freshness gate must allow a bounded provider fetch capped to the latest completed trading date.
- Preserve the rule that EOD review workflows do not fetch in-progress current-session candles.
- Preserve `FINAL_CANDLE_CONFIRMED`, cooldown, weekend/holiday, and explicit force semantics when the latest completed candle is already current.
- Do not change downstream Signal, Strategy, Today Review, or Trade Plan logic in this packet.
- Do not add paid providers, paid services, hosted tooling, broker integrations, or advice wording.

### Reserved Write Scope

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts` only if a helper is needed
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts` only if session helper behavior changes
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- Task evidence docs under `docs/codex-agent-team-plan`

Forbidden scope:

- Downstream module code
- Prisma schema/migrations
- Frontend UI unless QA finds the backend contract cannot be observed
- Package/dependency changes

### Acceptance Criteria

- A manual or scheduled sync does not skip provider fetches with `MARKET_CLOSED_NO_NEW_DAILY_DATA`, `MARKET_OPEN`, or `BEFORE_MARKET_OPEN` when `latestStoredTradingDate < latestCompletedTradingDateForRegion(region, now)`.
- The provider fetch end date is capped to the latest completed trading date for catch-up, not the current in-progress trading day.
- Final-confirmed current candles still skip.
- Recent cooldown still skips when the latest completed candle is already stored.
- Weekends/holidays remain skipped unless the prior completed candle is genuinely missing and the selected function is explicitly allowed to catch up safely.
- Tests cover before-open, market-open, and market-closed-no-sync catch-up cases for `IN / STOCK`.
- Existing market-data service/session tests pass.
- Handoff explains how this fixes the observed case: latest completed candle `2026-05-12` missing while latest stored candle was `2026-05-11`.

### Developer Validation Before QA

- `npm test -- market-data.service.test.ts market-data.market-session.test.ts --runInBand`
- If the focused test command is not available, run the closest market-data backend test subset and record the exact command.

### QA Gate

QA validates:

- Focused tests prove fetch is allowed for missing completed EOD catch-up.
- Regression tests prove final-confirmed/recently-synced/no-in-progress behavior still holds.
- No downstream module workaround was introduced.
- Documentation and handoff mention data availability improvement, not validation-message-only work.

## MD-A2 - Sync Catalog Progress And Bulk Performance

State: `PO Accepted`
Mode: `GitHub Check-In`
Owner: Senior Fullstack Lead / Orchestrator
Lane/module: Lane 1, `market-data-foundation`

Architecture contract: [MD-A2 sync catalog performance contract](../architecture-contracts/2026-05-13-md-a2-sync-catalog-performance-contract.md)
Developer handoff: [MD-A2 developer handoff](../developer-handoffs/2026-05-13-md-a2-developer-handoff.md)
QA plan: [MD-A2 QA plan](../qa-plans/2026-05-13-md-a2-sync-catalog-performance-qa-plan.md)
QA evidence: [MD-A2 QA evidence](../qa-evidence/2026-05-13-md-a2-qa-evidence.md)
Lead validation: [MD-A2 Lead validation](../lead-validation/2026-05-13-md-a2-lead-validation.md)
Architect signoff: [MD-A2 Architect signoff](../architecture-signoff/2026-05-13-md-a2-architect-signoff.md)
PO acceptance: [MD-A2 PO acceptance](../po-acceptance/2026-05-13-md-a2-po-acceptance.md)

### Product Goal

Sync Catalog must not run for hours behind one frontend button without a progress bar. The user must see immediate feedback, bounded progress, partial results, and a safe way for the system to continue through batches without blocking the UI on one long request.

### Acceptance Direction

- Audit the current Sync Catalog frontend and backend path end to end.
- Identify why the operation can run for hours.
- Replace or wrap long synchronous work with bounded batches, a worker/job run, or resumable status polling.
- Show immediate button feedback, determinate progress when totals are known, counts for processed/inserted/updated/skipped/no-op/failed/warnings, and final/partial summary.
- Use safe parallelism only through one coordinated strategy. Provider-facing throttles remain server-owned.
- Do not start unbounded full-universe provider calls from a single UI request.
- Preserve `region` and `assetType` scope on every request.
- QA must verify progress behavior and that the operation cannot silently run for hours without user-visible state.

### Reserved Write Scope

Backend coordinator/API:

- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- Focused backend tests under `backend/tests/modules/market-data-foundation/`

Frontend progress UX:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden scope:

- Prisma schema/migrations unless architecture is reopened.
- Paid libraries, paid providers, paid hosted queues, broker APIs, or external worker services.
- Downstream Signals, Strategy, Today Review, Trade Plan, Portfolio, Watchlist, or Alert module behavior.

### Developer Validation Before QA

- Backend: focused market-data backend tests for sync-run start/status/cancel and bounds.
- Frontend: focused mocked UI tests for progress/cancel/partial/continue plus build validation when resource limits allow.
- Handoff must include exact commands, results, skipped checks, and performance/progress evidence.

## Later Packets Parked Behind MD-A2

1. **MD-A3 - Deep Price Backfill For Supported Shallow Rows**
   Ensure supported rows with shallow history fetch enough OHLCV depth for Trusted Review Lite and 200/252-bar downstream users.
2. **MD-A4 - Provider Validation Drain And Retry Classification**
   Drain `UNKNOWN` and retryable provider rows into clear supported/unsupported/retry states.
3. **MD-A5 - Catalog Identity And Manual CSV Repair Hardening**
   Fix deterministic provider symbol, ISIN, listing-date, and exchange identity gaps using public/local sources.
4. **MD-A6 - Holiday/Session Accuracy**
   Prevent false stale-EOD blockers caused by missing local holiday knowledge.
5. **MD-A7 - Adjusted-Close And Volume Coverage Honesty**
   Preserve volume and adjusted-close provenance so trusted review uses reliable OHLCV.

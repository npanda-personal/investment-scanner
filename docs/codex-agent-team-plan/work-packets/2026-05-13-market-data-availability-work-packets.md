# Market Data Availability Work Packets - 2026-05-13

## Scope

This track is the active priority before Cycle 3 feature backlog work. The goal is to make missing market data available inside Market Data Foundation so downstream Signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans consume real current data instead of receiving missing/insufficient-data states.

Cycle 3 backlog is parked until this track reaches Product Owner acceptance or the Product Owner explicitly releases it.

Market Data is the active release blocker. After Market Data Foundation reaches PO acceptance, QA must run the Data Quality Engine validation gate before downstream Signals, Decisions, Backtests, Today Review, Research, or Trade Plan work reopens. The Data Quality Engine gate proves the repaired OHLCV and metadata are usable for downstream scoring instead of merely present in storage.

Current accepted remediation:

- Provider business metadata repair parallelism evidence: [QA](../qa-evidence/2026-05-13-market-data-provider-metadata-parallelism-qa-evidence.md), [Lead validation](../lead-validation/2026-05-13-market-data-provider-metadata-parallelism-lead-validation.md), [Architect signoff](../architecture-signoff/2026-05-13-market-data-provider-metadata-parallelism-architect-signoff.md), [PO acceptance](../po-acceptance/2026-05-13-market-data-provider-metadata-parallelism-po-acceptance.md), [GitHub check-in](../github-check-in/2026-05-13-market-data-provider-metadata-parallelism-github-check-in.md).
- Price backfill drain no-progress fix: [QA](../qa-evidence/2026-05-13-market-data-price-backfill-drain-qa-evidence.md), [Lead validation](../lead-validation/2026-05-13-market-data-price-backfill-drain-lead-validation.md), [Architect signoff](../architecture-signoff/2026-05-13-market-data-price-backfill-drain-architect-signoff.md), [PO acceptance](../po-acceptance/2026-05-13-market-data-price-backfill-drain-po-acceptance.md), [GitHub check-in](../github-check-in/2026-05-13-market-data-price-backfill-drain-github-check-in.md).
- DQE stored-context fix: [QA](../qa-evidence/2026-05-13-dqe-stored-context-qa-evidence.md), [Lead validation](../lead-validation/2026-05-13-dqe-stored-context-lead-validation.md), [Architect signoff](../architecture-signoff/2026-05-13-dqe-stored-context-architect-signoff.md), [PO acceptance](../po-acceptance/2026-05-13-dqe-stored-context-po-acceptance.md), [GitHub check-in](../github-check-in/2026-05-13-dqe-stored-context-github-check-in.md).
- Remaining DQE bottleneck scan: [Market Data remaining DQE bottleneck scan](../po-audits/2026-05-13-market-data-remaining-dqe-bottleneck-scan.md).

Inputs:

- [PO market data audit](../po-audits/2026-05-13-market-data-data-availability-audit.md)
- [PO missing-data root-cause audit](../po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md)
- [Architect root-cause notes](../architecture-contracts/2026-05-13-market-data-availability-root-cause-notes.md)
- [Architect missing-data root-cause audit](../architecture-contracts/2026-05-13-market-data-missing-data-architecture-audit.md)

## MD-A1 - Latest Completed EOD Catch-Up Gate

State: `Released`
Mode: `Released`
Owner: Senior Fullstack Lead / Orchestrator
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

State: `Released`
Mode: `Released`
Owner: Senior Fullstack Lead / Orchestrator
Lane/module: Lane 1, `market-data-foundation`

Architecture contract: [MD-A2 sync catalog performance contract](../architecture-contracts/2026-05-13-md-a2-sync-catalog-performance-contract.md)
Developer handoff: [MD-A2 developer handoff](../developer-handoffs/2026-05-13-md-a2-developer-handoff.md)
QA plan: [MD-A2 QA plan](../qa-plans/2026-05-13-md-a2-sync-catalog-performance-qa-plan.md)
QA evidence: [MD-A2 QA evidence](../qa-evidence/2026-05-13-md-a2-qa-evidence.md)
Lead validation: [MD-A2 Lead validation](../lead-validation/2026-05-13-md-a2-lead-validation.md)
Architect signoff: [MD-A2 Architect signoff](../architecture-signoff/2026-05-13-md-a2-architect-signoff.md)
PO acceptance: [MD-A2 PO acceptance](../po-acceptance/2026-05-13-md-a2-po-acceptance.md)
GitHub check-in: [MD-A2 GitHub check-in](../github-check-in/2026-05-13-md-a2-github-check-in.md)

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

## MD-A3 - Deep Price Backfill For Supported Shallow Rows

State: `Released`
Mode: `Released`
Owner: Senior Fullstack Lead / Orchestrator
Lane/module: Lane 1, `market-data-foundation`

Product brief: [MD-A3 product brief](../po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md)
Architecture contract: [MD-A3 architecture contract](../architecture-contracts/2026-05-13-md-a3-deep-price-backfill-contract.md)
QA plan: [MD-A3 QA plan](../qa-plans/2026-05-13-md-a3-deep-price-backfill-qa-plan.md)
Developer handoff: [MD-A3 developer handoff](../developer-handoffs/2026-05-13-md-a3-developer-handoff.md)
QA evidence: [MD-A3 QA evidence](../qa-evidence/2026-05-13-md-a3-deep-price-backfill-qa-evidence.md)
Lead validation: [MD-A3 Lead validation](../lead-validation/2026-05-13-md-a3-lead-validation.md)
Architect signoff: [MD-A3 Architect signoff](../architecture-signoff/2026-05-13-md-a3-architect-signoff.md)
PO acceptance: [MD-A3 PO acceptance](../po-acceptance/2026-05-13-md-a3-po-acceptance.md)
GitHub check-in: [MD-A3 GitHub check-in](../github-check-in/2026-05-13-md-a3-github-check-in.md)

### Product Goal

Provider-supported shallow rows must be deep-backfilled to useful OHLCV depth without requiring the operator to know or set `fullReload`. The repair action must make data available for Trusted Review Lite and deeper 200/252-bar consumers while staying bounded and capped to latest completed EOD.

### Acceptance Direction

- Harden the existing bounded `BACKFILL_PRICES` repair lane; do not add a second price-backfill subsystem.
- Automatically use deep history repair for supported rows below required depth.
- Preserve latest completed EOD cap and avoid in-progress daily candles.
- Expose machine-readable diagnostics for rows received/inserted/updated/no-op, zero-row provider returns, deep reloads, incremental catch-up, remaining candidates, target EOD/end date, and still-under-120/200/252 counts.
- Keep UI action simple: `Backfill prices` remains the normal workflow and must not expose a normal `fullReload` toggle.
- QA must prove the fix with automated tests and bounded live/local evidence.

### Reserved Write Scope

Backend policy/diagnostics:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- Focused backend tests under `backend/tests/modules/market-data-foundation/`

Frontend evidence display:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden scope:

- Prisma schema/migrations unless architecture is reopened.
- Paid providers, paid services, hosted queues, broker APIs, or live trading integrations.
- Downstream Signals, Strategy, Today Review, Trade Plan, Portfolio, Watchlist, or Alert gate relaxation.

### Developer Validation Before QA

- Backend: focused Market Data tests covering deep repair without `fullReload`, latest completed EOD cap, zero-row diagnostics, and adjusted-close honesty.
- Frontend: focused UI tests proving normal payload excludes `fullReload` and repair summary shows deep-backfill diagnostics.
- Build validation for touched projects when resource limits allow.

## MD-A4 - Provider Validation Drain And Retry Classification

State: `Released`
Mode: none
Owner: Lane 1 backend and frontend workers, coordinated by Senior Fullstack Lead / Orchestrator
Lane/module: Lane 1, `market-data-foundation`

Product brief: [MD-A4 product brief](../po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md)
Architecture contract: [MD-A4 architecture contract](../architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md)
QA plan: [MD-A4 QA plan](../qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md)
Developer handoff: [MD-A4 developer handoff](../developer-handoffs/2026-05-13-md-a4-developer-handoff.md)
QA evidence: [MD-A4 QA evidence](../qa-evidence/2026-05-13-md-a4-provider-validation-drain-qa-evidence.md)
Lead validation: [MD-A4 Lead validation](../lead-validation/2026-05-13-md-a4-lead-validation.md)
Architect signoff: [MD-A4 Architect signoff](../architecture-signoff/2026-05-13-md-a4-architect-signoff.md)
PO acceptance: [MD-A4 PO acceptance](../po-acceptance/2026-05-13-md-a4-po-acceptance.md)
GitHub check-in: [MD-A4 GitHub check-in](../github-check-in/2026-05-13-md-a4-github-check-in.md)

### Product Goal

Provider validation must classify `IN / STOCK` rows into useful states so valid stocks can enter MD-A3 price backfill and invalid or blocked stocks stop hiding inside generic unknown/retry counts.

### Acceptance Direction

- Drain `UNKNOWN_FIRST` before retrying failed provider validations.
- Use durable provider-validation repair attempts/states for retryable, retry-blocked, manual-required, unsupported, and supported outcomes.
- Validate over a completed-EOD-safe wide window for Indian stocks.
- If Yahoo is insufficient, switch to or surface a required approved free source fallback before accepting missing data. Preferred fallback direction is NSE/BSE official/public EOD bhavcopy data; paid providers and paid-provider free tiers are not approved.
- Treat 15 years of daily OHLCV as the default required history window for every active stock. For companies listed less than 15 years ago, require full daily OHLCV from listing date through latest completed EOD.
- Keep provider calls bounded, timed, and visible with progress/result diagnostics.
- Exclude unsupported/manual/retry-blocked rows from supported-only metadata and price blockers.
- Preserve fail-closed downstream trust gates.

### Reserved Write Scope

Backend provider taxonomy/state:

- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- focused backend tests under `backend/tests/modules/market-data-foundation/`

Frontend evidence display:

- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx` only if row evidence display is needed
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden scope:

- Prisma schema/migrations unless architecture is reopened.
- Paid providers, paid services, hosted queues, broker APIs, or live trading integrations.
- Downstream gate relaxation.

### Developer Validation Before QA

- Backend: focused Market Data service/repository/provider tests plus backend build.
- Frontend: focused mocked UI tests plus frontend build.
- Handoff must include exact commands, results, skipped checks, and performance/progress evidence.

### Acceptance Evidence

- Backend focused tests passed: 3 suites / 138 tests.
- Backend build passed.
- Frontend build passed.
- Focused Market Data UI smoke passed: 8/8.
- `git diff --check` passed with line-ending warnings only.
- PO accepted MD-A4 and the scoped implementation commit was pushed to `origin/dev` at `89ebe8e`. MD-A5 remains the next required implementation to actually populate 15-year/listing-date OHLCV and free-source fallback data.

## MD-A5 - 15-Year History And Free-Source Fallback

State: `Released`
Mode: `Implementation Mode`
Owner: Senior Fullstack Lead / Orchestrator
Lane/module: Lane 1, `market-data-foundation`

Product brief: [MD-A5 product brief](../po-briefs/2026-05-13-md-a5-15-year-history-and-free-source-fallback-product-brief.md)
Architecture contract: [MD-A5 architecture contract](../architecture-contracts/2026-05-13-md-a5-15-year-history-and-free-source-fallback-contract.md)
QA plan: [MD-A5 QA plan](../qa-plans/2026-05-13-md-a5-15-year-history-and-free-source-fallback-qa-plan.md)
QA evidence: [MD-A5 QA evidence](../qa-evidence/2026-05-13-md-a5-15-year-history-and-free-source-fallback-qa-evidence.md)
Lead validation: [MD-A5 Lead validation](../lead-validation/2026-05-13-md-a5-lead-validation.md)
Architect signoff: [MD-A5 Architect signoff](../architecture-signoff/2026-05-13-md-a5-architect-signoff.md)
PO acceptance: [MD-A5 PO acceptance](../po-acceptance/2026-05-13-md-a5-po-acceptance.md)
GitHub check-in: [MD-A5 GitHub check-in](../github-check-in/2026-05-13-md-a5-github-check-in.md)

### Product Goal

Guarantee that every active `IN / STOCK` has daily OHLCV for the required history window through the latest completed EOD: 15 years for older listings, or listing-date-to-latest completed EOD when listed more recently. If Yahoo is shallow, missing, stale, throttled, or otherwise insufficient, MD-A5 must use or queue a free official/public fallback before accepting missing data. Paid providers, paid APIs, broker APIs, paid hosted services, and commercial free-tier providers are not approved by default.

### Active Lane Split

| Packet | Current State | Mode | Owner | Reserved Write Scope | Dependency / Next Action |
|---|---|---|---|---|---|
| MD-A5-BE-1 Required history-window computation and coverage diagnostics | `Released` |  | Senior Fullstack Lead / Orchestrator | `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`, `market-data-foundation.repository.ts`, `market-data-foundation.types.ts`, focused backend Market Data tests | Released to `origin/dev` at `22db47a`. |
| MD-A5-BE-2 Official/public exchange EOD source adapters and local cache | `Released` |  | Senior Fullstack Lead / Orchestrator | `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`, focused adapter tests, fallback integration in service | Released to `origin/dev` at `22db47a`; BSE automatic download remains future/configured-source work. |
| MD-A5-BE-3 Repair-run integration and provenance persistence | `Released` |  | Senior Fullstack Lead / Orchestrator | `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`, `market-data-foundation.repository.ts`, `market-data-foundation.types.ts`, focused backend tests | Released to `origin/dev` at `22db47a`; full active-universe drain remains bounded operational work. |
| MD-A5-FE-1 Market Data UI evidence for full-window coverage and fallback | `Released` |  | Senior Fullstack Lead / Orchestrator | `frontend/src/features/market-data-foundation/types.ts`, `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`, `frontend/tests/ui/market-data-foundation.spec.ts` | Released to `origin/dev` at `22db47a`. |
| MD-A5-QA-1 Validation evidence | `Released` |  | Senior Fullstack Lead / Orchestrator | [MD-A5 QA evidence](../qa-evidence/2026-05-13-md-a5-15-year-history-and-free-source-fallback-qa-evidence.md), [Lead validation](../lead-validation/2026-05-13-md-a5-lead-validation.md), [Architect signoff](../architecture-signoff/2026-05-13-md-a5-architect-signoff.md), [PO acceptance](../po-acceptance/2026-05-13-md-a5-po-acceptance.md), [GitHub check-in](../github-check-in/2026-05-13-md-a5-github-check-in.md) | Released to `origin/dev` at `22db47a`. |

### Operating Rules

- Every started or resumed MD-A5 agent must receive explicit instructions immediately: current mode, work item, owned files, forbidden files, expected artifact or handoff, validation expectations, and blocker protocol.
- No MD-A5 agent may remain in `awaiting-instruction` state. The Orchestrator or Deputy must assign work, close the agent, or record a blocker with owner and next action.
- Shared files must have one writing owner at a time. BE-1 and BE-3 overlap on service/repository/types and must be serialized or assigned to the same backend owner.
- The hard product rule is not negotiable: every active `IN / STOCK` must have 15 years of daily OHLCV, or listing-date-to-latest daily OHLCV if listed more recently; Yahoo insufficiency requires a free official/public fallback path before missing data is accepted.

## Later Packets Parked Behind MD-A5

1. **MD-A6 - Catalog Identity And Manual CSV Repair Hardening**
   Fix deterministic provider symbol, ISIN, listing-date, and exchange identity gaps using public/local sources.
2. **MD-A7 - Holiday/Session Accuracy**
   Prevent false stale-EOD blockers caused by missing local holiday knowledge.
3. **MD-A8 - Adjusted-Close And Volume Coverage Honesty**
   Preserve volume and adjusted-close provenance so trusted review uses reliable OHLCV.

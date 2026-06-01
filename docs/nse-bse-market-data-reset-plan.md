# NSE/BSE Market Data Foundation Reset Plan

Date: 2026-06-01

## Current Implementation Status

Active implementation now follows the full reset path for Market Data Foundation:

- Yahoo/yfinance and Angel One provider implementation files are removed.
- The backend package manifest and lockfile no longer include `yahoo-finance2`.
- Legacy provider routes are temporarily retained as compatibility endpoints, but they return explicit `410 EXTERNAL_PROVIDER_DISABLED_NSE_BSE_ONLY` responses.
- Market Data Foundation operator UI no longer exposes provider validation, provider price backfill, per-instrument provider sync, or the legacy Data Ingestion page.
- Operator UI exposes historical exchange backfill, manual verified fundamentals import, and source-file import evidence.
- Provider cleanup report/execute remains available until provider-era database cleanup is accepted.

## Purpose

Reset the current market-data implementation to the approved NSE/BSE-only design.

The current repository already has exchange-file import work in place, but the older provider-era surface is still visible in routes, UI controls, types, tests, docs, and package dependencies. This plan is split into a minimum working Market Data Foundation milestone first, followed by cleanup/removal slices after replacement behavior is tested and signed off.

## Scope Boundary

This reset is scoped to Market Data Foundation only.

Allowed implementation scope:

- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `frontend/src/features/market-data-foundation/**`
- `frontend/tests/ui/market-data-foundation*.spec.ts`
- Market Data Foundation documentation
- Package dependency removal only if it is solely tied to Market Data Foundation provider code and separately approved

Allowed read-only / validation scope:

- Pipeline Ops may be inspected to understand current operator controls.
- Pipeline orchestration may be inspected to understand current market-data command integration.
- Trader pages may be smoke-tested only to confirm they still read persisted market data.

Forbidden in this reset unless separately approved:

- Editing Pipeline Ops source.
- Editing Pipeline Orchestration source.
- Editing Data Quality, Signals, Calibration, Strategy, Backtests, Smart Money, Research, Today Review, Ledger, Portfolio, Watchlist, Alerts, Auth, Subscription, or Notifications modules.
- Editing shared UI components.
- Editing route registries outside Market Data Foundation routes.
- Editing Prisma schema/migrations.
- Editing package manifests without explicit approval.

If a required fix is discovered outside Market Data Foundation, record it as a follow-up requirement or architecture packet. Do not broaden this reset silently.

## Immediate Milestone: Minimum Working NSE Daily Import

The current goal is to prove that Market Data Foundation can fetch one official NSE daily stock file, save it correctly, rebuild latest price, and make the saved data readable. This is intentionally smaller than the full reset, but it is still a real end-to-end market-data slice.

End-to-end market data for this milestone means:

```text
manual trigger -> fetch exchange data -> parse -> save candles to DB -> rebuild LatestPrice -> verify saved data is readable
```

Must-have behavior:

- Run one backend command/API for one valid trading date.
- Fetch NSE CM UDiFF Bhavcopy for that trading date.
- Parse daily stock OHLCV rows.
- Save rows into the existing daily candle table.
- Store rows by stable identity such as exchange, symbol or security code, trading date, timeframe, and source.
- Re-running the same trading date must not create duplicates.
- Rebuild or update `LatestPrice` from the imported exchange candles.
- Return a clear import summary: rows read, accepted, inserted, updated or skipped, rejected, and failed.
- Handle file-missing, parse, and DB-save failures with clear errors.
- Confirm required DB migrations are applied in the dev DB before validation.
- Validate in the local DB that rows were saved.
- Validate saved rows are readable through the relevant Market Data Foundation DB/API read path.
- Prove this import path does not call Yahoo, yfinance, Angel One, broker APIs, or provider fallback code.

Minimum definition of done:

1. The backend command/API runs for one real completed trading date.
2. NSE CM UDiFF rows are fetched and parsed.
3. Daily OHLCV stock rows are persisted.
4. A rerun is idempotent.
5. `LatestPrice` is rebuilt or updated from the imported candles.
6. The response returns useful counts and errors.
7. A DB/API read confirms persisted candles and latest prices.
8. Provider paths are not called.

Not required for this immediate milestone:

- BSE backup fill.
- Historical backfill.
- Source discovery beyond building the known date URL/path.
- Trading calendar automation.
- Index/sector import.
- Delivery import.
- F&O import.
- Manual fundamentals import.
- Operator UI.
- Scheduler/startup catch-up.
- Full provider package deletion.
- Trader page freshness display.
- Advanced data quality.

Keep if already implemented, but do not expand in this milestone:

- `SourceFileImport` ledger.
- `PriceTick.sourceFileImportId` provenance.
- Basic `InstrumentExchangeIdentity`.
- Minimal pipeline ledger evidence.
- Focused provider-block tests for the new import path.

## Current Direction

Approved active sources:

- NSE CM UDiFF Bhavcopy
- BSE BhavCopy as fill-only backup
- NSE delivery data
- NSE F&O UDiFF enrichment
- NSE/BSE official filings or manually verified fundamentals

Forbidden active sources:

- Yahoo Finance
- yfinance
- Angel One
- broker APIs
- Screener scraping
- provider fallback if exchange files are missing

Screener may be used only by the human Product Owner for manual validation before importing verified evidence.

## Keep

- `SourceFileImport` and its migrations.
- `InstrumentExchangeIdentity` and its migrations.
- `PriceTick.sourceFileImportId` provenance.
- NSE CM UDiFF daily import path.
- BSE CM backup fill-only import path.
- NSE index/sector index import path.
- NSE delivery import path.
- NSE F&O enrichment import path.
- Manual verified fundamentals import path.
- Provider cleanup report and execution path until provider cleanup is complete and auditable.
- Existing pipeline orchestration and Pipeline Ops behavior remains untouched in this reset.
- Trader-facing Market Intelligence pages, provided they read persisted data only.
- User-owned portfolios, watchlists, alerts, notes, preferences, and account data.

## Remove Or Quarantine

These are not aligned with the NSE/BSE-only design and should be removed from active runtime after TDD coverage is in place.

Backend runtime routes:

- `GET /market-data-foundation/stocks/yahoo-search`
- `POST /market-data-foundation/stocks/:id/sync`
- `POST /market-data-foundation/stocks/sync-all`
- `POST /market-data-foundation/data/ingest`
- `POST /v1/market-data/provider/validate`
- `POST /v1/market-data/metadata/provider-business/repair`
- `POST /v1/market-data/metadata/enrich`
- `POST /v1/market-data/prices/backfill`
- `POST /v1/market-data/prices/backfill-runs`
- `GET /v1/market-data/prices/backfill-active-run`
- `GET /v1/market-data/prices/backfill-runs/active`
- `GET /v1/market-data/prices/backfill-runs/:runId`
- `POST /v1/market-data/prices/backfill-runs/:runId/cancel`
- `POST /v1/ingestion/sync`
- `POST /v1/fx-rates/sync` if it depends on Yahoo-derived FX rates

Backend code candidates:

- `market-data-foundation.provider.ts`
- `market-data-foundation.angel-one-provider.ts`
- Provider validation logic below the disabled returns in `market-data-foundation.service.ts`
- Provider business metadata repair logic
- Provider historical candle backfill worker/run logic
- Provider fallback branches in ingestion, FX, fundamentals, corporate actions, and repair-plan code
- Provider package dependency `yahoo-finance2` from `backend/package.json` and lockfile, after compile references are gone

Frontend UI/API candidates:

- Yahoo search API usage.
- Instrument-level `Sync Prices`.
- Catalog import `Provider Validation` selector.
- Price backfill banners, controls, polling, and active-run UI.
- Provider validation and provider business repair cards.
- Provider support counts as readiness drivers.
- Provider timing, provider retry, provider fallback, and Yahoo/Angel wording.
- Legacy Data Ingestion page if it only runs provider sync.
- Direct operator routes outside `/admin/*`, after compatibility policy is decided.

Test candidates:

- Provider implementation tests should be removed or rewritten as provider-blocking tests.
- Provider-era UI tests should be rewritten around exchange import, historical backfill, manual fundamentals, and disabled-provider assertions.
- Skipped provider-era tests should be removed or replaced; skipped tests must not remain as hidden debt for the new design.

Docs candidates:

- Provider-heavy roadmap/module-verification language.
- Historical `docs/codex-agent-team-plan/**` remains historical evidence only and should not be updated as active authority.
- Active docs should state NSE/BSE-only source policy and the new operator workflow.

## Later Build Scope

After the immediate backend import milestone passes, Market Data Foundation UI should expose the workflows needed to run and validate the new data foundation end to end.

Market Data Foundation operator UI must support:

- Run historical exchange candle backfill with date range, `maxDates`, and BSE fill toggle.
- Import manual verified fundamentals.
- Show SourceFileImport evidence by source, segment, trading date, status, row counts, hash, and imported time.
- Show provider cleanup evidence until cleanup is fully accepted.
- Show exchange-only data coverage and latest price provenance.

Market Data Ops must support:

- Import/update NSE/BSE catalog identity.
- View exchange identities per instrument.
- View latest source file evidence and latest price provenance.
- View exchange-only data quality and coverage.
- Avoid provider support language in primary readiness.

Trader pages must:

- Read persisted data only.
- Never trigger exchange import, sync, refresh, repair, evaluation, generation, calibration, or backfill.
- Show latest data-through date and source freshness.
- Show domain empty states when exchange data is missing.

Pipeline Ops and downstream module orchestration remain follow-up work unless separately approved.

## TDD First

QA writes failing tests before implementation.

Immediate backend red tests:

- One-date NSE CM import saves daily OHLCV rows.
- Re-running the same import is idempotent and does not duplicate candles.
- One-date NSE CM import rebuilds or updates `LatestPrice` from the imported candles.
- Import summary reports read, accepted, inserted, updated/skipped, rejected, and failed counts.
- File-missing, parser, and DB-save failures return clear errors.
- The one-date import path does not instantiate or call Yahoo/Angel provider classes.
- A DB/API read after import returns saved candles and latest prices for the requested date/source.

Later backend red tests:

- Removed provider routes return `404` or explicit disabled response, according to the route-removal decision.
- Scheduler, startup, daily pipeline, manual pipeline command, repair, fundamentals import, and historical backfill do not instantiate or call Yahoo/Angel provider classes.
- `yahoo-finance2` is not imported by reachable market-data runtime code.
- Daily pipeline uses exchange-file import path only.
- Historical backfill is date-first, resumable, idempotent, and creates `SourceFileImport` rows.
- BSE fill inserts only when an NSE candle is missing and an exchange identity match exists.
- `PriceTick.sourceFileImportId` is present for imported exchange candles.
- `LatestPrice` rebuild uses only NSE/BSE source candles.
- Provider cleanup report returns zero active Yahoo/Angel rows after execution.

Later frontend red tests:

- Market Data Ops has no provider validation or provider backfill controls.
- Market Data Ops exposes historical backfill and manual fundamentals import.
- Market Data Ops shows SourceFileImport evidence for NSE CM, BSE CM, index, delivery, and F&O when available.
- Historical backfill UI submits the approved `/api/v1/market-data/exchange-files/historical-backfill` request shape.

Read-only smoke checks may inspect Market Pulse, Daily Review, and Instrument Workspace to ensure this reset did not break persisted market-data reads, but this reset must not edit those modules or their tests.

## Implementation Slices

### Slice 0: Minimum NSE Daily Import

- Add QA red tests for one-date NSE CM UDiFF import, persistence, idempotency, summary counts, and provider non-use.
- Implement or tighten the Market Data Foundation backend command/API for one trading date.
- Fetch or load the NSE CM UDiFF file for the requested date.
- Parse only daily stock OHLCV rows needed for the first working import.
- Save/upsert candles using existing Market Data Foundation persistence.
- Rebuild/update `LatestPrice` from imported exchange candles.
- Return import summary counts and rejected-row evidence.
- Verify DB migrations are applied before live validation.
- Run focused Market Data Foundation tests and backend build.
- Run one local real-date validation and query the DB/API for saved candles and latest prices.
- Record QA, code review, and Architect signoff for this minimum working milestone.

No provider deletion happens in Slice 0 unless it is required to prove the import path does not call providers.

## Mandatory Change-Then-Delete Workflow

This reset must not delete provider-era code first and then discover missing replacement behavior later.

Every removal area follows this order:

1. Implement replacement NSE/BSE-only behavior or operator UI.
2. Run focused tests and build checks for the replacement.
3. Record QA, code review, and Architect signoff for the replacement behavior.
4. Delete or quarantine the now-obsolete provider-era code/UI/tests/docs.
5. Run the focused tests and build checks again after deletion.
6. Record QA, code review, and Architect signoff for the deletion pass.
7. Only then mark the slice complete.

Accidental deletion rule:

- If a file or behavior is deleted accidentally during a slice, stop that slice.
- Restore the accidentally deleted tracked file from the unstaged worktree or Git index before continuing.
- If the file was untracked, recover it from the editor/working copy backup if available and record the incident.
- Re-run the affected focused tests after restore.
- Do not continue broad cleanup until the restored file and intended deletion list are reconciled.

Deletion is a separate quality gate, not part of the same unchecked edit that adds replacement behavior.

### Slice 1: Provider Runtime Removal Contract

- Add QA red tests for route blocking and provider non-use.
- Decide route behavior: remove routes with `404`, or keep explicit disabled responses temporarily.
- Remove provider constructors from `MarketDataFoundationService`.
- Remove active imports of Yahoo/Angel provider classes from reachable runtime.
- Keep provider cleanup route until cleanup evidence is complete.
- Run backend focused tests and build.
- Record replacement signoff before deleting runtime provider files.
- After deleting runtime provider files, run the focused tests/build again and record deletion signoff.

### Slice 2: Operator UI Control Replacement

- Remove provider-era controls from Market Data Ops.
- Add Historical Exchange Backfill control to Market Data Ops.
- Add Manual Verified Fundamentals import control.
- Add SourceFileImport evidence panel.
- Update Playwright tests first, then implement UI.
- Run frontend build and focused UI smoke.
- Record replacement signoff before deleting old provider UI controls/API helpers.
- After deleting old controls/helpers, run focused UI smoke and frontend build again and record deletion signoff.

### Slice 3: Market Data Foundation Backend Completion

- Add or expose Market Data Foundation source-file evidence reads if missing.
- Ensure historical backfill and manual verified fundamentals are available through Market Data Foundation APIs and UI.
- Ensure provider cleanup report/execute remains available until accepted cleanup evidence is recorded.
- Run Market Data Foundation focused tests and backend build.
- Record replacement signoff before deleting legacy provider assumptions.
- After deleting legacy provider assumptions, run Market Data Foundation focused tests/build again and record deletion signoff.

### Slice 4: Cleanup Provider Package And Dead Code

- Remove `yahoo-finance2` from backend package manifest and lockfile after no runtime/test imports remain.
- Delete provider files only after route, service, repository, and test imports are gone.
- Delete or rewrite provider-era tests.
- Run backend install/build/test verification.
- Treat package/file deletion as its own signoff gate.
- If package removal breaks build unexpectedly, restore the package manifest/lockfile changes immediately, document the remaining import, and resume from the replacement step.

### Slice 5: Later Live Local Validation

Use a real completed trading date with available NSE/BSE files.

Verify:

- DB migrations are applied.
- Backend starts cleanly.
- Daily exchange pipeline runs for one trading date.
- `SourceFileImport` rows exist for enabled imports.
- `PriceTick.sourceFileImportId` is populated.
- `LatestPrice` is rebuilt from exchange candles.
- BSE fills only missing NSE rows.
- Index/sector rows import.
- Delivery snapshots import.
- DQ stage reports correct terminal status.
- Historical backfill runs a small date range and resumes after interruption.
- Market Data Foundation UI can run historical backfill and manual fundamentals import.
- Existing trader pages still render persisted market-data reads in smoke validation, with no code changes in those modules.
- Focused backend, frontend, and UI smoke tests pass.

## Definition Of Done

Immediate milestone done means:

- One real-date NSE CM import runs successfully.
- OHLCV candles are saved in the DB.
- Re-running the same date is idempotent.
- `LatestPrice` is rebuilt or updated from imported exchange candles.
- Summary counts are honest and useful.
- Missing-file, parse, and DB-save failures are reported clearly.
- The import path does not call Yahoo, yfinance, Angel One, broker APIs, or provider fallback code.
- The saved candles and latest prices are readable from the Market Data Foundation DB/API path.
- Focused Market Data Foundation tests and backend build pass.

## Current Validation Status - 2026-06-01

Immediate NSE CM import milestone is validated.

Completed evidence:

- Prisma migration status was checked against the local dev database and reported schema up to date with 28 migrations.
- Focused backend tests passed:
  - `npm.cmd test -- market-data.provider.test.ts market-data.routes.test.ts market-data.repository.test.ts market-data.exchange-eod-adapter.test.ts market-data-readiness-evidence.invariants.test.ts --runInBand`
  - `npm.cmd test -- market-data.service.test.ts --runInBand`
  - `npm.cmd test -- market-data.provider.test.ts market-data.routes.test.ts market-data.service.test.ts --runInBand`
- Backend build passed with `npm.cmd run build`.
- Frontend build passed with `npm.cmd run build`.
- Focused Market Data Foundation UI smoke passed:
  - `npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1 --output=tmp-market-data-test-results`
- Live local backend validation ran against Postgres on port `3002` with scheduler/startup market-data jobs disabled.
- `POST /api/v1/market-data/exchange-files/nse-cm-udiff/import` returned `COMPLETED` for a two-row NSE CM UDiFF fixture:
  - `source=NSE`
  - `segment=CM`
  - `sourceName=NSE_UDIFF_CM_BHAVCOPY`
  - `rowsRead=2`
  - `rowsParsed=2`
  - `rowsInserted=2`
  - `rowsUpdated=0`
  - `rowsSkipped=0`
  - `warnings=[]`
  - `errors=[]`
  - `sourceFileImportId=cmpuyi6f80000w5tgraphp6v4`
- DB verification confirmed:
  - one completed `SourceFileImport`
  - two `PriceTick` rows with `sourceFileImportId`
  - two `LatestPrice` rows updated from imported candles
- Re-running the same import without `force` returned `SKIPPED_DUPLICATE`.
- DB counts after rerun stayed idempotent:
  - `importCount=1`
  - `priceCount=2`
  - `latestCount=2`
- `GET /api/v1/market-data/source-file-imports?source=NSE&segment=CM&limit=5` returned persisted source-file evidence, including real prior NSE CM imports.
- Legacy provider price backfill endpoint returned HTTP `410`.
- Synthetic `CODEXSMOKE*` validation rows were removed after evidence capture to avoid polluting local market data.
- The backend process started for validation was stopped after the check. Docker/Postgres was left running per Product Owner instruction.

Still pending from full reset scope:

- Live validation of BSE fill-only behavior against a missing-NSE-gap scenario.
- Live validation of NSE index and sector-index imports.
- Live validation of NSE delivery import and symbol/date linkage.
- Live validation of NSE F&O enrichment import.
- Live validation of historical backfill small date range and resume-after-interruption behavior.
- Live validation of manual verified fundamentals import from the UI.
- Full UI walkthrough of Market Data Foundation operator controls against a live backend.
- Full cross-page smoke proving non-Market-Data trader pages still render persisted reads after the reset.
- Final provider cleanup dry-run/execute acceptance remains separate; cleanup routes intentionally remain available for audit.

Full reset done means:

The reset is not complete until:

- No active runtime path can call Yahoo, yfinance, Angel One, or broker APIs.
- Provider package dependencies are removed or explicitly justified as unreachable temporary quarantine.
- Market Data Foundation operator page exposes all required NSE/BSE workflows in this reset.
- Historical candle backfill is usable from UI.
- Manual verified fundamentals import is usable from UI.
- Market Data Foundation UI shows source-file evidence.
- Existing non-Market-Data pages still render after this reset, with no source edits in those modules.
- Full affected build/test/UI smoke evidence is recorded.

## Approval Points

Before implementation, confirm:

- Route behavior for removed provider endpoints: hard `404` versus explicit disabled response.
- Whether legacy direct operator routes outside `/admin/*` should remain temporarily or redirect to `/admin/*`.
- Whether removing `yahoo-finance2` from `backend/package.json` is approved in this reset.
- Whether provider cleanup routes should remain for audit after cleanup is zero, or be removed after final evidence.

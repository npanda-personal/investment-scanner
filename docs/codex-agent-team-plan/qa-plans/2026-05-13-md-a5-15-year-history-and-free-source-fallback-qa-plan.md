# MD-A5 15-Year History And Free-Source Fallback QA Plan - 2026-05-13

Mode: `QA Planning Mode`  
Owner: MD-A5 QA Planner  
Work item: MD-A5 - 15-Year History And Free-Source Fallback  
Lane/module: Lane 1, `market-data-foundation`  
Write scope for this QA pass: this file only.

## Sources Read

- [MD-A5 product brief](../po-briefs/2026-05-13-md-a5-15-year-history-and-free-source-fallback-product-brief.md)
- [MD-A5 architecture contract](../architecture-contracts/2026-05-13-md-a5-15-year-history-and-free-source-fallback-contract.md)
- [MD-A4 QA plan](2026-05-13-md-a4-provider-validation-drain-qa-plan.md)
- [MD-A3 QA plan](2026-05-13-md-a3-deep-price-backfill-qa-plan.md)

## QA Objective

QA must prove MD-A5 establishes an evidence-backed historical coverage contract for every active `IN / STOCK` row. Older active stocks must have daily OHLCV coverage for the 15-year window ending at the latest completed EOD. Younger active stocks must have daily OHLCV coverage from verified listing date through latest completed EOD. Rows that cannot meet that standard must expose a precise blocker: listing-date repair, symbol identity repair, free-source fallback pending, free-source unavailable after bounded attempts, calendar uncertainty, manual official-file required, or source temporarily blocked.

MD-A5 is accepted only if Yahoo insufficiency is not treated as final, free official/public fallback sources are attempted or queued, paid providers are rejected, row/source provenance is visible, bulk backfill remains bounded and date-batched, and downstream workflows remain fail-closed until the required window is actually complete.

Out of scope for this QA plan:

- Running servers, automated tests, provider jobs, or live drains during this planning pass.
- Changing implementation files.
- Accepting paid market data, broker APIs, paid exchange files, hosted vendor services, or commercial free-tier vendors without explicit future PO and Architect approval.
- Relaxing Today Review, Signal Quality, Strategy Decision, Trade Plan, Data Quality, Portfolio, Watchlist, or Alert gates.
- Claiming full-catalog coverage from a tiny bounded QA batch.

## QA Entry Conditions

QA execution can start only after the developer handoff includes:

- Changed files grouped by backend, frontend/API, tests, docs, and any source-adapter/cache files.
- Confirmation that production changes are limited to the approved MD-A5 packet scopes.
- Focused backend test output for required-window calculation, listing-date states, latest-completed-EOD cap, coverage diagnostics, source fallback, source provenance, storage source preservation, and no-progress handling.
- Focused parser/cache test output for every official NSE/BSE file format implemented.
- API response examples for `prices/backfill`, repair-plan, health, readiness, latest repair-run, and optional history-coverage endpoint if added.
- UI evidence or mocked tests if Market Data Foundation UI changed.
- Explicit statement that no paid provider, paid file, broker API, hosted queue, hosted database, or hosted observability dependency was added.
- Exact skipped checks with reason, owner, risk, and next action.

QA rejects the handoff before deeper validation if it lacks focused automated evidence for required-window computation, latest-completed-EOD capping, free-source fallback routing, and downstream fail-closed behavior.

## Requirement Under Test

For each active, non-delisted `region=IN`, `assetType=STOCK` instrument:

- `requiredHistoryEndDate` must be the latest completed EOD for the Indian market. In-progress same-day candles must not count.
- If listing date is verified and older than or equal to the 15-year target, `requiredHistoryStartDate` must be `requiredHistoryEndDate - 15 years`.
- If listing date is verified and younger than the 15-year target, `requiredHistoryStartDate` must be the verified listing date.
- If listing date is missing, invalid, or conflicting, the system must use the 15-year target, expose the listing-date blocker, and avoid claiming listing-date-complete status.
- Daily OHLCV means date, open, high, low, close, and volume. Close-only rows, missing OHLC fields, and missing/zero volume are blockers unless an approved exchange-source rule explicitly proves zero volume is valid for a no-trade day.
- Yahoo success can satisfy coverage only when it covers the full required window through latest completed EOD with acceptable OHLCV and volume evidence.
- Yahoo zero rows, shallow history, missing latest EOD, timeout, rate limit, missing volume, or uncertain provider mapping must trigger an approved free official/public fallback attempt or a visible fallback-needed blocker.
- Approved fallback sources are official/public NSE/BSE files and operator-supplied local files derived from official/public exchange sources with fingerprints and provenance.
- Paid providers and paid/free-tier commercial vendor substitutes must be rejected unless a later explicit PO/Architect approval exists.
- Downstream trusted review and candidate generation must remain blocked for incomplete, source-pending, listing-date-gap, identity-gap, calendar-uncertain, retry-blocked, manual-required, or volume-incomplete rows.

## Required Status And Blocker Checks

QA must verify that each inspected instrument lands in a precise terminal or pending state. Naming may differ from implementation, but semantics must match.

| Check | Expected result | Required evidence |
| --- | --- | --- |
| Full old-stock window complete | Active stock listed at least 15 years ago is complete only when the 15-year required window has daily OHLCV through latest completed EOD. | Row sample with required dates, stored dates, expected sessions, missing sessions, volume coverage, source summary. |
| Younger listing complete | Active stock listed less than 15 years ago is complete from verified listing date through latest completed EOD and is not penalized for pre-listing dates. | Listing-date source/basis plus coverage row sample. |
| Missing listing date | Missing listing date uses 15-year target, increments listing-date gap counts, and cannot claim listing-date completeness. | `listingDateStatus`, warning, repair queue/blocker, required start date. |
| Listing-date conflict | Conflicting free-source dates become repair/manual-required and do not overwrite trusted metadata silently. | Conflict diagnostics, source names, existing vs proposed date. |
| First-EOD inference | Earliest official EOD can be recorded as weaker inference only with warning and basis, not as an undisclosed verified listing date. | `listingDateBasis`, warning, source fingerprint. |
| Symbol identity ambiguity | Ambiguous NSE/BSE/provider/source symbol mapping blocks automatic import and does not write prices. | Ambiguous ids/symbols and manual-required blocker. |
| Calendar uncertainty | Expected sessions cannot be guessed silently; completion is blocked when the trading calendar is uncertain. | Calendar blocker count and row-level status. |
| Missing latest EOD | Row missing latest completed EOD remains incomplete even if older history exists. | Latest completed EOD vs latest stored date. |
| Missing fields | Any required OHLC or volume gap keeps coverage incomplete. | Rejection/missing-field counts and sample dates. |
| Adjusted close honesty | Adjusted close coverage is reported separately and cannot mask OHLCV gaps. | Adjusted-close coverage and warnings. |
| Retryable source blocked | Rate limit, timeout, or parse failure becomes retryable/source-blocked, not clean unsupported. | Source status counts, retry guidance, failed-date samples. |
| Incomplete after fallback | After approved free fallback is attempted, remaining gaps are listed by date range and source response. | Fallback attempt fields, missing ranges, row counts. |

Immediate rejection triggers:

- A stock is marked complete without the required start/end window and daily OHLCV evidence.
- A missing listing date reduces the required start date below the 15-year target.
- A younger company is treated as complete from a guessed listing date with no source/basis.
- Missing/zero volume is hidden by close-price availability.
- Source or listing-date blockers disappear from health, repair-plan, latest-run, or row detail evidence.

## Backend Service/API Test Plan

Preferred backend scope: focused tests under `backend/tests/modules/market-data-foundation/`, plus route/API tests for the implemented endpoints. QA should run the narrowest MD-A5 spec first after implementation, then the closest market-data regression subset.

Suggested command after implementation, subject to handoff:

```powershell
npm test -- market-data --runInBand
```

Required backend scenarios:

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Old listing required start | Listing date older than 15-year target uses the 15-year target. |  | Test name and computed dates. |
| Younger listing required start | Verified younger listing uses listing date as start. |  | Test name, listing-date basis. |
| Missing listing date target | Missing listing date uses 15-year target and increments listing-date gap diagnostics. |  | Test name, response fields. |
| Invalid listing date | Invalid/null/future/conflicting date does not reduce target and surfaces repair blocker. |  | Fixture and blocker fields. |
| Latest completed EOD cap | Provider/fallback requests end at latest completed EOD, not the current in-progress session. |  | Provider args and computed end date. |
| Trading-session coverage | Expected sessions are trading sessions, not calendar days, and missing-session count is accurate. |  | Calendar fixture and counts. |
| Full-window pass | Stored rows covering required window with acceptable OHLCV and volume become full-window complete. |  | Coverage summary. |
| Shallow 252-bar fail | A row with recent 252 bars but most of the 15-year window missing is not MD-A5 complete. |  | Coverage status. |
| Missing latest EOD fail | Row covering old history but missing latest completed EOD remains incomplete. |  | Latest date assertion. |
| Missing OHLC fail | Null/open/high/low/close gaps keep row incomplete and are counted separately. |  | Rejection counts. |
| Missing/zero volume fail | Missing or zero volume remains a blocker unless approved source rule classifies it as valid no-trade evidence. |  | Volume coverage fields. |
| Yahoo complete | Yahoo full-window result stores rows as `yahoo` and reports no fallback needed. |  | Rows by source. |
| Yahoo zero rows fallback | Yahoo zero usable rows triggers official fallback pending/attempted, not clean unsupported. |  | Fallback reason. |
| Yahoo shallow fallback | Yahoo shallow range triggers fallback for missing date ranges. |  | Missing ranges and fallback request. |
| Yahoo missing latest fallback | Yahoo missing latest completed EOD triggers official fallback for that date. |  | Fallback reason and date. |
| NSE parser | Implemented NSE UDiFF/legacy parser maps valid OHLCV rows, rejects malformed rows, preserves source and format version. |  | Parser test result. |
| BSE parser | Implemented BSE UDiFF/legacy parser maps valid OHLCV rows, rejects malformed rows, preserves source and format version. |  | Parser test result. |
| Source cache reuse | Same source/date/content identity hits cache and avoids repeat download. |  | Cache hit/download counts. |
| Date-batched fallback | Exchange fallback fetches/parses one date file for multiple symbols, not one request per symbol per day. |  | Mock call counts. |
| Source file status | Download, not-published, no-session, parse-failed, no-symbol-rows, and ready states are distinct. |  | Status counts. |
| Ambiguous identity reject | Ambiguous NSE/BSE/provider mapping produces manual-required and writes no price rows. |  | Persisted rows unchanged. |
| Scoped writes only | Exchange fallback updates only matched active `IN / STOCK` instruments. |  | Selected ids and write assertions. |
| Source-aware storage | `PriceTick.source` reflects Yahoo, NSE, BSE, legacy, or manual official-file source accurately. |  | Repository assertion. |
| Duplicate collapse | Duplicate same-source/date/symbol rows are collapsed before storage. |  | Insert/update/no-op counts. |
| Manual official file | Manual local official-file import fingerprints content, rejects unsupported formats, and records file/source evidence. |  | Fingerprint and reject counts. |
| Paid provider reject | Paid/broker/commercial free-tier source attempts are rejected or not configurable under MD-A5 defaults. |  | Config/API validation assertion. |
| Unsafe batch size | MD-A5 fallback batch sizes are clamped or rejected according to hard caps. |  | Route test response. |
| No-progress stop | Drain stops partial/blocked when source failures or unchanged candidates repeat without durable progress. |  | Repair-run status. |
| Latest-run persistence | Latest repair-run stores policy, source policy, before/after snapshots, source counts, warnings, and blockers. |  | Latest-run sample. |

Backend rejection criteria:

- Required-window computation uses bar count instead of date-window coverage.
- Calendar days are counted as expected sessions without trading-calendar handling or uncertainty blocker.
- Yahoo insufficiency becomes permanent unsupported without official/public fallback attempt or fallback-needed blocker.
- Paid provider configuration is accepted in the MD-A5 path without explicit approval evidence.
- Exchange fallback loops per symbol per day instead of date-batched file reuse.
- Price storage overwrites source truth with a generic `yahoo` or provider value.
- Ambiguous source rows can update the wrong instrument.
- Direct API calls can trigger unbounded full-catalog 15-year repair.

## API And Evidence Surface Checks

QA must verify that implemented API responses expose enough machine-readable evidence for PO acceptance. Field names may differ, but the evidence must be present.

Required response surfaces:

- `POST /api/v1/market-data/prices/backfill` with MD-A5 policy/source policy.
- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK`.
- `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK`.
- `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK`.
- `GET /api/v1/market-data/universe/repair-runs/latest`.
- Optional `GET /api/v1/market-data/history-coverage?region=IN&assetType=STOCK` if implemented.

Required API checks:

| Check | Expected result | Required evidence |
| --- | --- | --- |
| Bounded MD-A5 request | Backfill accepts MD-A5 policy/source policy and enforces `batchSize` default/max. | Request/response with bounds. |
| Coverage counts | Repair-plan and health expose full-window complete/incomplete, listing-date gaps, Yahoo insufficient, official fallback pending/succeeded/failed, manual official-file required, calendar uncertain, and source unavailable counts. | API samples before/after. |
| Row samples capped | Sample coverage results are capped but include representative symbols and blockers. | Sample array length and rows. |
| Source provenance | Response includes source files read/downloaded/cache-hit/failed, rows read/matched/rejected, fingerprints, format versions, and fallback reasons. | Response fields. |
| Remaining candidates | Response states whether more bounded runs are needed and how many candidates remain if known. | `hasMore`, `anotherRunNeeded`, remaining counts. |
| Signoff state | `universeSignoff`, `trustStatus`, or equivalent remains fail/warning until full required coverage and other gates pass. | Health/latest-run sample. |
| No green partial | HTTP 200 with partial work, failed signoff, source blockers, or `hasMore=true` is represented as partial/warning, not success. | Status and UI/API treatment. |

## Frontend/UI Checks

Run UI checks only if MD-A5 changes frontend behavior. UI tests must mock APIs and must not run provider/source work.

Suggested command after implementation, subject to handoff:

```powershell
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

Required UI scenarios:

| Scenario | Expected result | Pass/Fail | Evidence field |
| --- | --- | --- | --- |
| Bounded payload | UI sends one scoped, bounded MD-A5 backfill or repair-run request per action. |  | Intercepted payload. |
| No unbounded control | UI does not expose a one-click full-catalog 15-year download without repair-run bounds/status. |  | Screenshot/assertion. |
| Coverage counts visible | Workbench renders full-window incomplete, listing-date missing, Yahoo insufficient, official fallback pending/succeeded/failed, manual official-file required, and source unavailable counts. |  | Assertion. |
| Row detail evidence | Row/sample detail shows required dates, listing-date status, coverage status, source summary, missing sessions, latest EOD, and warnings. |  | Assertion. |
| Partial warning state | Fallback failures, `hasMore=true`, `anotherRunNeeded=true`, failed signoff, or source blockers render warning/blocked treatment. |  | Mocked assertion. |
| Paid source absent | UI does not add paid provider, broker, or commercial free-tier source options in MD-A5 flow. |  | Assertion. |
| Downstream blocked | UI messaging does not claim Today Review/trusted readiness for incomplete full-window rows. |  | Mocked health/readiness assertion. |
| Refresh after action | After terminal or partial response, UI refreshes repair-plan, health, readiness, and latest-run evidence. |  | Request count. |

UI rejection criteria:

- UI loops over symbols, dates, or source files.
- Partial/fallback-needed states are styled as green completion.
- Listing-date gaps or source blockers are hidden from the operator.
- UI offers a paid provider path or arbitrary URL source input under MD-A5.
- UI suggests downstream review readiness based only on recent 120/200/252 bar thresholds when MD-A5 full-window coverage fails.

## Bounded Live/Local Evidence Plan

Live/local evidence is required only after implementation is ready and Orchestrator authorizes it. Do not run full 15-year all-catalog fallback unless Orchestrator explicitly authorizes a maintenance run.

Default live bounds:

- Scope: `region=IN`, `assetType=STOCK`.
- Direct MD-A5 price backfill: `policy=FULL_REQUIRED_WINDOW_WITH_FREE_FALLBACK`, `sourcePolicy=YAHOO_THEN_OFFICIAL_EXCHANGE`, `batchSize <= 3`.
- Repair-run mode, if used: `mode=DRAIN_UNTIL_BLOCKED`, `batchSize <= 3`, `maxBatchesPerAction=1`.
- Provider/source concurrency: backend defaults only, with any exposed worker/concurrency value set to `1`.
- New exchange file downloads: keep within implementation default and record the cap; do not override upward.
- Manual official-file import: only when Orchestrator supplies an official/public NSE/BSE-derived file and authorizes import.

Required live evidence checklist:

| Evidence item | Required capture | Pass/Fail | Notes |
| --- | --- | --- | --- |
| Before repair-plan | Capture scoped counts for history complete/incomplete, listing-date gaps, fallback pending/succeeded/failed, manual required, source unavailable, calendar uncertain, and signoff. |  |  |
| Before health | Capture trust status, universe signoff, downstream allowed, provider support, stale EOD, volume, and trusted-review counts. |  |  |
| Before readiness | Capture review readiness and blocker counts proving downstream state before MD-A5 action. |  |  |
| Exact request | Record exact bounded backfill or repair-run payload. |  |  |
| Response timing | Record duration and confirm the request behaves as bounded work, not hidden full-catalog drain. |  |  |
| Coverage response | Record attempted/completed/partial/failed counts, rows by source, fallback reasons, source files read/downloaded/cache-hit/failed, and remaining candidates. |  |  |
| Listing-date gap sample | Capture at least one missing or conflicting listing-date row, or record why none exists in the bounded sample. |  |  |
| Old-stock sample | Capture one old active stock with 15-year target status, whether pass or blocked. |  |  |
| Younger-stock sample | Capture one younger active stock using verified listing-date start, whether pass or blocked. |  |  |
| Yahoo insufficient sample | Capture one row where Yahoo is shallow/zero/missing latest EOD and fallback is attempted, queued, or blocked. |  |  |
| Official fallback evidence | If fallback runs, capture NSE/BSE/manual source name, file date, date range, format version, fingerprint, rows read/matched/rejected, and accepted row count. |  |  |
| Incomplete-after-fallback sample | If present, capture missing date ranges and source responses after approved free fallback. |  |  |
| After snapshots | Repeat repair-plan, health, readiness, and latest-run; compare counts without extrapolating beyond bounded sample. |  |  |
| Downstream fail-closed | Prove incomplete/source-blocked/listing-date-gap rows do not enter trusted review or downstream candidates. |  |  |

If local services, provider access, official-source access, or manual official files are unavailable, mark live checks `BLOCKED` with owner `Orchestrator / Lane 1 Market Data developer`, exact reason, and residual risk.

## Performance And Bulk Backfill Expectations

MD-A5 performance acceptance focuses on bounded, resumable mechanics rather than completing the full active universe during QA.

Required expectations:

- Direct MD-A5 official-fallback requests default to small batches and enforce hard max `batchSize <= 50`; recommended QA smoke uses `batchSize <= 3`.
- Official exchange fallback is date-batched and cache-backed. QA must reject symbol-day request loops.
- New official source downloads per direct request are capped, with implementation default expected near `40` or lower unless Architect approved otherwise.
- Total source files parsed per direct request, including cache hits, are capped, with implementation default expected near `250` or lower unless Architect approved otherwise.
- Normal UI direct batch target should complete under about `60` seconds; longer work must use repair-run/status patterns.
- Repair-run `maxBatchesPerAction` is bounded, recommended default near `5`, and hard max no higher than `25` without explicit Orchestrator maintenance approval.
- Source download timeout is capped, expected default near `15` seconds and hard max no higher than `30` seconds.
- Progress reports candidate symbols processed, required ranges evaluated, files downloaded/cache-hit/failed, rows inserted/updated/no-op, rows by source, remaining candidates, and blockers.
- No-progress detection stops as partial/blocked when repeated source failures, parse failures, calendar uncertainty, ambiguous identity, or zero-row source results prevent movement.
- Warnings, failed-date samples, and row samples are capped while machine-readable counts carry totals.

Performance rejection triggers:

- One API call or UI action can attempt unbounded full-catalog 15-year history repair.
- Fallback downloads one file per symbol per date.
- The UI performs client-side loops over symbols, dates, or source files.
- A repeated no-progress drain continues indefinitely or reports completed success.
- Bulk evidence lacks enough counters to determine throughput, cache reuse, failures, remaining work, and blockers.

## Explicit QA Evidence Record Template

QA evidence should include this table or an equivalent structured record in the MD-A5 QA evidence file.

| Evidence item | Status | Command/request | Key fields observed | Artifact link/path | Gaps or risk |
| --- | --- | --- | --- | --- | --- |
| Backend focused tests |  |  |  |  |  |
| Parser/cache tests |  |  |  |  |  |
| Repository/source storage tests |  |  |  |  |  |
| API route tests |  |  |  |  |  |
| Frontend/UI tests, if changed |  |  |  |  |  |
| Before repair-plan |  |  |  |  |  |
| Before health/readiness |  |  |  |  |  |
| Bounded MD-A5 request |  |  |  |  |  |
| Terminal/partial response |  |  |  |  |  |
| Latest completed EOD proof |  |  |  |  |  |
| Old-stock 15-year sample |  |  |  |  |  |
| Younger listing-date sample |  |  |  |  |  |
| Missing listing-date sample |  |  |  |  |  |
| Yahoo insufficient fallback sample |  |  |  |  |  |
| Official/free source provenance |  |  |  |  |  |
| Paid provider rejection proof |  |  |  |  |  |
| Downstream fail-closed proof |  |  |  |  |  |
| Performance/progress proof |  |  |  |  |  |
| Residual risks |  |  |  |  |  |

Each row must be marked `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`. `NOT RUN` requires a blocker reason and owner.

QA must record these evidence fields for every representative instrument sample:

- Symbol, exchange, provider symbol, source symbol, stock id, and ISIN when available.
- Active/delisted status, region, asset type, and exchange/source identity.
- Listing date, listing-date status, listing-date basis, listing-date source name, and conflict/inference warning if present.
- Required history start date and required history end date.
- Oldest stored EOD date and latest stored EOD date.
- Stored rows in required window.
- Expected trading sessions in required window.
- Missing trading-session count and max gap in trading days.
- Coverage percent.
- Latest completed EOD present.
- OHLC completeness and missing-field counts.
- Recent volume coverage percent, missing-volume count, and zero-volume count.
- Adjusted-close coverage percent and adjusted-close fallback warning.
- History coverage status and blocker/status reason.
- Primary source attempted and fallback sources attempted.
- Source fallback reason.
- Selected source by date range.
- Source files read, downloaded, cache-hit, failed, and parse status counts.
- Source rows read, matched, unmatched, accepted, rejected, and rejection reasons.
- Source fingerprint samples with source, trading date, content hash, row count, and format version.
- Before/after coverage for the bounded run.
- Whether the row entered trusted review, Today Review, Signal Quality, Strategy Decision, Trade Plan, or other downstream candidate flows.

## Residual Risk List

| Risk | Impact | QA handling |
| --- | --- | --- |
| Official NSE/BSE sites can change format, throttle, or block automated downloads. | Fallback may remain pending or manual-file required despite correct implementation. | Accept honest source-blocked/manual-required status with fingerprints and failed-source evidence. |
| Historical file formats differ before and after exchange format changes. | Parser coverage may be incomplete for older dates. | Require format-specific parser tests and separate legacy/current status counts. |
| Missing or weak listing-date sources may keep many rows blocked. | Younger-listing completeness cannot be proven for those rows. | Keep listing-date repair counts visible; do not mark complete. |
| Exchange bhavcopy data may be unadjusted. | Long-history analytics may lack corporate-action-adjusted continuity. | Require adjusted-close provenance/warnings; do not hide OHLCV gaps. |
| Trading calendar gaps can skew expected-session counts. | False pass or false fail risk. | Require calendar uncertainty blocker and expected-session evidence. |
| Full-universe drain may take many bounded runs. | Tiny QA batches do not prove full operational duration. | Validate bounded, resumable, cache-backed progress; leave full drain to authorized maintenance evidence. |
| Symbol identity collisions can block automatic import. | Coverage may remain low but safer. | Treat manual-required ambiguity as correct fail-closed behavior. |
| Existing local DB state may already contain mixed provenance. | Before/after movement may be hard to interpret. | Record exact snapshots and row-source summaries. |
| UI may pass mocked tests while live API fields differ. | Operator may miss blockers at runtime. | Require one bounded API/UI smoke or documented blocker after implementation. |

## Required QA Gates

MD-A5 cannot be signed off until these gates pass or are explicitly blocked with owner and risk:

| Gate | Required result |
| --- | --- |
| Backend focused tests | Required-window, listing-date states, latest-completed-EOD cap, full-window coverage, missing OHLCV/volume, fallback routing, paid-source rejection, source storage, and no-progress handling pass. |
| Source adapter/cache tests | Every implemented NSE/BSE/manual official-file format has parser, rejection, source, fingerprint, cache-hit, and failed-source tests. |
| API evidence | Backfill, repair-plan, health, readiness, latest-run, and optional history-coverage surfaces expose required counts, samples, provenance, signoff, and remaining blockers. |
| Frontend evidence, if changed | UI sends bounded requests, shows coverage/source/listing-date blockers, warns on partial states, and avoids paid/unbounded controls. |
| Bounded live/local evidence | A tiny authorized run or accepted blocker records before/after snapshots, representative row samples, source evidence, and downstream fail-closed proof. |
| Performance/progress acceptance | No unbounded UI/API path, date-batched cache-backed fallback, capped downloads/parses, capped samples, and no-progress partial/blocked behavior. |
| Residual risk review | Official-source availability, listing-date gaps, identity ambiguity, calendar uncertainty, adjusted-close limitations, and full-drain duration are documented. |

## Final Rejection Criteria

Reject MD-A5 if any of these are true:

- A row is marked history-complete without daily OHLCV through latest completed EOD for the required 15-year or verified listing-date window.
- A missing listing date is used to shrink the required window below 15 years.
- A younger company's listing-date-to-EOD coverage is accepted without verified or clearly inferred listing-date evidence.
- Yahoo shallow/no-data/missing-latest/rate-limited results are treated as final unsupported without approved official/public free-source fallback or a visible fallback-needed blocker.
- Paid providers, paid files, broker APIs, hosted vendor services, or commercial free-tier vendor dependencies appear without explicit future PO and Architect approval.
- Source provenance omits source name/type, URL or local file, file date, date range, fingerprint when applicable, identity mapping, accepted/rejected rows, or rejection reasons.
- Ambiguous NSE/BSE/provider identity can write OHLCV to the wrong stock.
- Missing/zero volume, missing OHLC fields, stale latest EOD, calendar uncertainty, or adjusted-close limitations are hidden.
- Incomplete/source-blocked/listing-date-gap/manual-required rows enter trusted review or downstream candidate generation.
- UI/API reports green success while blockers, `hasMore`, `anotherRunNeeded`, failed signoff, or partial fallback remain.
- A repair action can launch an unbounded full active-universe 15-year backfill without batch limits, progress, resumability, and stop conditions.

## QA Signoff Standard

QA signoff requires focused automated evidence, source adapter/cache evidence for every implemented free-source format, API evidence for coverage/provenance/signoff fields, UI evidence if changed, and one authorized bounded live/local check or accepted blocker. The signoff must explicitly state whether MD-A5 meets the PO standard: every active `IN / STOCK` is either proven to have daily OHLCV for the required 15-year or verified listing-date window through latest completed EOD, or remains fail-closed with a specific free-source, listing-date, identity, calendar, volume, source-availability, or manual official-file blocker.

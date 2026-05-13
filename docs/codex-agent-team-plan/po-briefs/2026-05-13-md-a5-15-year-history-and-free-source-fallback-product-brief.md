# MD-A5 Product Brief - 15-Year History And Free-Source Fallback

Date: 2026-05-13  
Mode: Product Planning Mode  
Owner: MD-A5 Product Owner Refinement Agent  
Work item: MD-A5 - 15-Year History And Free-Source Fallback  
Owned artifact: `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a5-15-year-history-and-free-source-fallback-product-brief.md`

## Sources Read

- `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a4-provider-validation-drain-product-brief.md`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-md-a4-provider-validation-drain-contract.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-13-md-a4-provider-validation-drain-qa-plan.md`
- `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-missing-data-root-cause-audit.md`
- `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-data-availability-audit.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-market-data-availability-work-packets.md`
- `docs/codex-agent-team-plan/active-work-board.md`

## 1. Product Decision

MD-A5 should become the next Market Data product requirement after MD-A4. MD-A4 classifies provider support and prevents Yahoo insufficiency from being treated as final. MD-A5 turns that policy into a coverage guarantee: every active `IN / STOCK` must either have the required daily OHLCV history stored through the latest completed EOD, or expose a specific free-source, listing-date, symbol-identity, or source-availability blocker.

The target coverage standard is:

- active companies listed at least 15 years: 15 years of daily OHLCV ending at the latest completed EOD;
- active companies listed less than 15 years ago: daily OHLCV from listing date through the latest completed EOD;
- active companies with missing or disputed listing date: attempt 15-year coverage, keep the listing-date gap visible, and do not claim listing-date-complete status until identity repair confirms the true start date.

Yahoo is not enough as the product contract. It can remain one free source and may be the first attempt, but MD-A5 acceptance requires an approved free-source fallback path when Yahoo is shallow, missing, throttled, or inconsistent for Indian stocks.

## 2. Product Problem And Trader/Investor Impact

The app can improve provider classification and still be unusable for real investor workflows if the stored OHLCV history is shallow or source-dependent. A stock with only recent candles, missing volume, missing old history, or unproven listing-date coverage cannot safely power review, signals, calibration, strategy decisions, or trade plans.

Trader and investor impact:

- Today Review stays empty or misleadingly small because candidates cannot pass depth, freshness, and volume gates.
- Signals and strategy decisions can overfit to short recent windows and miss long-cycle behavior such as drawdowns, regime changes, volatility shifts, and liquidity decay.
- Signal Quality and backtesting evidence remain weak because there is not enough historical and forward price coverage.
- Trade Plans may calculate levels from insufficient history, creating false confidence in stops, targets, and risk sizing.
- The user cannot distinguish a real young listing from a data-source gap unless listing date and first available OHLCV date are compared explicitly.
- Yahoo gaps can silently shrink the investable universe unless the product insists on official/public free exchange data before accepting missing history.

The user-facing value of MD-A5 is an honest, source-backed historical coverage ledger for the active stock universe, with a repeatable free fallback workflow before any row is accepted as complete, incomplete, unsupported, or manual-repair-required.

## 3. Coverage Acceptance Criteria

### P0 - Required Coverage Window Is Computed Per Active Stock

- Scope is `region=IN` and `assetType=STOCK`.
- Every active, non-delisted stock has a required history window:
  - `requiredHistoryEndDate = latestCompletedEodDate`;
  - `requiredHistoryStartDate = max(listingDate, latestCompletedEodDate - 15 years)` when listing date is known;
  - `requiredHistoryStartDate = latestCompletedEodDate - 15 years` when listing date is missing, with a separate listing-date blocker.
- The system exposes for each sampled or inspected row: symbol, exchange/source identity, provider symbol, ISIN when available, listing date, first stored OHLCV date, latest stored OHLCV date, row count, trading-session coverage percentage, missing-session count, volume coverage, source provenance, and coverage status.
- A younger company is not penalized for lacking pre-listing candles when listing date is proven.
- A missing listing date cannot be used to reduce the required window below 15 years.

### P0 - Daily OHLCV Completeness Is Measured Against Completed EOD Sessions

- Coverage is measured against expected daily trading sessions through the latest completed EOD, not calendar days and not in-progress current-session candles.
- Required fields are open, high, low, close, and volume.
- A row with close-only or missing volume is not OHLCV-complete.
- Missing or zero volume remains a blocker unless the source evidence proves zero volume is a valid exchange-reported no-trade day and Product/Architecture approve how that case should be interpreted.
- Historical candles must preserve adjusted-close provenance where supplied, but adjusted close is not allowed to mask missing OHLCV.
- Gap summaries distinguish:
  - missing entire sessions;
  - missing OHLC fields;
  - missing or zero volume;
  - stale latest completed EOD;
  - listing-date uncertainty;
  - symbol/source identity uncertainty;
  - provider/source unavailable.

### P0 - Completion Status Is Evidence-Based

Each active stock must end in one of these product statuses:

- `HISTORY_COMPLETE`: required window is covered through latest completed EOD with daily OHLCV and acceptable volume evidence.
- `HISTORY_INCOMPLETE_SOURCE_FALLBACK_NEEDED`: Yahoo or the primary free source is shallow/missing and an approved free fallback has not completed.
- `HISTORY_INCOMPLETE_AFTER_FREE_FALLBACK`: approved free fallback was attempted and still could not provide the required candles; evidence names the missing date ranges and source responses.
- `LISTING_DATE_REPAIR_REQUIRED`: the row cannot be judged against listing-date-to-EOD coverage because listing date or identity is missing/ambiguous.
- `SYMBOL_IDENTITY_REPAIR_REQUIRED`: NSE/BSE/provider/source identity is ambiguous enough that importing history could attach prices to the wrong instrument.
- `SOURCE_TEMPORARILY_BLOCKED`: free source is rate-limited, unavailable, or parsing failed in a retryable way.
- `MANUAL_SOURCE_REVIEW_REQUIRED`: automatic free-source matching is insufficient and a local/manual public-source import is needed.

### P1 - Universe-Level Acceptance Metrics Are Visible

- Repair plan, health, or workbench evidence exposes counts for:
  - active stocks in scope;
  - `HISTORY_COMPLETE`;
  - 15-year-required complete;
  - listing-date-required complete for younger listings;
  - source fallback needed;
  - incomplete after fallback;
  - listing-date repair required;
  - symbol identity repair required;
  - retryable source blocked;
  - manual source review required.
- `trustedCount` and review readiness must not increase from shallow coverage alone. They may increase only when the instrument also passes existing freshness, volume, provider support, and trusted-universe criteria.
- MD-A5 may increase blocker counts by detecting true long-history gaps. That is acceptable product progress when the evidence is clearer.

## 4. Free-Source Fallback Policy

### Approved Source Preference

The product preference for `IN / STOCK` history repair is:

1. Use existing stored trusted OHLCV if it already covers the required window and has provenance.
2. Use Yahoo only as a free primary history source when it returns sufficient completed-EOD daily OHLCV.
3. When Yahoo is insufficient, prefer official/public exchange EOD files:
   - NSE official reports, especially `CM-UDiFF Common Bhavcopy Final (zip)` from NSE public reports;
   - BSE Equity Bhav Copy / Historical Bhav Copy public exchange files;
   - other official NSE/BSE public files only when Architecture confirms the format, terms, identity fields, and historical range.
4. Use local/manual CSV import only when the CSV is derived from approved public/free sources and includes source name, source date, file fingerprint, and operator evidence.

### Disallowed By Default

- Paid data providers, paid exchange files, paid APIs, broker APIs, hosted vendor services, or paid observability/queue tools are not approved.
- "Free tier" access from a commercial paid-data vendor is not approved by default. It may be considered only after explicit PO and Architect approval records:
  - no-cost status for the intended local personal use;
  - terms and redistribution risk;
  - throttling and sustainability;
  - no dependency on paid upgrade;
  - replacement plan using official/public sources.
- A vendor's free teaser coverage cannot be used to claim product completeness if it is too rate-limited or incomplete for repeatable local repair.

### Yahoo Insufficiency Rule

Yahoo no-data, shallow history, missing volume, throttling, or provider error is not final evidence that an active stock lacks required history. Before a row can be accepted as incomplete or unsupported, the system must attempt an approved free-source fallback or expose a specific `HISTORY_INCOMPLETE_SOURCE_FALLBACK_NEEDED` blocker.

### Provenance Requirements

Every fallback import or validation summary must record:

- source name and source type;
- source URL or local file name where applicable;
- downloaded/imported file date;
- source trading date range;
- file fingerprint/hash when local file import is used;
- symbol, exchange, ISIN, series/category, and any mapping key used;
- rows read, rows accepted, rows rejected, and rejection reasons;
- coverage before and after fallback;
- warnings about adjusted close, corporate actions, volume, split adjustments, or identity ambiguity.

## 5. Workflow And Evidence Required

### Operator Workflow

1. Start from MD-A4 output: provider unknowns drained or explicitly classified, retry/manual provider blockers visible, and supported rows available for price/history repair.
2. Capture baseline `IN / STOCK` coverage counts and representative row samples.
3. Compute required history window for active stocks using latest completed EOD and listing date where known.
4. Identify stocks whose stored OHLCV does not cover the required window.
5. For each bounded batch, attempt free primary history repair where supported.
6. When Yahoo is insufficient, route the row to official/public exchange EOD fallback rather than permanent unsupported.
7. Import or validate fallback history in bounded batches with source provenance and identity checks.
8. Recompute coverage status after each batch.
9. Keep listing-date and symbol-identity blockers separate from true source-data gaps.
10. Refresh repair plan, universe health, review readiness, and representative instrument evidence.

### API/UI Evidence

PO acceptance requires live/local evidence or a documented runtime blocker for:

- baseline and final repair-plan or equivalent coverage counts for `region=IN&assetType=STOCK`;
- baseline and final universe health showing history completeness, provider support, stale EOD, volume, and trusted-review counts;
- a row-level coverage sample for:
  - an old active stock that achieves 15-year completion;
  - a younger active stock that achieves listing-date-to-latest-completed-EOD completion;
  - a stock requiring listing-date repair;
  - a stock requiring symbol identity repair;
  - a stock where Yahoo was insufficient and official/public exchange fallback improved coverage;
  - a stock still incomplete after approved free fallback, if present;
  - a retryable source-blocked row, if present.
- fallback source evidence naming NSE/BSE/public exchange file source, file date, date range, rows accepted/rejected, and file fingerprint when imported locally;
- proof that unsupported/manual/retry-blocked rows do not enter trusted review or downstream candidate generation;
- proof that no downstream gates were relaxed to turn shallow history into review readiness.

### Evidence Quality Bar

- Evidence must include exact counts before and after, not only screenshots or prose.
- A tiny bounded batch is acceptable for implementation QA mechanics, but product acceptance for coverage claims must not extrapolate tiny-batch success to the full active universe.
- Full-universe operational drains must remain bounded, resumable, and observable. A single unbounded "repair all history" request is not acceptable.
- Manual CSV evidence must prove the file's public/free source and identity mapping before import results can count toward coverage.

## 6. Non-Goals

- No paid market-data provider integration.
- No broker integration, order placement, live trading, autonomous trading, or intraday trading workflow.
- No downstream Signal, Signal Quality, Strategy Decision, Today Review, Trade Plan, Portfolio, Watchlist, or Alert gate relaxation.
- No claim that provider support alone means history completeness.
- No requirement to solve all corporate-action and adjusted-close normalization in MD-A5, except that provenance and warnings must not be hidden.
- No broad redesign of the whole catalog model unless Architect determines identity safety cannot be achieved otherwise.
- No importing historical prices into ambiguous NSE/BSE/provider symbol rows.
- No permanent unsupported decision based only on Yahoo insufficiency.

## 7. Rejection Criteria

PO will reject MD-A5 if any of the following are true:

- A stock is marked history-complete without daily OHLCV through latest completed EOD for its required 15-year or listing-date window.
- A younger company's required start date is guessed without listing-date evidence.
- A missing listing date is used to reduce the required coverage window.
- Yahoo shallow/no-data results are treated as final without approved official/public free-source fallback evidence or a visible fallback-needed blocker.
- Paid providers, paid files, broker APIs, or commercial free-tier paid vendors are introduced without explicit PO and Architect approval.
- Fallback imports do not record source provenance, file date, date range, accepted/rejected row counts, and identity mapping evidence.
- NSE/BSE/provider symbol ambiguity can attach OHLCV to the wrong stock.
- Volume gaps are hidden by close-price coverage.
- Unsupported, incomplete, retry-blocked, manual, or identity-blocked rows enter trusted review or downstream candidate generation.
- The UI/API reports green success while remaining history, listing-date, source, volume, or identity blockers are unresolved.
- A repair action can run unbounded across the full catalog without batch limits, progress, cancellation/status, or resumable evidence.

## 8. Dependencies And Sequencing

### Dependency On MD-A4

MD-A5 should start after MD-A4 mechanics are available or explicitly blocked with evidence. Required MD-A4 outputs:

- provider support classified into supported, unsupported, retryable, retry-blocked, and manual-required states;
- `UNKNOWN_FIRST` provider validation drained or visible as a remaining blocker;
- Yahoo insufficiency classified as fallback-needed instead of permanent unsupported where applicable;
- supported candidate pool available for price/history repair;
- provider validation evidence includes provider symbol, validation window, and source result classification.

MD-A5 must not try to hide MD-A4 gaps by importing history into unclassified or ambiguous provider rows. If MD-A4 leaves rows in retry/manual/provider-blocked states, MD-A5 should report them as dependencies, not treat them as history-complete failures.

### Dependency On Listing-Date And Catalog Identity Repair

Listing date and identity repair are product-critical dependencies for MD-A5:

- Listing date decides whether the required start date is 15 years back or the actual listing date.
- ISIN, exchange, series/category, source symbol, provider symbol, and catalog stock id must be deterministic before importing fallback OHLCV.
- NSE/BSE duplicate symbol or name collisions must never update the wrong row.
- Missing listing date, missing ISIN, ambiguous exchange, or conflicting provider/source symbols must produce repair-required statuses and stay out of automatic history import.
- Manual/public CSV repair may be part of the MD-A5 implementation split, but it must be source-provenanced and scoped to matched stock ids only.

If Orchestrator splits work, the recommended order is:

1. MD-A5-A: coverage ledger and required-window computation;
2. MD-A5-B: official/public NSE/BSE fallback ingestion or validation path;
3. MD-A5-C: listing-date/catalog identity repair for rows blocked from safe fallback import;
4. MD-A5-D: bounded evidence run proving coverage movement and remaining blockers.

## 9. Orchestrator Intake Recommendation

Recommended intake status: `READY_FOR_ORCHESTRATOR_AFTER_MD_A4_HANDOFF`.

Suggested packet title: `MD-A5 - 15-Year History And Free-Source Fallback`.

Suggested implementation owner: Lane 1 Market Data Foundation, with backend coverage/source provenance first, identity repair coordination second, and frontend evidence after API field names stabilize.

Product priority: P0 after MD-A4 because the user needs more than provider support. The investable universe must have complete, source-backed daily OHLCV history or a precise free-source/identity/listing-date blocker before downstream workflows can be trusted.

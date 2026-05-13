# MD-A3 Product Brief - Deep Price Backfill For Supported Shallow Rows

Date: 2026-05-13  
Mode: Product Planning Mode  
Owner: MD-A3 Product Owner Refinement Agent  
Work item: MD-A3 - Deep Price Backfill For Supported Shallow Rows  
Owned artifact: `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a3-deep-price-backfill-product-brief.md`

## 1. Product Decision

MD-A3 is ready for Orchestrator intake.

The next Market Data packet should repair supported stocks that have current or partially current price data but not enough historical OHLCV depth for investment workflows. MD-A2 made the visible catalog sync path bounded and status-driven, but its accepted live evidence was a freshness-gated no-new-data run. It did not prove that supported shallow rows can be deepened from local repair workflows.

This packet should not broaden the backlog, relax downstream gates, or add advice behavior. It should convert the already-supported subset from "catalog/provider-supported but analytically shallow" into reviewable local market data where provider responses allow it.

## 2. User Workflow

The user workflow should be a bounded repair action for `IN / STOCK` price depth:

1. The user opens Market Data Foundation and sees shallow-history counts for provider-supported rows.
2. The user starts a scoped "repair shallow price history" action without needing to know or choose `fullReload`.
3. The action processes only a bounded batch or run, shows status/progress, and reports what changed.
4. The user can continue remaining candidates, retry failures, or inspect zero-row/no-op outcomes.
5. The user can verify whether Trusted Review Lite and deeper strategy/readiness thresholds improved.

Normal users should not have to understand implementation switches such as `fullReload`. The domain action is "make supported shallow stocks deep enough for review," not "run a full reload."

## 3. Investment Value

Historical OHLCV depth is the difference between a price row existing and a stock being useful for disciplined review.

- Today Review Lite needs enough recent bars to avoid ranking stocks from thin or newly loaded data.
- Signal Quality needs enough past and future price rows to evaluate signal outcomes honestly.
- Strategy Decision and Trade Plans need stable moving-average and risk context, not only the latest candle.
- Smart Money and volume-sensitive checks need recent volume history, not only close prices.
- Data Quality must be able to distinguish "supported but shallow" from "unsupported" or "stale."

The product value is not a larger catalog count. The value is increasing the number of supported stocks with current completed EOD, sufficient OHLCV history, recent positive volume, and truthful adjusted-close provenance.

## 4. Domain Assumptions

- Scope for this packet is `region=IN` and `assetType=STOCK`, matching the current market-data health problem.
- Provider-supported rows are eligible for MD-A3; unsupported, unknown-provider, retry-failed, or identity-blocked rows should not be hidden inside price-depth repair.
- The latest daily EOD candle must be a completed trading date. MD-A3 must not fetch or count in-progress current-day candles to make readiness look current.
- Public/free provider data can return zero rows, partial history, missing volume, or close-as-adjusted-close fallback. These outcomes are valid evidence and must be classified, not treated as success.
- Shallow history may exist because prior scheduled/bootstrap/incremental sync set a success timestamp and later runs used short overlap windows. MD-A3 should repair that state without requiring manual database cleanup.
- Some legitimate listings may have fewer than 200 or 252 historical bars because they are recently listed. Those rows should be classified as limited/new-listing where evidence supports it, not endlessly retried as defects.

## 5. Data Depth Thresholds That Matter

MD-A3 should report and repair against three distinct thresholds:

- `120 bars`: minimum Trusted Review Lite threshold. Rows below this are not useful enough for review candidates. This is the first product unlock.
- `200 bars`: strategy/data-quality depth threshold for common medium-term technical context and more stable trend/risk calculations. Rows between 120 and 199 may be usable for Lite review but should remain limited for deeper strategy paths.
- `252 bars`: full trading-year threshold. Rows below this should remain short of strict full-price readiness and annualized/rolling-year evidence.

Acceptance should not collapse these into one generic "has prices" count. The user and PO need counts for:

- rows below 120 bars;
- rows with 120 to 199 bars;
- rows with 200 to 251 bars;
- rows with 252 or more bars;
- rows still shallow because provider returned insufficient history;
- rows shallow because listing age makes deeper history impossible or not yet expected.

## 6. Avoiding In-Progress EOD

MD-A3 must cap the requested and accepted backfill window to the latest completed trading date for the region/session.

Product rules:

- Do not request today's daily candle while the market day is still in progress.
- Do not treat a provider's current-day partial daily row as EOD readiness.
- If the session/calendar logic is uncertain, prefer a visible warning/blocker over silently marking freshness current.
- Stored readiness fields should distinguish `latestCompletedTradingDate`, `latestStoredEodDate`, and any provider row dated after the completed EOD cutoff.
- Repair evidence must show the effective end date used for backfill.

This is especially important because MD-A2 live evidence showed the freshness gate can intentionally produce no-new-data outcomes. MD-A3 must deepen history behind the completed EOD boundary, not bypass the boundary.

## 7. Acceptance Criteria

MD-A3 is acceptable when all of the following are true:

- Provider-supported shallow rows can be discovered for `IN / STOCK` using scoped counts and candidate lists.
- Rows with fewer than `120` bars are repair candidates and can be deep-backfilled without the operator setting `fullReload`.
- Rows below `200` and `252` bars are counted separately and either repaired, classified as still shallow, or classified as legitimately limited/new-listing.
- Backfill requests and accepted rows are capped to the latest completed trading date, with no in-progress daily candle used for EOD readiness.
- The repair path is bounded, resumable or continuable, and status-driven; it must not reintroduce the pre-MD-A2 hidden long-running request pattern.
- Results expose `rowsReceived`, `inserted`, `updated`, `noOp`, `zeroRow`, `failed`, `skipped`, `remainingCandidates`, and warning/error samples.
- Result evidence distinguishes provider no-data, insufficient provider history, provider failure/rate-limit, unsupported/manual rows, and identity-blocked rows.
- Successful ingestion can move rows from shallow buckets into `120+`, `200+`, or `252+` buckets as appropriate.
- At least a sampled trusted set shows current completed EOD, `120+` bars, recent positive volume, and truthful adjusted-close fallback status.
- A deeper sample shows whether `200+` and `252+` coverage is sufficient for Data Quality, Strategy Decision, Signal Quality, Smart Money, and Trade Plan consumers.
- Today Review, Strategy Decision, Signal Quality, and Trade Plans remain conservative where data is still stale, shallow, missing volume, or not mature.

## 8. Priority Rationale

MD-A3 should follow MD-A2 because MD-A2 removed the user-hostile sync workflow but did not solve data depth. The audit identified deep OHLCV history as the next major blocker after bounded sync progress: provider-supported rows can still remain analytically unusable if they only have a shallow recent window.

This packet has higher immediate product value than downstream feature work because downstream modules cannot become trustworthy by changing copy or UI. They need a local trusted universe with enough current price depth.

This packet should proceed before provider-expansion work if MD-A2/live health evidence still shows a meaningful supported shallow subset. If fresh evidence shows too few provider-supported rows exist to backfill, Orchestrator should pull Provider Validation Drain first and return to MD-A3 once a supported subset exists.

## 9. Live Evidence PO Needs

PO needs live/local evidence, not only code review, before accepting MD-A3:

- `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` before and after repair, showing price-depth, stale, volume, and trusted-count movement.
- `GET /api/v1/market-data/universe/health?region=IN&assetType=STOCK` before and after repair, including expected latest completed trading date and stored EOD agreement.
- `GET /api/v1/market-data/universe/repair-plan?region=IN&assetType=STOCK` before and after repair, showing shallow-history queues and remaining blockers.
- A bounded repair run record showing scope, effective backfill start/end dates, batch limits, progress/status, terminal counts, zero-row/failure samples, and remaining candidates.
- Sampled instrument evidence for at least 20 repaired/trusted candidates with latest completed EOD, bar count, recent volume, adjusted-close provenance/fallback status, and threshold bucket.
- A deeper sample showing `200+` and `252+` coverage for strategy/data-quality consumers.
- Evidence that no current in-progress trading date was stored or counted as EOD readiness.
- Evidence that downstream consumers still fail closed for rows that remain below required thresholds.

## 10. Rejections

PO will reject MD-A3 if any of the following are true:

- The solution treats provider-supported count or price-row existence as review readiness.
- The user must know internal `fullReload` behavior to repair shallow history.
- A visible repair action starts a hidden whole-universe request without bounded status/progress.
- In-progress current-day candles are fetched or counted as completed EOD.
- Rows below `120`, `200`, and `252` bars are merged into a vague "price ready" state.
- Provider zero-row responses or insufficient history are hidden as success.
- Missing/zero volume is ignored for trusted-review candidates.
- Adjusted-close fallback is represented as true adjusted-close coverage.
- Downstream modules are relaxed to compensate for missing Market Data depth.

## 11. Orchestrator Intake Recommendation

Recommended intake status: `READY_FOR_ORCHESTRATOR`.

Suggested packet title: `MD-A3 - Deep Price Backfill For Supported Shallow Rows`.

Suggested implementation owner: Market Data Foundation lane, with QA requiring live/local bounded repair evidence.

Suggested sequencing condition: start MD-A3 now if live health shows a supported shallow subset. If fresh local evidence shows supported candidates are too few to matter, route Provider Validation Drain first, then resume MD-A3.

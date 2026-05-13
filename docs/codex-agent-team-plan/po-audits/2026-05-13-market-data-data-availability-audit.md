# Market Data Data-Availability Audit - 2026-05-13

## 1. Executive Summary For PO

The investment workflow is blocked primarily because the local `IN / STOCK` catalog is not yet a usable review universe. Cycle 2 live evidence recorded `catalogCount=2907`, `providerSupportedCount=597`, `trustedCount=0`, and `reviewReady=0`; the top blockers were provider validation, price backfill, stale EOD data, catalog identity gaps, and insufficient trusted universe size. I attempted to refresh the read-only local APIs for this audit, but `127.0.0.1:3000` was not running, so these counts remain a dated Cycle 2 runtime snapshot rather than a current live measurement.

The highest-value product repair is not downstream wording or signal/strategy logic. The system needs to create enough trusted, current OHLCV rows for stocks before signals, Signal Quality, Strategy Decision, Today Review, and Trade Plans can produce useful outcomes. Today Review is correctly fail-closed while `Trusted Review Universe` is `NO_REVIEW`; that is a safety success, but it means user value is locked until Market Data repair actually moves stocks into the trusted subset.

The likely root cause chain is:

1. Too many catalog rows remain `providerSupportStatus=UNKNOWN` or retry-failed, so the system cannot prove provider coverage.
2. Provider-supported rows still need price backfill and stale-EOD repair before they can become trusted.
3. Historical OHLCV depth and rolling-window completeness are stricter for full readiness than Lite review, and many rows likely have no or shallow price history.
4. Volume is a hard trusted-universe input; missing/zero recent volume prevents price-action review even when close prices exist.
5. Metadata gaps block strict full-catalog signoff, but should not block Lite price-action review. Product work must keep this distinction intact.
6. The repair workbench exists as a bounded control surface, but the next priority is proving that its lanes drain real queues and produce a non-zero trusted universe.

## 2. Evidence Reviewed

Governance and readiness contracts:

- `docs/architecture.md:25` says catalog presence is not reviewable universe readiness and requires explicit provider, price, freshness, volume, and metadata blocker counts.
- `docs/architecture.md:27` defines Market Data repair as first-class bounded workflows: provider validation, catalog identity repair, provider business metadata repair, manual metadata import, and price backfill.
- `docs/architecture.md:31` defines strict full-catalog `universeSignoff.downstreamAllowed`, and allows Today Review Lite only from the separate Trusted Review Universe.
- `docs/architecture.md:63` says Today Review must obtain and load Trusted Review Universe membership and fail closed when unavailable.
- `docs/architecture.md:1079` through `docs/architecture.md:1082` defines Full Catalog Health versus Trusted Review Universe, including current EOD, 120 OHLCV bars, recent volume, adjusted-close fallback, and data-through dates.
- `docs/module-verification-register.md:22` through `docs/module-verification-register.md:59` records Market Data invariants, tests, and open live-repair risks.
- `docs/module-verification-register.md:176` through `docs/module-verification-register.md:182` records Today Review dependency on Trusted Review Universe and Lite candidate data requirements.
- `docs/module-verification-register.md:215` through `docs/module-verification-register.md:235` records Trade Plan insufficient-data and proof-chain behavior.

Market Data module context:

- `backend/src/modules/market-data-foundation/market-data-foundation.md:32` through `backend/src/modules/market-data-foundation/market-data-foundation.md:34` documents the readiness contract, repair workflow, and provider-proof repair from OHLCV.
- `backend/src/modules/market-data-foundation/market-data-foundation.md:182` through `backend/src/modules/market-data-foundation/market-data-foundation.md:199` documents universe health counts and price/context/review-ready rules.
- `backend/src/modules/market-data-foundation/market-data-foundation.md:205` through `backend/src/modules/market-data-foundation/market-data-foundation.md:209` documents Trusted Review Universe and review-readiness summary endpoints.
- `backend/src/modules/market-data-foundation/market-data-foundation.md:216` through `backend/src/modules/market-data-foundation/market-data-foundation.md:223` documents trusted-instrument requirements and scan ordering.
- `backend/src/modules/market-data-foundation/market-data-foundation.md:230` through `backend/src/modules/market-data-foundation/market-data-foundation.md:248` documents repair-plan counts and bounded repair endpoints.
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts:7` defines `STANDARD_REVIEW_MIN_BARS=252`; `:95` through `:100` block on inadequate history, rolling-window incompleteness, price gaps, and volume gaps.
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts:121` through `:148` separate price readiness, metadata readiness, context readiness, and review readiness.
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts:838` through `:1002` computes per-symbol price readiness stats from stored `PriceTick` rows, including latest date, latest volume, rolling-window coverage, max gap, adjusted-close coverage, and close fallback.
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts:1165` computes latest stored trading date by region/scope from stored price ticks.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:3103` computes expected latest trading date and classifies readiness for scoped stocks.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:3186` defines trusted-universe excluded counters including under-120 bars, under-252 bars, and missing recent volume.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:3267` through `:3335` converts provider validation, catalog identity, price backfill, stale EOD, business metadata, insufficient trusted universe, and calendar uncertainty into review-readiness blockers.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:3488` through `:3646` defines strict signoff blockers and `downstreamAllowed`.
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts:101` through `:135` exposes latest stored/current candle freshness, while `market-data-foundation.md` documents the scheduler disabled-by-default and bounded by batch size.
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts:189` through `:190` classifies missing latest completed candles as `MISSING_LATEST_COMPLETED`.
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:5364` maps session skip states such as `MARKET_CLOSED_NO_SYNC` and `MARKET_OPEN` to `MARKET_CLOSED_NO_NEW_DAILY_DATA`, and `:5383` / `:5415` count provider-fetch skips.
- `backend/src/modules/market-data-foundation/market-data-foundation.md:450` through `:480` documents the no-new-data skip path and the candle freshness fields that distinguish "provider fetch skipped because no useful new daily candle is expected" from "latest completed candle is stored."

Downstream dependency evidence:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts:1072` records whether signal scoring input has volume; `:1168` normalizes volume; `:1208` treats null volume as no OBV movement.
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts:321` through `:386` loads forward price windows and counts missing price history or insufficient future rows.
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx:237` and `:301` through `:328` expose insufficient future price and missing price history to users.
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts:331` through `:371` marks missing price history, raw signal, data quality, smart money, and market context as data gaps before strategies evaluate.
- `backend/src/modules/today-trade-review/today-trade-review.service.ts:191` through `:275` obtains review readiness and Trusted Review Universe, then fails closed or records partial scan evidence.
- `backend/src/modules/today-trade-review/today-trade-review.service.ts:569` through `:636` only builds Lite candidates from trusted OHLCV rows; `:679` through `:689` uses recent volume confirmation.
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts:217` through `:240` blocks Trade Plans when latest price is missing or history has fewer than 10 bars.
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts:68` through `:136` classifies paper readiness as insufficient data when latest price, history, proof, or data-quality inputs are missing.

Cycle 2 planning and evidence:

- `docs/codex-agent-team-plan/po-current-state-review-2026-05-13-cycle2.md` records the live snapshot: `NO_REVIEW`, `NOT_TRUSTWORTHY`, `catalogCount=2907`, `providerSupportedCount=597`, `trustedCount=0`, `reviewReady=0`, and top blockers.
- `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-work-packets.md` defines C2-WP-01 Trusted Universe Repair Workbench as the Market Data repair lane.
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-c2-wp01-qa-evidence.md` signs off the workbench as bounded and scoped, while noting runtime lane-click and Today Review runtime verification risks were handled by addendum.
- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-wp02-signal-quality-gap-discovery.md` records Signal Quality's model-version filter gap, relevant later for calibration quality but not the primary reason stocks lack market data.
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-cycle2-architecture-contracts.md` defines the workbench and consumer boundaries.

Blocked live refresh:

- Read-only calls to `http://127.0.0.1:3000/health`, `/api/v1/market-data/review-readiness-summary`, `/api/v1/market-data/review-universe`, and `/api/v1/market-data/universe/health` failed because the local backend was not running. I did not start services or mutate data because this audit is planning-only.

## 3. Root-Cause Hypotheses Ranked By Likely Business Impact

1. **Provider support is the largest immediate blocker.**
   Cycle 2 live evidence showed `PROVIDER_VALIDATION=2310` with only `597` provider-supported rows. Rows with `UNKNOWN` support remain catalog-only and cannot be reviewed. Business impact: most stocks are excluded before price or signals matter.

2. **Price backfill and stale latest EOD block all trusted-review value for supported rows.**
   Cycle 2 evidence showed `PRICE_BACKFILL=597` and `STALE_EOD=592`. Supported identity without current EOD candles still produces `trustedCount=0`. Business impact: even the provider-supported subset cannot feed Today Review, signal outcomes, or trade plans.

3. **Historical OHLCV depth is likely insufficient for both full readiness and downstream evidence.**
   Full `PRICE_READY` requires 252 bars and a complete rolling 252-session window; Trusted Review Lite requires at least 120 bars. Signal Quality needs forward windows after generated signals. Business impact: shallow history prevents raw technical reliability, evidence maturity, calibration, and backtests.

4. **Latest EOD freshness is a hard review gate, not a warning.**
   The contract rejects Friday data when Monday EOD is expected and blocks on market-calendar uncertainty. Business impact: a single stale data-through date can keep the trusted universe at zero even if historical rows exist.

5. **Volume coverage is a hard price-action blocker.**
   Trusted review requires recent volume. Signal Generation, Today Review Lite, smart-money context, and trade-plan confidence all use volume-sensitive logic. Business impact: OHLC rows without usable volume are not enough for the app's intended price-action workflows.

6. **Catalog identity gaps block strict signoff and can also prevent provider-price repair from targeting the right instrument.**
   Cycle 2 evidence showed `CATALOG_IDENTITY=112`. Business impact: identity issues are smaller than provider/price queues, but wrong/missing provider symbols, ISIN, listing date, or exchange identity can make repair unreliable and cause NSE/BSE collision risk.

7. **Trusted universe thresholds are functioning as intended, but current count is below the Lite floor.**
   Defaults are Lite minimum `100` and Full minimum `300`. With `trustedCount=0`, Today Review must remain `NO_REVIEW`. Business impact: no daily review value until at least the Lite minimum is reached.

8. **Scheduler/session behavior can create a false no-new-data result while latest completed EOD is still missing.**
   The observed failure mode is: `latestCompletedCandleStored=false` / `candleSyncStatus=MISSING_LATEST_COMPLETED`, but sync skips provider fetches because the current market session reports no useful new daily data (`MARKET_CLOSED_NO_NEW_DAILY_DATA`). This is a data-availability defect, not a copy issue. The repair path must force or route stale/latest-completed backfill even when the current session cannot produce today's candle. Business impact: the system can remain stale forever if the missing completed candle is never fetched because the current session is not useful.

9. **Business metadata is a strict full-catalog blocker but should not be the next bottleneck for Lite value.**
   Sector, industry, market cap, ISIN, and listing date are context gaps for Trusted Review Lite but strict signoff blockers for full catalog. Business impact: important for context, screens, sector analysis, and full signoff, but lower than price availability while trusted count is zero.

10. **Repair workbench gaps are now operational, not conceptual.**
    C2-WP-01 created bounded lanes and QA signed off. The remaining product risk is whether real repair runs drain queues, classify unsupported rows, and increase trusted count. Business impact: without live run evidence, the user may still see good diagnostics but no usable stocks.

11. **Downstream consumption assumptions are mostly fail-closed and should not be loosened first.**
    Today Review, Trade Plans, Signal Quality, and Strategy Decision already expose missing/insufficient data. Business impact: changing downstream assumptions before Market Data is available would risk false usefulness. The repair should happen upstream.

## 4. User-Value Impact By Workflow

**Signals:** Raw signal generation can process some instruments if data-quality settings allow missing evaluations, but confidence drops with stale data, shallow history, missing volume, and missing fundamentals. The user may see raw bullish/neutral/bearish rows, but they are not enough for review value without auditable current source data and sufficient price history.

**Signal Quality / Calibration:** Signal Quality cannot measure outcomes when price history is missing or when future rows are not yet available after signal dates. Cycle 2 evidence showed `20D` evidence unavailable with many missing price-history rows. Calibration correctly falls back to raw score authority when evidence is missing, so it cannot improve downstream decisions until forward price coverage exists.

**Strategy Decision:** Strategy Decision builds context from Market Data, raw signals, Data Quality, smart money, market context, and strategy proof. Missing price history, raw signal, data quality, smart-money, or sector context become data gaps. Weak market data means decisions either fail, downgrade, or carry gaps rather than becoming reliable review candidates.

**Today Review:** Today Review is the clearest blocked workflow. It requires Trusted Review Universe health and membership loading before any candidate publication. With `trustedCount=0`, it publishes zero candidates. This is correct safety behavior, but it means the daily shortlist has no user value until Market Data creates trusted instruments.

**Trade Plans:** Trade Plans need latest price, enough history to compute levels, data-quality proof, and strategy decision proof. Missing latest price or fewer than 10 bars immediately produces `INSUFFICIENT_DATA`; broader proof-chain gaps keep paper-ready count at zero. Trade Plans should not be fixed by relaxing this while data is missing.

## 5. Top Priority Requirements To Fix Data Availability

### Requirement 1 - Drain Provider Validation To A Classified Universe

- **Workflow:** Market Data repair workbench, then every downstream workflow.
- **User value:** Turns catalog rows into known supported or unsupported instruments so the user knows which stocks can ever receive data.
- **Acceptance criteria:** For `IN / STOCK`, repeated bounded provider-validation runs reduce `providerUnknownValidationNeeded` to `0` or expose explicit retry-failed counts; clean unsupported rows are excluded from price/metadata blockers but remain visible; successful OHLCV ingestion or existing usable price history repairs `UNKNOWN` to `SUPPORTED`; readiness summary updates after each run.
- **Lane/module guess:** Lane 1, `market-data-foundation`.
- **Dependencies:** Existing workbench endpoints, Yahoo provider symbol mapping, catalog identity fields where provider symbol is missing.
- **Priority rationale:** No provider proof means no price repair, no trusted universe, and no downstream review value.

### Requirement 2 - Backfill Current EOD OHLCV For Provider-Supported Stocks

- **Workflow:** Market Data repair workbench, Today Review, Signal Quality, Trade Plans.
- **User value:** Creates actual usable price rows for supported stocks and moves the system from diagnostics to reviewable inputs.
- **Acceptance criteria:** Bounded price backfill for provider-supported `IN / STOCK` rows reduces `supportedPriceBackfillNeeded`; `storedDataThroughDate` reaches `requiredDataThroughDate`; latest EOD no longer stale for repaired rows; backfill does not fetch in-progress candles; zero-row provider results are not marked successful; trusted count becomes greater than `0`.
- **Lane/module guess:** Lane 1, `market-data-foundation`.
- **Dependencies:** Requirement 1 for provider-supported set; session/date policy; provider historical fetch.
- **Priority rationale:** Cycle 2 showed all supported rows still needing price backfill and almost all stale; this directly blocks trusted universe creation.

### Requirement 3 - Reach Trusted Review Lite Minimum With 120-Bar OHLCV And Recent Volume

- **Workflow:** Today Review Lite, Signal Generation input quality, Trade Plan setup quality.
- **User value:** Unlocks a non-empty daily review shortlist without waiting for strict full-catalog signoff.
- **Acceptance criteria:** At least `TRUSTED_REVIEW_MIN_LITE` active supported `IN / STOCK` instruments have current latest EOD, at least 120 OHLCV bars, recent volume, adjusted-close coverage or close fallback warning, and no critical corporate-action blocker; `reviewMode` changes from `NO_REVIEW` to `LIMITED_REVIEW` or better; Today Review can scan trusted membership without fallback to Strategy Decision.
- **Lane/module guess:** Lane 1, `market-data-foundation`; Today Review read-only verification by Lane 3 only after Market Data evidence exists.
- **Dependencies:** Requirements 1 and 2; price history depth; volume coverage.
- **Priority rationale:** This is the first product-useful milestone: a limited but honest daily review can exist before full catalog repair is complete.

### Requirement 4 - Close Latest-EOD Freshness Loop For Repaired Stocks

- **Workflow:** Daily Market Data status, Today Review, Signal Quality maturity.
- **User value:** Prevents a repaired universe from becoming stale again the next trading day.
- **Acceptance criteria:** Scheduler/status or manual run evidence clearly shows latest completed trading date, latest stored date, and candle sync status for `IN / STOCK`; when `candleSyncStatus=MISSING_LATEST_COMPLETED`, a bounded repair/backfill path fetches the missing completed candle even if the current session maps to `MARKET_CLOSED_NO_NEW_DAILY_DATA`; provider-fetch skips are not treated as current when `latestCompletedCandleStored=false`; post-close or manual bounded runs can catch up stale latest EOD; session uncertainty blocks visibly but does not silently tolerate stale data; final candle confirmation is persisted when no-op rows prove the candle is stable.
- **Lane/module guess:** Lane 1, `market-data-foundation`.
- **Dependencies:** Requirements 2 and 3; scheduler config; market-session helper.
- **Priority rationale:** Freshness is a hard trusted-review gate; without this loop, unlocked value is temporary.

### Requirement 5 - Repair Catalog Identity For Supported Rows That Block Price Or Strict Signoff

- **Workflow:** Market Data repair, strict signoff, per-instrument diagnostics.
- **User value:** Makes repair targeting and stock identity trustworthy, especially for NSE/BSE collisions.
- **Acceptance criteria:** `supportedCatalogIdentityRepairNeeded` reaches `0` or is reduced to explicit manual/unmatched rows; catalog repair updates only the matched stock id; source fingerprints protect stable offsets; missing provider symbols that prevent price backfill are resolved or classified.
- **Lane/module guess:** Lane 1, `market-data-foundation`.
- **Dependencies:** Catalog source availability; stable-source repair workflow.
- **Priority rationale:** Smaller live blocker count than provider/price, but essential for correctness and avoiding wrong-row repairs.

### Requirement 6 - Preserve Volume And Adjusted-Close Quality During Backfill

- **Workflow:** Signal Generation, Smart Money, Today Review Lite, Trade Plans.
- **User value:** Ensures available OHLCV is usable for price-action evidence, not just close-price charts.
- **Acceptance criteria:** Backfilled rows preserve volume when provider supplies it; rows with missing/zero recent volume remain excluded from trusted review and counted separately; adjusted close is stored when supplied; close fallback is flagged as a warning, not hidden; volume/adjusted-close coverage appears in instrument readiness.
- **Lane/module guess:** Lane 1, `market-data-foundation`; downstream modules remain read-only consumers.
- **Dependencies:** Requirement 2; provider historical payload quality.
- **Priority rationale:** Volume is a hard input for review usefulness; adjusted close affects historical returns and signal evidence.

### Requirement 7 - Make Business Metadata Repair A Full-Signoff Follow-Up, Not A Lite-Review Blocker

- **Workflow:** Full Catalog Health, Market Context, Research Hub, screeners.
- **User value:** Adds sector/industry/market-cap context after price-action value is unlocked.
- **Acceptance criteria:** Missing sector, industry, market cap, ISIN, and listing date remain visible; Trusted Review Lite continues to treat them as context gaps; strict signoff still fails until provider/manual business metadata queues drain; manual CSV import requires valid sector, industry, and positive market cap.
- **Lane/module guess:** Lane 1, `market-data-foundation`.
- **Dependencies:** Provider business metadata repair, manual template/export/import.
- **Priority rationale:** Important, but lower than price availability while trusted universe is zero.

### Requirement 8 - Prove Downstream Consumers Use Trusted Membership Without Relaxing Data Gates

- **Workflow:** Today Review, Strategy Decision candidate filtering, Trade Plans.
- **User value:** Ensures newly available data is consumed safely and only for trusted stocks.
- **Acceptance criteria:** Today Review records trusted membership load status, scanned/skipped counts, outside-trusted-universe exclusions, and `LIMITED_REVIEW` or `FULL_REVIEW`; Strategy Decision candidates outside trusted membership stay excluded from Today Review; Trade Plans still report insufficient data when latest price/history is missing.
- **Lane/module guess:** Lane 3 read-only verification after Lane 1 repair evidence; no source changes unless a real consumption bug appears.
- **Dependencies:** Requirement 3 trusted count greater than zero.
- **Priority rationale:** This validates user value after upstream repair without shifting root-cause work downstream.

## 6. Explicitly Out Of Scope

- Paid market-data providers, paid hosted tools, paid browser/visual testing services, paid AI services, or hosted infrastructure.
- Broker integration, order placement, live trading, autonomous trading, intraday execution, or paper trading implementation.
- Advice wording changes, buy/sell/execute language, or recommendation semantics.
- Validation-message-only fixes when the underlying issue is missing provider support, missing latest EOD, shallow OHLCV history, missing volume, or unavailable trusted membership.
- Downstream signal, strategy, Today Review, or Trade Plan behavior changes that make missing data appear usable.
- Starting implementation, running repair jobs, mutating provider data, or editing production source during this PO audit.

## 7. Open Questions For Architect / Orchestrator

1. Should the next active work packet be a live-repair evidence run for C2-WP-01, with an explicit goal of moving `trustedCount` from `0` to at least the Lite threshold, before any Cycle 3 backlog resumes?
2. What is the accepted operator process for running bounded provider validation and price backfill against the local database: manual one-lane actions, operational drain mode, or a guided sequence with checkpoints?
3. Do we need a small configured review universe as an interim product scope, or should the default `IN / STOCK` Lite minimum remain the unlock target?
4. Should scheduler enablement and post-close catch-up be part of the immediate repair packet, or a second packet after a one-time trusted universe is achieved?
5. Does Architect want a separate invariant that `MISSING_LATEST_COMPLETED` always overrides `MARKET_CLOSED_NO_NEW_DAILY_DATA` provider-fetch skip logic for stale-EOD repair?
6. If Yahoo coverage cannot provide enough Indian stocks with volume and 120 bars, what is the allowed free/local fallback classification path: unsupported classification only, curated symbol correction, or manual CSV identity repair followed by Yahoo validation?
7. Should live repair evidence include a saved snapshot under `docs/codex-agent-team-plan/qa-evidence/` after Orchestrator authorizes mutating repair runs?

## PO Decision

Park Cycle 3 feature backlog until Market Data produces a non-zero trusted review universe. The next product priority should be upstream data availability: classify providers, backfill current EOD OHLCV, reach the Trusted Review Lite threshold, and prove Today Review can scan that trusted membership. Downstream improvements should consume the fixed data, not compensate for missing data.

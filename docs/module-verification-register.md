# Module Verification Register

This register is the trust artifact for module-hardening work. A module is not considered fully verified because a page loads or an API returns data. It needs explicit invariants, tests, browser checks, and known gaps.

## Verification Standard

For each touched module:

- Define the business invariants the module must preserve.
- Add backend semantic tests for calculations, persistence keys, filtering, and idempotency where applicable.
- Add module-owned UI tests under `frontend/tests/ui` for visible workflows, filters, range selectors, request payloads, progress states, and domain-specific empty states.
- Verify changed user-visible behavior in the browser.
- Record remaining limitations instead of hiding them behind green smoke tests.

## Current Touched Modules

### Market Data Foundation

Key invariants:
- Catalog rows must be region-aware and must not mix unrelated asset classes unless the user selects them.
- Instrument classification must distinguish asset type and segment/class.
- Catalog import/backfill must be idempotent and preserve non-null provider metadata.
- Catalog presence must not be treated as reviewable universe readiness. Market Data Foundation must classify scoped instruments into explicit universe states and expose provider, price, metadata, and review-ready coverage.
- Provider `UNKNOWN`, missing latest price, stale latest price, inadequate history, missing recent volume, missing sector, and missing industry must remain visible as blockers in API/UI health.
- Provider validation must be staged. Fresh `UNKNOWN` rows are validated before retryable `VALIDATION_FAILED` rows; retry failures remain explicit blockers until retried or classified, while clean `UNSUPPORTED` rows are excluded from downstream metadata/price blockers but remain visible.
- Price freshness for `PRICE_READY` requires latest stored EOD date greater than or equal to the expected latest completed trading date. Friday data is stale when Monday EOD is expected; missing market-calendar certainty is a blocker.
- Provider validation, catalog identity repair, provider business metadata repair, manual metadata import, and price backfill must be explicit bounded repair workflows with `batchSize`, `nextOffset`, and `hasMore`; mutating queues must not use advancing offsets against shrinking predicates, while catalog/manual source-list repairs may page over stable source rows.
- Operational repair runs must orchestrate Market Data repair actions in dependency order, stay bounded by batch size and max batches per action, persist before/after health and repair-plan snapshots, stop as `PARTIAL` on action failure or unfinished requested queues, expose `anotherRunNeeded`, `expectedNextAction`, `hardBlockersRemaining`, and final trust status, and keep remaining blockers visible.
- Universe signoff must be explicit in health, repair-plan, latest-run, and repair-run responses. `downstreamAllowed` is false unless `universeSignoff.status=PASS`; the default `IN / STOCK` threshold requires provider unknown `0`, retry-failed provider validations `0`, unresolved provider-supported catalog identity `0`, provider-supported business metadata auto/manual/retry queues `0`, provider-supported price backfill needed `0`, latest stored EOD at or after expected EOD, at least the configured review-ready minimum (default 300), at least 10% review-ready coverage unless a configured review universe exists, and `trustStatus=OK`.
- Drain repair runs use `mode=DRAIN_UNTIL_BLOCKED`, run dependency-ordered bounded batches, stop as `PARTIAL_BLOCKED` when a queue does not decrease, and stop as `PARTIAL_MANUAL_REQUIRED` when only curated manual metadata remains without CSV.
- Stable source-list resume offsets must be guarded by source fingerprints. Catalog identity repair fingerprints include source identity and content/row hashes; manual metadata import fingerprints include CSV text hash. Fingerprint changes must restart at offset 0 with an operator warning. Operational catalog identity repair must load the source once per run action and reuse that same rows/fingerprint snapshot for every batch; source-load failure must stop the action as `PARTIAL` before any stale offset is reused.
- Health counts must keep readiness dimensions separate from exact universe states. Downstream review gates use `counts.readiness.*`; `counts.byUniverseState.*` is diagnostic evidence for final state classification.
- Provider business metadata repair must use a business-only queue (`sector`, `industry`, `marketCap`), persist no-provider/no-fields-filled/partial repair attempts, maintain durable current repair state, skip `MANUAL_REQUIRED` rows on non-forced batches, honor future `FAILED_RETRYABLE.nextRetryAt`, and expose auto-repairable, manual-required, retry-blocked, and retry-eligible counts as distinct stocks.
- Manual metadata import is the fallback for full business metadata, not only sector/industry. `manualBusinessMetadataRequired` is the primary repair-plan/UI count and includes market-cap-only gaps; `manualSectorIndustryRequired` is a narrower compatibility/detail count. Manual imports require valid sector, valid industry, and positive numeric market cap before a row can resolve provider-business metadata.
- Manual metadata CSV import is a stable source-list workflow and must preserve/send `nextOffset` from the UI so large curated files can drain over multiple batches. The manual template export endpoint must show unresolved business metadata rows with required fields and fill-in columns.
- Catalog identity repair must update only the stock id matched by the service and protect NSE/BSE duplicate-symbol/name collisions from updating the wrong row.
- Successful OHLCV ingestion or existing usable price history is provider-support proof and must repair `UNKNOWN` provider support to `SUPPORTED`.
- Catalog identity repair is the primary path for deterministic `IN / STOCK` ISIN/listing-date/source-symbol/provider-symbol repair. Provider business metadata repair must not count inferred country/currency/asset-type fallbacks as provider success. Manual metadata import must reject null-equivalent sector/industry values.
- Metadata repair must be no-op safe and provenance-correct; it must not report success when missing sector, industry, market cap, ISIN, or listing date did not improve.
- Corporate actions must be idempotent on stock/date/type/source plus relevant amount or split-ratio fields. Same-batch provider duplicates must collapse before upsert, and existing duplicate rows must be cleaned up or deduped on read.
- Configured URL import must use only configured/default safe URLs and keep manual CSV fallback.
- Bulk import/sync UI must continue until backend reports `hasMore=false`.

Evidence:
- UI tests cover table columns, compact filters, import/backfill actions, and configured URL import request payload.
- Backend market-data tests cover metadata/backfill/import idempotency, corporate-action same-batch deduplication, read-time duplicate collapse, and idempotent cleanup of legacy duplicate rows.
- Backend universe tests cover catalog-only, provider-supported without prices, Friday/Monday stale price, rolling price-window/gap checks, market-calendar uncertainty, price-ready, context blockers, review-ready, unsupported, inactive/delisted, all-provider-UNKNOWN trust failure, provider support repair from stored price history, scoped health counts, and STOCK/EQUITY/null compatibility for universe health.
- Backend service tests cover bounded provider validation success, UNKNOWN-first default validation, explicit retry-failed provider validation, stable offset-zero repair queue behavior, clean unsupported validation, retryable validation failure, successful OHLCV support marking, catalog identity repair by matched stock id, stable source-list catalog pagination, no-op catalog accounting, provider business metadata drainability with durable manual-required state, no-op/manual-required accounting, provider partial/full/error outcomes, manual metadata partial versus resolved provider-business state, manual metadata null-equivalent rejection, supported-only repair-plan breakdown counts, EOD-capped price backfill, and zero-row provider backfill not being marked successful.
- Backend service tests cover operational repair-run dry-run/no-mutation behavior, dependency-order execution, drain-mode UNKNOWN-first provider validation, explicit retry-provider diagnosis after the UNKNOWN queue drains, `PARTIAL` failure handling, `PARTIAL_BLOCKED` no-decrease handling, `PARTIAL_MANUAL_REQUIRED` manual fallback handling, before/after snapshot persistence, max-batch loop bounds, source-fingerprint resume/restart behavior, single-load catalog source snapshot reuse across run batches, source-load failure before offset reuse, latest-run operator fields, remaining blocker reporting, signoff PASS/FAIL thresholds, manual template export, and strict trust/readiness preservation.
- Backend repository tests cover UNKNOWN-first and retry-failed provider validation selectors, provider-business selector scope excluding identity-only gaps and non-supported providers, durable current-state filtering/counts, future retry exclusion, retry-eligible counting, explicit forced retry behavior, and catalog identity repair updating only the provided stock id.
- UI tests cover Universe Health rendering, Universe Signoff FAIL/downstream-blocked display, distinct catalog/review-ready counts, provider unknown/retry-failed/unsupported-excluded counts, missing price/history/volume blockers, missing sector/industry blockers, supported identity/business/price blocker counts, auto-repairable/manual-required/retry-blocked/retry-eligible/recently-attempted/manual-business-metadata repair-plan counts, operational repair-run dry-run/start/drain request payloads, before/after run evidence, non-green completed-but-untrusted latest-run states, partial-run warning states, separate unknown-provider/retry-provider/catalog/business/manual/price repair request payloads, manual template export, manual CSV validation including market cap, drainable manual CSV `nextOffset` behavior, partial/no-op/manual-required warning states, health refresh, and poor-coverage trust language.
- UI tests cover the instrument detail corporate-action table for a persisted duplicate-action route.

Open verification risk:
- Full provider/catalog imports are intentionally not run in every UI test. They require manual browser verification when import behavior changes.
- Universe Health is computed from persisted local data; provider validation, catalog identity repair, provider business metadata repair, manual metadata import, and broad price backfill are repair actions and are not automatically run by the health endpoint.
- Live metadata improvement depends on configured catalog source availability and provider coverage. If provider business metadata cannot fill sector/industry for Indian small/mid-cap names, persisted manual-required current state and curated manual CSV import are the required fallback path.
- Step 1.5 signoff depends on live repair-run evidence moving queues in the right direction or explicitly classifying source/provider limitations. Passing tests alone is not enough if live provider/catalog/price/manual metadata counts do not improve or classify; `universeSignoff.status=FAIL` with `downstreamAllowed=false` is expected while live blockers remain.

### Data Quality Engine

Key invariants:
- Evaluation must be scoped by global region and asset type.
- Batch evaluation must use bounded batch requests and frontend orchestration.
- Coverage/readiness statuses must be visible and not collapsed into generic empty states.

Evidence:
- UI tests cover scoped controls and the bounded batch request payload.

Open verification risk:
- Scoring semantics need backend tests whenever coverage/liquidity/readiness formulas change.

### Signal Generation Engine

Key invariants:
- Signals are raw confirmation inputs, not trade decisions.
- Batch generation must be scoped and bounded.
- Data-quality filtering must remain explicit and enabled by default where configured.

Evidence:
- UI tests cover raw-signal language, filters, and scoped bounded batch request payload.

Open verification risk:
- Raw signal formula changes need semantic backend tests proving directional/scoring behavior, not only persistence.

### Signal Quality Lab

Key invariants:
- Outcomes are historical measurements, not predictions or advice.
- Horizon selection must affect recalculation/read behavior.
- Counts must distinguish evaluated, unevaluated, skipped, missing-history, and warning states.
- Direct links and hard reloads must settle into measured content, a domain-specific insufficient-data state, or a Signal Quality retryable error. They must not stay on a generic progress indicator.
- Historical regime grouping must batch lookups by unique generated date/scope and fall back to `MISSING_REGIME_CONTEXT` with warnings when snapshot lookup fails.

Evidence:
- Backend tests cover bounded historical-regime lookup behavior and partial dashboard diagnostics when snapshot lookup fails.
- UI tests cover horizon controls, bounded recalculation payload, direct-link/hard-reload resolution, and timeout Retry state.

Open verification risk:
- Outcome availability and horizon math require backend semantic tests whenever calculation changes.

### Strategy Framework

Key invariants:
- Strategy Framework owns reusable strategy definitions and deterministic evaluator contracts.
- It must not introduce live trading, broker execution, or order placement.
- Strategy registry UI should expose scope/readiness information without raw config dumps as the main experience.
- Category and status boundaries are part of the contract: active `ENTRY` strategies can be standalone registered backtests; `EXIT`, `GATE`, `FILTER`, and `DRAFT` definitions are visible support semantics with disabled/explained backtest actions.

Evidence:
- Backend tests cover evaluator `eligibleForBacktest` semantics and service rejection for support/draft registered backtests.
- UI tests cover registry page, scope badges, category filters, and enabled versus disabled Backtesting Lab actions.

Open verification risk:
- Evaluator rule changes require strategy-specific backend tests.
- Exit/gate/filter simulations need future dedicated semantics before they can produce standalone proof.

### Strategy Decision Engine

Key invariants:
- Strategy Decision produces review candidates/risk levels, not buy/sell advice.
- Evaluation must be scoped and bounded.
- Strategy logic should come from Strategy Framework, not duplicated ad hoc.
- The Evaluate strategy selector and `strategy=ALL` expansion must be registry-backed. Active `ENTRY`/`EXIT` strategies are reviewable; `GATE`, `FILTER`, and `DRAFT` definitions stay out of default Strategy Decision evaluation.

Evidence:
- Backend tests cover registry-backed model exposure, `ALL` expansion, and additional active framework strategies beyond the legacy three.
- UI tests cover evaluation surface, dynamic Strategy Framework strategy options, market gate visibility, and scoped bounded evaluation payload.

Open verification risk:
- Decision scoring requires backend semantic tests when candidate/risk formulas change.

### Backtesting Strategy Lab

Key invariants:
- Registered Strategy mode is the primary proof path and must consume Strategy Framework public exports.
- Registered backtests should expose active `ENTRY` strategies only. `EXIT`, `GATE`, `FILTER`, and `DRAFT` definitions are not standalone entry simulations.
- Backtest runs must stay scoped by `region` and `assetType`, and bounded universe caps must be visible.
- Saved run history must not leak legacy unknown-scope or wrong-region runs into scoped views.
- Results must show availability, rating/readiness, benchmark, data coverage, and exit diagnostics where available.
- Trade-level return percentages must reconcile to cash P&L by using net P&L over committed entry capital.
- Persisted saved-run reads must repair stale trade-level net P&L/return percentages from entry, exit, quantity, costs, and committed entry capital when inputs are sufficient, and mark unreconciled aggregate capital/return proof as legacy invalid instead of displaying it as trusted.

Evidence:
- Backend tests cover registered strategy performance persistence, scoped symbol/universe resolution, bounded universe diagnostics, insufficient-history status, and rejection of non-entry/draft registered strategies.
- Backend tests cover scoped saved-run filtering so unknown-scope legacy runs are excluded from explicit `IN/STOCK` run-list requests.
- Backend tests cover net trade return/P&L math with entry and exit transaction costs.
- Backend tests cover read-time repair of stale saved-run trade net P&L/returns for product-owner examples and legacy-invalid aggregate marking.
- UI tests cover active entry strategy selector behavior, hiding support rules, scoped run-list requests, scoped registered run payloads, and insufficient-history result display without running a real bulk backtest.
- UI tests cover legacy-invalid saved-run warnings and repaired trade-return display.

Open verification risk:
- Real browser/manual verification is still needed for long-running full-universe backtests because UI smoke tests intentionally avoid provider/database-heavy simulations.

### Research Hub

Key invariants:
- Research Hub is a command center, not a raw data dump.
- It should prioritize strategy-proof-driven review candidates.
- Links must point to current module routes.
- Overview should avoid expensive full recalculations during normal page load.

Evidence:
- Backend tests cover overview fallback behavior and smart-money/strategy proof integration.
- Backend tests cover lightweight signal diagnostics usage so overview load does not enrich top signal rows.
- UI tests cover research-only language, review-candidate terminology, strategy proof, confirmation layers, scoped overview request params, and route links. Strategy Decision, Research Hub, and Trade Plan UI tests now assert the connected review-candidate wording while preserving API enum/field compatibility.

Open verification risk:
- Overview latency should be periodically checked against real local data after downstream modules grow.

### Today Trade Review

Key invariants:
- Today Trade Review is the primary before-market shortlist surface and persists daily `TodayReviewRun` / `TodayReviewCandidate` snapshots.
- The module composes public outputs from Strategy Decision, Strategy Framework proof, Data Quality, Market Context, Signal/Calibration, Smart Money, and Trade Plan Risk Engine; it must not import upstream repositories directly.
- Raw signals are support evidence only and must never create promoted candidates without Strategy Decision proof.
- Promoted long review candidates require usable Strategy Framework proof, acceptable data quality, acceptable market gate, and valid trade-plan geometry.
- Hard blockers force `BLOCKED`, grade `D`, and score override; positive proof/readiness reasons must not override active blockers.
- Missing proof maps to `UNPROVEN`; missing required data quality maps to `INSUFFICIENT_DATA` or watch-only instead of promoted A/B candidates.
- Manual runs are idempotent per `runDate + region + assetType`.

Evidence:
- Backend service tests cover idempotent run creation, signal-only non-promotion, hard trade-plan blockers, market gate closure, missing proof, missing data quality, hard-blocker score override, and grouped persisted latest reads.
- Backend controller tests cover `GET /today-review/latest`, `GET /today-review/runs`, `GET /today-review/runs/:id`, `GET /today-review/candidates/:id`, and `POST /today-review/run`.
- UI tests cover direct `/today-review` entry, no-run manual action, completed grouped shortlist display, blocked candidate blocker text, candidate detail panels, unsafe-language absence, and `IN / STOCK` request scope.

Open verification risk:
- Phase 1 reads the latest persisted upstream snapshots. If upstream modules hold stale but internally accepted snapshots, Today Review conservatively blocks, marks insufficient data, or marks unproven, but it does not repair upstream modules.
- Full daily shortlist quality depends on real local Strategy Decision and Trade Plan coverage; rerun browser validation after large upstream data refreshes.

### Historical Context Snapshots

Key invariants:
- Market, sector, and country snapshots must be scoped by `region` so one market's historical context cannot satisfy another market's lookup.
- Snapshot generation must pass global scope to Market Context and Market Data public APIs.
- Lookup and coverage reads must carry `region` and `assetType`; smart-money reads must filter through the related stock scope.
- Repeated generation for the same date/scope should update existing logical snapshots instead of creating duplicate market/sector/country rows.
- Sector snapshots must not rank metadata-gap buckets (`Unknown`, blank, `N/A`, `NA`, null-equivalent) as leadership/weakness evidence. Existing unknown-sector rows are hidden on read and unknown-sector lookup returns a metadata-gap explanation.
- Sector list limits apply after metadata-gap filtering, and coverage counts only known sector rows as ranked sector evidence while reporting metadata-gap rows separately.

Evidence:
- Backend service, validation, and repository tests cover scope defaults, scoped generation calls, scoped coverage/lookup reads, Prisma relation filters for smart-money snapshots, unknown-sector generation skipping, unknown-sector read filtering, and unknown-sector lookup gaps.
- Backend repository tests cover whitespace/null-equivalent metadata-gap rows ahead of named sectors and coverage counts excluding metadata gaps.
- UI tests cover scoped coverage/list requests, scoped generation payloads, scoped lookup queries, visible region columns, scoped success messaging, and hiding mocked `Unknown` sector rows from ranked tables.

Open verification risk:
- Data-quality snapshot coverage remains global until the data-quality snapshot model stores scope or exposes a stock relation.

### Trade Plan & Risk Management Engine

Key invariants:
- Trade Plans are research-support plan snapshots, not orders, broker execution, or live trading.
- Latest plan reads, plan lists, funnel diagnostics, and batch generation must respect global `region` and `assetType`.
- Batch generation must be bounded and expose processed/total progress metadata for frontend orchestration.
- Detail pages must not show a wrong-scope persisted plan.
- Paper-readiness counts must stay separate from generated, skipped, failed, blocked, watch-only, and insufficient-data counts.
- Batch-generated plans must calculate position sizing with the documented default planning capital base when no portfolio/capital is supplied, so paper-readiness is not blocked solely by missing UI capital input.
- Entry/stop/target geometry must use the planned entry zone when current price has not reached that zone.
- Money shown in plan tables/detail must use the persisted market-data currency or scoped fallback, not a hardcoded dollar sign.
- Long-plan stop geometry must be validated against the planned entry assumption and entry-zone floor; a stop inside or above the long entry zone is a blocker, not a low-risk valid plan.
- Hard blockers are canonical for readiness. A blocked plan must return `paperReadinessStatus = BLOCKED`, `riskGrade = HIGH`, no stale positive `paperReadinessReasons`, and persisted blocker reasons.
- List filters and funnel diagnostics must repair canonical geometry/readiness before counting or filtering by `paperReadyOnly`, `paperReadinessStatus`, `planStatus`, or `riskGrade`.
- Insufficient-data plans must remain in the `INSUFFICIENT_DATA` readiness bucket and must not be collapsed into `BLOCKED` just because data-gap blockers are present.

Evidence:
- Backend tests cover scoped latest-plan lookup, scoped/idempotent persistence keys, persisted proof snapshot fields, default planning capital sizing, batch failure isolation, progress metadata, and funnel diagnostics.
- Backend tests cover planned-entry-zone stop/target/sizing geometry.
- Backend tests cover stop inside the entry zone, stop above the entry-zone floor, current price below entry zone, valid stop below planned entry, persisted detail-read geometry/readiness repair, stale positive readiness reason clearing, and idempotent stop-rationale repair.
- Backend tests cover list pre-repair before paper-ready filters/counts, exclusion from `READY_FOR_PAPER_REVIEW` filters, funnel contribution to `BLOCKED`, and insufficient-data readiness preservation.
- UI tests cover scoped funnel/list requests, domain-specific empty state text, bounded batch request payloads, final progress summary, scoped detail lookup, review-candidate wording, and currency formatting from persisted market-data snapshots.
- UI tests cover the blocked detail-page geometry message for a persisted POWERGRID-style route, assert stale positive readiness reasons are hidden, and assert duplicate readiness/plan blocker text renders once.
- Browser verification confirmed `/trade-plans` shows real `IN/STOCK` rows and `/trade-plans/:instrumentId` shows proof, market-data, data-quality, and readiness blocker sections.

Open verification risk:
- Real full batch generation is intentionally not run in every UI test because it can mutate many rows. Verify manually when generation math, batch behavior, or readiness classification changes.
- Browser console currently contains existing React DOM nesting warnings from a strategy/navigation surface; this was not introduced by Trade Plan scope/progress changes and should be cleaned up in the owning UI module.

### Market Context Intelligence

Key invariants:
- Market breadth percentages must expose coherent denominators. The displayed sample count must match the breadth metric source or the UI must label distinct samples.
- Persisted summary reads must not show non-zero breadth percentages beside `Sample 0` when sector snapshot counts provide the persisted breadth universe.
- Missing-metadata sector buckets such as `Unknown`, empty sector, `N/A`, `NA`, or null-equivalent labels must not be ranked as leading or weak sectors. The shared known-sector predicate is used by current Market Context and Historical Context Snapshot reads/generation.

Evidence:
- Backend service tests cover SMA50/SMA200 denominator counts and Unknown-sector exclusion.
- Backend route tests cover market-context response routing.
- UI tests cover `/market-context` sample-count coherence and Unknown-sector exclusion.

Open verification risk:
- Provider-backed live market-context generation can change with local data freshness; browser checks should record the displayed sample counts and sector list after context calculation changes.

### Smart Money Intelligence

Key invariants:
- Smart-money scores must be derived from local price/volume data.
- `1M`, `3M`, and `6M` are not labels over the same calculation; each timeframe must use its own price/volume window evidence.
- Refresh must persist all supported ranges in one run.
- Range selector must drive top accumulation, distribution, and sector reads.
- Insider/institutional ownership remains an explicit unavailable placeholder unless a free provider is configured.

Evidence:
- Backend tests cover accumulation/distribution signals, insufficient data, sector aggregation, scoped reads, all-range refresh, and range-window scoring divergence.
- Backend tests cover bounded refresh progress metadata.
- UI tests cover authenticated bounded refresh orchestration, meaningful empty states, and `1M`/`6M` range requests for top, distribution, and sector reads.

Open verification risk:
- Real local snapshots must be refreshed after scoring changes so old persisted range clones are replaced.

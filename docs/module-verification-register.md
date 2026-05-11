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
- Corporate actions must be idempotent on stock/date/type/source plus relevant amount or split-ratio fields. Same-batch provider duplicates must collapse before upsert, and existing duplicate rows must be cleaned up or deduped on read.
- Configured URL import must use only configured/default safe URLs and keep manual CSV fallback.
- Bulk import/sync UI must continue until backend reports `hasMore=false`.

Evidence:
- UI tests cover table columns, compact filters, import/backfill actions, and configured URL import request payload.
- Backend market-data tests cover metadata/backfill/import idempotency, corporate-action same-batch deduplication, read-time duplicate collapse, and idempotent cleanup of legacy duplicate rows.
- UI tests cover the instrument detail corporate-action table for a persisted duplicate-action route.

Open verification risk:
- Full provider/catalog imports are intentionally not run in every UI test. They require manual browser verification when import behavior changes.

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

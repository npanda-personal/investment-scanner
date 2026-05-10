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
- Configured URL import must use only configured/default safe URLs and keep manual CSV fallback.
- Bulk import/sync UI must continue until backend reports `hasMore=false`.

Evidence:
- UI tests cover table columns, compact filters, import/backfill actions, and configured URL import request payload.
- Backend market-data tests should remain the source of truth for metadata/backfill/import idempotency.

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

Evidence:
- UI tests cover horizon controls and bounded recalculation payload.

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

Evidence:
- Backend tests cover registered strategy performance persistence, scoped symbol/universe resolution, bounded universe diagnostics, insufficient-history status, and rejection of non-entry/draft registered strategies.
- Backend tests cover scoped saved-run filtering so unknown-scope legacy runs are excluded from explicit `IN/STOCK` run-list requests.
- UI tests cover active entry strategy selector behavior, hiding support rules, scoped run-list requests, scoped registered run payloads, and insufficient-history result display without running a real bulk backtest.

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
- UI tests cover research-only language, review-candidate terminology, strategy proof, confirmation layers, scoped overview request params, and route links.

Open verification risk:
- Overview latency should be periodically checked against real local data after downstream modules grow.

### Trade Plan & Risk Management Engine

Key invariants:
- Trade Plans are research-support plan snapshots, not orders, broker execution, or live trading.
- Latest plan reads, plan lists, funnel diagnostics, and batch generation must respect global `region` and `assetType`.
- Batch generation must be bounded and expose processed/total progress metadata for frontend orchestration.
- Detail pages must not show a wrong-scope persisted plan.
- Paper-readiness counts must stay separate from generated, skipped, failed, blocked, watch-only, and insufficient-data counts.
- Batch-generated plans must calculate position sizing with the documented default planning capital base when no portfolio/capital is supplied, so paper-readiness is not blocked solely by missing UI capital input.

Evidence:
- Backend tests cover scoped latest-plan lookup, scoped/idempotent persistence keys, persisted proof snapshot fields, default planning capital sizing, batch failure isolation, progress metadata, and funnel diagnostics.
- UI tests cover scoped funnel/list requests, domain-specific empty state text, bounded batch request payloads, final progress summary, and scoped detail lookup.
- Browser verification confirmed `/trade-plans` shows real `IN/STOCK` rows and `/trade-plans/:instrumentId` shows proof, market-data, data-quality, and readiness blocker sections.

Open verification risk:
- Real full batch generation is intentionally not run in every UI test because it can mutate many rows. Verify manually when generation math, batch behavior, or readiness classification changes.
- Browser console currently contains existing React DOM nesting warnings from a strategy/navigation surface; this was not introduced by Trade Plan scope/progress changes and should be cleaned up in the owning UI module.

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

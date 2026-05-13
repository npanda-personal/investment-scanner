# Candidate 2 Discovery - Instrument-Level Data Coverage Workbench

## Scope

Discovery only for next-priority Candidate 2 from `po-roadmap-backlog-2026-05-13.md`.

No source, test, schema, route-registry, package, generated, or shared-file edits were made in this pass.

## Recommended Ownership

Use existing Lane 1 modules. A new module is not needed.

- **Market Data Foundation owns source coverage truth**: provider support, price-history length, latest price freshness, rolling-window completeness, volume coverage, adjusted-close fallback, metadata presence, fundamentals/corporate-action availability where locally stored, universe state, primary exclusion blocker, and bounded repair/manual action.
- **Data Quality Engine owns signal/backtest/calibration eligibility overlay**: coverage score, readiness score, liquidity score, `eligibleForSignals`, `eligibleForBacktesting`, `eligibleForCalibration`, data gaps, readiness blockers, warnings, and recommended fixes.
- **Frontend should land as a workbench surface in Data Quality Engine or a dedicated tab within Market Data Foundation, but not as a new route registry change unless explicitly reserved.** The lowest-conflict product fit is to extend Data Quality Engine's existing diagnostic table because it already owns scoreability, eligibility filters, and row diagnostics. The page should display Market Data-owned coverage fields without recalculating them.

Recommended architecture shape:

- Market Data Foundation exposes a read-only, paginated `IN / STOCK` instrument coverage endpoint or extends the existing instrument list DTO if the Architect prefers no new endpoint.
- Data Quality Engine either consumes that public Market Data output for an additive workbench DTO or keeps its existing evaluation list and the frontend composes both public APIs by `instrumentId`.
- The scoped `review-readiness-summary` remains the reconciliation header. The workbench totals must not invent separate universe counts.

## Proposed First Vertical Slice

Implement a read-only `IN / STOCK` coverage workbench that answers: "why is this instrument scoreable or excluded?"

Smallest useful slice:

1. **Summary header**
   - Consume existing `GET /api/v1/market-data/review-readiness-summary`.
   - Show review mode, trust status, trusted/catalog count, data-through dates, and canonical next bounded action.
   - Treat summary fetch as additive/fallback, not a hard page failure.

2. **Paginated instrument coverage rows**
   - Include symbol, company, provider support, universe state, price-history bars, latest price date, expected latest trading date, latest freshness state, recent-volume state, sector/industry presence, market-cap presence, fundamentals availability, corporate-action coverage state if available, data-quality coverage status, signal eligibility, and primary blocker.
   - Include a single `nextAction` object per excluded row with a bounded action label/code and target module, e.g. `VALIDATE_PROVIDERS`, `BACKFILL_PRICES`, `PROVIDER_BUSINESS_METADATA_REPAIR`, `MANUAL_METADATA_IMPORT`, or `EVALUATE_DATA_QUALITY`.
   - Do not trigger provider validation, price backfill, metadata repair, or data-quality evaluation on page load.

3. **Filters**
   - `scoreable`
   - `excluded`
   - `stale`
   - `missingHistory`
   - `missingMetadata`
   - `providerIssue`
   - Optional simple text search.

4. **Detail drawer**
   - Show raw Market Data coverage fields and Data Quality evaluation fields side by side.
   - Show blocker precedence and the next bounded repair/manual action.
   - If Data Quality evaluation is missing, label it `UNKNOWN`/`not evaluated` and offer only an explicit bounded evaluate action in a later slice.

5. **Reconciliation**
   - Add a visible note/count check that the workbench result scope is the same `region / assetType` as the readiness summary.
   - Do not claim that current filtered rows equal the full trusted review universe unless the backend provides that exact count.

## Future Write Reservations

Recommended reservation for an implementation packet:

- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.coverage-workbench.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.routes.test.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `frontend/src/features/data-quality-engine/types.ts`
- `frontend/src/features/data-quality-engine/api/dataQualityEngineService.ts`
- `frontend/src/features/data-quality-engine/components/DataQualityEnginePage.tsx`
- `frontend/tests/ui/data-quality-engine.spec.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Avoid reserving unless the Architect explicitly chooses a separate page/route:

- `frontend/src/features/data-quality-engine/routes.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/src/features/*/index.ts`
- shared table/filter components
- route registry files
- Prisma schema
- package manifests

If the first slice composes existing APIs entirely in the frontend, the backend reservations can shrink to docs/tests only, but that should be an explicit Architect decision because the acceptance criteria ask for primary blocker and bounded action per excluded instrument.

## Conflict Risks

- **WP-01 overlap**: Market Data Foundation, Data Quality Engine, Today Review, and related UI specs were actively reserved for the trusted review readiness path. Candidate 2 should not start until WP-01 has cleared Architect signoff and its readiness summary/blocker taxonomy is stable.
- **Data Quality UI overlap**: Candidate 2 likely edits `DataQualityEnginePage.tsx`, `dataQualityEngineService.ts`, and `data-quality-engine.spec.ts`; these may still contain WP-01 changes and should be re-read before implementation.
- **Market Data status/list overlap**: Extending `V1Instrument` or list filters can collide with Market Data catalog work. Prefer additive DTO fields and avoid changing existing list semantics.
- **Route and shared-component risk**: A new route or shared workbench component would require Orchestrator approval beyond the likely Lane 1 module files.
- **Provider-heavy action risk**: Any "repair" affordance must remain explicit and bounded. Page load must stay read-only.
- **Cross-module import risk**: Data Quality should consume Market Data through public service/API exports only, not repositories. If backend-side composition requires importing Data Quality from Market Data or vice versa, the Architect should pick one owner and a public adapter boundary first.

## Current Gate Dependencies

- **WP-01 - Trusted Review Universe Readiness And Repair Path**
  - Hard dependency. Candidate 2 should wait for Architect signoff because it must reconcile with `review-readiness-summary`, `universeSignoff`, blocker categories, and bounded next actions.

- **WP-02 - Signal Outcome Maturity And Evaluable Coverage**
  - Soft dependency for "signal eligibility" wording. First Candidate 2 slice can show Data Quality `eligibleForSignals` only; avoid consuming Signal Quality maturity/evaluable counts until WP-02 is stable.

- **WP-03A - Calibration Readiness Source Guardrails**
  - Not needed for the first vertical slice. Later detail rows may add calibration readiness, but only after WP-03A publishes stable source guardrail fields.

- **WP-04A - Conservative Research Hub Actionability Adapter**
  - Soft language dependency. Candidate 2 should align status language with `READY`, `LIMITED`, `BLOCKED`, `UNPROVEN`, and `INSUFFICIENT_DATA` where applicable, but should not wait if the first slice only uses Market Data/Data Quality statuses.

- **WP-05A - Trade Plan Proof Chain Source Funnel**
  - Not needed for the first vertical slice. Do not include paper-readiness or trade-plan blocker columns until WP-05A is complete and a later integration packet reserves those files.

## Architecture Questions

1. Should the canonical instrument coverage workbench DTO be owned by Market Data Foundation, Data Quality Engine, or frontend composition of both public APIs?
2. If backend composition is preferred, which direction is allowed: Data Quality consuming Market Data public service, or Market Data consuming Data Quality public service?
3. Should `fundamentals availability` and `corporate-action coverage` be strict blockers, context gaps, or informational unknowns for `IN / STOCK` scoreability?
4. What is the approved blocker precedence for per-instrument primary blocker when multiple issues exist: provider, delisted/inactive, price freshness, price history, volume, business metadata, fundamentals, corporate actions, Data Quality unevaluated?
5. Should "scoreable" mean Market Data `review_readiness=REVIEW_READY`, Data Quality `eligibleForSignals=true`, or both?
6. Should the first slice add new filters to backend APIs, or can the frontend use existing filters plus client-side grouping for the initial workbench?
7. Is a new route allowed later, or should this remain a Data Quality tab to avoid route-registry changes?
8. Should per-row next actions include target routes only, or may they also include prefilled bounded request payloads for later explicit repair buttons?
9. How should the workbench reconcile rows not yet evaluated by Data Quality: evaluate on explicit click, show `UNKNOWN`, or enqueue bounded evaluation from the existing Evaluate Scope workflow?
10. Should local/live-data evidence require authenticated browser screenshots, API JSON captures, or both for PO acceptance?

## QA Implications

Backend evidence to require:

- Market Data unit/route coverage for row-level primary blockers and next bounded actions across provider unknown, provider validation failed, unsupported, stale latest price, missing latest price, inadequate history, missing recent volume, missing sector/industry/market cap, no fundamentals, no corporate actions, and review-ready rows.
- Data Quality service tests for merging or displaying Market Data coverage without recalculating Market Data readiness.
- Pagination/filter tests proving `scoreable`, `excluded`, `stale`, `missingHistory`, `missingMetadata`, and `providerIssue` are scoped to `IN / STOCK` and preserve totals.
- Regression test proving page-load/read endpoints do not call provider validation, price backfill, metadata repair, or batch evaluation.

Frontend evidence to require:

- UI smoke for workbench header reconciliation with `review-readiness-summary`.
- UI smoke for filters and row detail drawer.
- UI smoke for unavailable summary fallback and missing Data Quality evaluation fallback.
- UI assertion that excluded rows show one primary blocker and one bounded next action.
- UI assertion that no repair/evaluation action fires until the user clicks an explicit bounded action.

Suggested local-data acceptance evidence:

- Authenticated local `IN / STOCK` screenshot showing the workbench summary, filtered excluded rows, and one detail drawer.
- API capture for the workbench/list endpoint or composed API responses showing row-level blocker/action fields.
- API capture for `GET /api/v1/market-data/review-readiness-summary?region=IN&assetType=STOCK` used by the same screen.
- Evidence note comparing workbench counts to the scoped readiness summary and explaining any difference between full scope totals and filtered/paginated rows.

## Discovery Recommendation

Proceed with Candidate 2 only after WP-01 Architect signoff. The first implementation packet should be read-only, additive, and bounded to existing Lane 1 modules. It should not introduce a new module, should not trigger providers or repairs automatically, and should not consume WP-02/WP-03A/WP-05A outputs until those gates are stable.

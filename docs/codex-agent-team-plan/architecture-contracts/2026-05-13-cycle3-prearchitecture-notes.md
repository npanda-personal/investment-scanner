# Cycle 3 Pre-Architecture Notes - 2026-05-13

## Scope And Gate

These are planning notes for the likely Cycle 3 Top 5 from `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle3-discovery.md`. They are not final architecture contracts and do not authorize implementation.

Architecture contracts should not be created until both exist:

- Product Owner Cycle 3 Top 5 briefs with acceptance criteria.
- Orchestrator Cycle 3 intake on `docs/codex-agent-team-plan/active-work-board.md` or a dedicated intake packet.

Current board dependency: Cycle 2 is still the active Top 5. C2-WP-01 through C2-WP-04 are in `Ready for QA`; C2-WP-05 is blocked by Prisma schema-slot coordination. Cycle 3 should not depend on optimistic Cycle 2 behavior until QA/acceptance confirms the source contracts.

All recommendations preserve the current product boundary: local/personal `IN / STOCK` research support, free/open-source/local tooling only, no paid providers, no paid AI/services, no broker integration, no order placement, no automated trading, and no live-trading language.

## Likely Cycle 3 Top 5

The Cycle 3 discovery backlog proposes this future Top 5 after Cycle 2 stabilizes:

1. Evidence-Aware Advanced Screener.
2. Review Run History And Diff.
3. Portfolio And Watchlist Evidence Overlay.
4. Research Hub Readiness Wiring.
5. Strategy Decision Proof And Calibration Consumption.

The sequence is coherent, but the first and fourth items have high cross-module coupling risk. The safest architecture shape is source-owned evidence contracts first, read-only aggregation second, and no consumer module reaching into another module repository.

## Shared Boundary Principles

- Keep source-of-truth ownership stable. Market Data owns universe/readiness/repair state. Signal Generation owns raw signal audit. Signal Quality owns outcome evidence. Signal Calibration owns calibrated readiness/influence. Strategy Framework owns proof status. Today Review owns review-run/candidate explanation snapshots. Stock Research owns theses. Portfolio and Watchlist modules own user relationship state.
- Cross-module consumers should read via public service exports, public API DTOs, or persisted snapshots. They should not import another module repository directly.
- Evidence language should remain conservative: `readiness`, `limited`, `blocked`, `unproven`, `insufficient_data`, `paper review candidate`, `research support`. Avoid buy/sell/exit/execute/live-ready wording.
- DTO additions should be additive and legacy-aware. Missing historical evidence should map to `LEGACY_MISSING`, `UNKNOWN`, `INSUFFICIENT_DATA`, `UNPROVEN`, or `LIMITED`, never optimistic readiness.
- Shared files need single-owner scheduling: `backend/prisma/schema.prisma`, Prisma migrations, route registries, global navigation, shared UI components, and cross-module test fixtures.

## Candidate 1 - Evidence-Aware Advanced Screener

### Likely Boundary

Primary frontend/backend owner should be a Lane 3 discovery surface. The backlog names this as a discovery surface with read-only inputs from Market Data, Signal Quality, Strategy Framework, Today Review, and Trade Plans. There is no existing `advanced-screener` module in the module roots, so Orchestrator should choose one of two approaches during intake:

- Prefer a new bounded module only if the screen needs saved-screen persistence and independent API ownership.
- Otherwise start as a narrow feature under an existing discovery module only if Product Owner accepts no saved-screen persistence in the first slice.

Suggested new module name if persistence is required: `evidence-aware-screener` or `stock-discovery-screener`. Avoid placing it in `today-trade-review`; review runs and saved exploratory screens have different lifecycle semantics.

### Contract Risks

- Highest risk is evidence normalization. The screener must not invent a single readiness score by blending unrelated source states.
- Filtering should expose source states independently: Market Data readiness, raw signal audit/evidence usability, calibration influence, strategy proof, trade-plan paper-readiness, Today Review bucket, portfolio/watchlist state.
- The screener should read latest source-owned snapshots and display source freshness dates per dimension.
- If Cycle 2 Strategy Proof or Today Review explainability changes are rejected by QA, the screener must degrade to source-specific unknown/legacy states.

### Schema Risks

- Saved screens likely require schema: user-owned screen definitions, filter JSON, sort definition, created/updated timestamps.
- Avoid persisted result sets in the first slice unless Product Owner requires historical replay. Persisting result rows creates heavy invalidation and snapshot semantics.
- If implemented with a new table, use JSON filters with validation plus indexes on `userId` and updated time. Do not create denormalized evidence columns until source contracts settle.

### Write-Scope Split

- New screener owner: new backend module and frontend feature only, plus tests.
- Schema owner: Prisma schema/migration if saved screens are included.
- Source modules remain read-only: `market-data-foundation`, `signal-generation-engine`, `signal-quality-lab`, `signal-calibration-engine`, `strategy-framework`, `today-trade-review`, `trade-plan-risk-engine`, `portfolio-management`, and `watchlist-management`.
- Shared route/navigation edits require Orchestrator reservation and should be handled by the screener owner only after module work is stable.

### Parallelization

- Backend aggregator/DTO work can run in parallel with frontend shell if DTO is contract-frozen.
- Saved-screen schema must land before CRUD implementation.
- Source-module adapters can be developed as pure read adapters with stubs, but only one worker should wire the final public-service imports.

### Dependency Blockers

- Requires accepted C2-1, C2-2, C2-3, and C2-4.
- Strongly benefits from C2-5 if the screener includes thesis status or research checklist filters.
- Block architecture if Product Owner does not specify whether saved screens are mandatory in Cycle 3.

## Candidate 2 - Review Run History And Diff

### Likely Boundary

Primary owner should remain `today-trade-review`. This is a natural extension of Today Review run snapshots, not a generic audit module. It should consume source evidence already captured by Today Review snapshots rather than re-querying every upstream module to reconstruct history.

### Contract Risks

- Diff semantics must be explicit: newly eligible, newly excluded, improved, deteriorated, unchanged, evidence changed, bucket changed, blocker changed, and data-repair-attributed where available.
- The diff should compare bounded run snapshots and state that historical rows reflect what was known at run time.
- Do not compare live source state against old run state unless the endpoint labels it as current-vs-run, not run-vs-run.
- Data repair attribution should be conservative: only claim attribution when a Market Data repair/run id or before/after readiness evidence is present in the Today Review source snapshot.

### Schema Risks

- Existing `TodayReviewRun` and candidate JSON snapshots may be sufficient for a first diff.
- Schema is needed only if excluded instruments are not persisted in enough detail or if diffs must be stored for fast retrieval.
- Avoid a large `TodayReviewDiffRow` table in the first slice unless QA discovers JSON snapshot performance or retention issues.
- Retention policy is a product requirement blocker. Without it, API must default to a small bounded history window.

### Write-Scope Split

- Owner: `backend/src/modules/today-trade-review/*`, `backend/tests/modules/today-trade-review/*`, `frontend/src/features/today-trade-review/*`, and focused UI tests.
- No Market Data, Signal, Strategy, Research Hub, Portfolio, Watchlist, or Trade Plan edits in first slice.
- Schema owner only if new persisted diff/history rows are required.

### Parallelization

- Can run in parallel with Candidate 5 if Candidate 5 stays in Strategy Decision and does not edit Today Review.
- Should not run in parallel with Candidate 3 if both want Today Review UI routes/details. Orchestrator can split Candidate 3 into portfolio/watchlist source APIs first, then Today Review overlay later.

### Dependency Blockers

- Requires accepted C2-1 and C2-4.
- Benefits from C2-3 for proof-change diffing.
- Needs Product Owner decision on retention, default comparison pair, and whether excluded instruments beyond bounded examples are in scope.

## Candidate 3 - Portfolio And Watchlist Evidence Overlay

### Likely Boundary

Ownership should be split deliberately:

- `portfolio-management` owns held/not-held relationship and any holding metadata.
- `watchlist-management` owns watchlist membership.
- `today-trade-review` may display overlay badges on review candidates after source APIs are stable.
- `stock-research-workbench` owns thesis state if C2-5 is accepted; Today Review should read thesis presence, not own thesis data.

Do not collapse portfolio, watchlist, and Today Review into one implementation task. This item touches user-owned state, review display, and research linkage.

### Contract Risks

- Product language must avoid advice. Labels should be `held`, `watchlisted`, `new to review`, `has active thesis`, `evidence deteriorated`, `needs review`, not buy/sell/exit.
- Evidence deterioration needs a baseline. First slice can show current evidence status for held/watchlisted names; true deterioration should wait for run history or alerts-style state transitions.
- User ownership/auth boundaries must be clear for portfolio and watchlist reads.
- Today Review overlay should not alter ranking or candidate promotion in the same slice unless PO explicitly asks for ranking behavior.

### Schema Risks

- Existing portfolio/watchlist models may already cover membership. Avoid schema unless the product requires overlay-specific user preferences or evidence-state snapshots.
- Deterioration alerts/snapshots likely require later schema; keep out of first overlay slice unless Candidate 2 provides run history diff that can be reused.
- If thesis links are included, C2-5 `ResearchThesis` must exist and be accepted.

### Write-Scope Split

- Source API owner A: `portfolio-management` backend/frontend/tests for current holding overlay fields.
- Source API owner B: `watchlist-management` backend/frontend/tests for watchlist membership.
- Display owner C: `today-trade-review` frontend/backend DTO display only after source contracts are stable.
- Optional research owner D: `stock-research-workbench` read endpoint for active thesis presence only after C2-5.
- Avoid shared route/navigation edits until final display slice.

### Parallelization

- Portfolio and watchlist source API slices can run in parallel if they avoid shared schema and shared frontend components.
- Today Review display should wait for source API contracts or use stubbed DTO fixtures.
- Do not parallelize Today Review overlay with Candidate 2 run-history UI without explicit component/file partitioning.

### Dependency Blockers

- Requires accepted C2-4.
- Requires accepted C2-5 for thesis routing or active thesis badges.
- Needs PO clarification on whether "portfolio" means manually entered holdings only, imported transactions, or simple watch/held flags. Avoid transaction/import scope in Cycle 3 unless explicitly briefed.

## Candidate 4 - Research Hub Readiness Wiring

### Likely Boundary

Primary owner should be `research-hub`. It should remain a read-only cross-module readiness console. It should not compute source evidence itself, launch repair/generation/backtests, or mutate theses.

Source modules:

- `market-data-foundation`: data readiness and repair next action.
- `signal-quality-lab`: evidence usability and maturity diagnostics.
- `signal-calibration-engine`: readiness and downstream influence.
- `today-trade-review`: latest review mode and blocker categories.
- `strategy-framework`: proof registry summary.
- `trade-plan-risk-engine`: paper-readiness/proof-chain status.
- `stock-research-workbench`: thesis counts/review dates if C2-5 exists.

### Contract Risks

- This is the broadest coupling item. The architecture should require a small `ResearchHubReadinessSource` adapter per source module, owned in Research Hub where possible.
- Avoid Research Hub importing repositories or recalculating states. If a source lacks a public method/API, the contract should either add a source-owned public summary endpoint in a separate slice or mark that dimension `UNAVAILABLE`.
- Cross-module labels must not contradict source pages. Source status should pass through with a Research Hub display grouping, not be reinterpreted as "ready to trade".
- Fallback is a product behavior: stale/missing source responses should display `unknown`, `legacy missing`, or `not wired`, not fail the whole hub.

### Schema Risks

- No first-slice schema should be required if the hub is a live read-only console.
- Persisted Research Hub snapshots would create historical audit semantics and should be a separate PO requirement.
- If source state is expensive, cache only in memory or bounded request scope for the first slice; avoid schema cache tables.

### Write-Scope Split

- Primary owner: `backend/src/modules/research-hub/*`, `backend/tests/modules/research-hub/*`, `frontend/src/features/research-hub/*`, UI tests if present.
- Source module edits should be forbidden in the first slice unless a source lacks any public summary method. If needed, schedule those as separate producer WPs before Research Hub wiring.
- Shared navigation edits only if route exposure is missing.

### Parallelization

- Can run in parallel with Candidate 2 and Candidate 5 only if source contracts are already stable and Research Hub does not edit those modules.
- Best split is producer-readiness gap analysis first, then Research Hub adapter wiring.
- If source modules need new summary endpoints, run those producer slices in parallel by lane, then do Research Hub integration after they land.

### Dependency Blockers

- Requires accepted C2-1 through C2-4.
- Should wait for C2-5 if thesis/checklist readiness is part of the PO brief.
- Block architecture if PO expects Research Hub to trigger repairs, generation, backtests, or trade-plan creation; those actions violate the read-only console boundary for this item.

## Candidate 5 - Strategy Decision Proof And Calibration Consumption

### Likely Boundary

Primary owner should be `strategy-decision-engine`. It should consume:

- `signal-calibration-engine` for calibration readiness, downstream influence, calibrated score/direction/confidence, and blockers.
- `strategy-framework` for proof status, sample sufficiency, rating warnings, and proof blockers.
- Existing raw signal and market/data context only through current public paths.

Strategy Decision should not recalculate calibration, inspect Signal Quality internals, or reconstruct Strategy Framework proof from Backtesting rows.

### Contract Risks

- Decision semantics must remain explicit. Adding proof/calibration consumption may downgrade or block candidates; API must expose exact reasons and source modules.
- Need an additive response shape such as `evidenceGates`, `downgradeReasons`, `blockingReasons`, and `decisionBeforeEvidenceGates` if Product Owner wants transparent changes.
- Calibration influence must respect `downstreamInfluence`: `NONE` should not adjust the decision, `LIMITED` should cap confidence, and `NORMAL` may influence scoring within documented bounds.
- Strategy proof should block or downgrade only where Strategy Framework status is accepted and scoped to the same `IN / STOCK` strategy/timeframe context.

### Schema Risks

- No first-slice schema should be required if decisions are calculated on request.
- Persisting decision snapshots would need a separate audit/history requirement.
- If current Strategy Decision persistence exists for past decisions, add nullable evidence-gate snapshots only after PO confirms audit history needs.

### Write-Scope Split

- Owner: `backend/src/modules/strategy-decision-engine/*`, `backend/tests/modules/strategy-decision-engine/*`, `frontend/src/features/strategy-decision-engine/*`, UI tests if present.
- Source modules read-only: `signal-calibration-engine`, `strategy-framework`, `signal-generation-engine`, `signal-quality-lab`, `backtesting-strategy-lab`.
- No Prisma edits in first slice unless Orchestrator accepts a persisted decision-audit requirement.

### Parallelization

- Can run in parallel with Candidate 2 and Candidate 4 if no shared source files are edited.
- Should not run in parallel with Strategy Framework proof-contract revisions. Proof registry acceptance must be stable before Strategy Decision consumes it.
- Frontend can display evidence-gate fields after backend DTO contract is fixed.

### Dependency Blockers

- Requires accepted C2-2 and C2-3.
- Benefits from C2-4 for language consistency.
- Needs PO decision on whether weak proof blocks candidates outright or downgrades confidence/status.

## Cycle 3 Schema Slot Forecast

High likelihood of schema work:

- Candidate 1 if saved screens are in scope.
- Candidate 3 only if overlay preferences, evidence-state snapshots, or thesis links require new persisted relationships.
- Candidate 2 only if existing Today Review snapshots cannot support bounded history/diff.

Low/no first-slice schema expected:

- Candidate 4 Research Hub readiness wiring.
- Candidate 5 Strategy Decision proof/calibration consumption.

Schema recommendation: hold one Prisma owner for Cycle 3 Wave 1. Do not let Candidate 1 saved screens and any Candidate 2/3 history snapshot change edit Prisma concurrently. If C2-WP-05 is still blocked or unaccepted, do not start Cycle 3 schema changes on top of it.

## Recommended Parallel Wave Shape

### Wave 0 - Required Before Architecture Contracts

- PO confirms actual Cycle 3 Top 5, acceptance criteria, and whether Candidate 1 includes saved screens.
- Orchestrator performs intake and write-scope reservation.
- Cycle 2 QA/acceptance confirms C2-1 through C2-4 contracts; C2-5 status is resolved or explicitly excluded from Cycle 3 dependencies.

### Wave 1 - Lowest Conflict After Intake

| Item | Suggested lane | Schema | Parallel notes |
| --- | --- | --- | --- |
| Candidate 2 Review Run History And Diff | Lane 3 Today Review | Avoid first | Can start if C2-4 accepted and Candidate 3 does not touch Today Review. |
| Candidate 5 Strategy Decision Proof/Calibration | Lane 2 Strategy Decision | Avoid first | Can start if C2-2/C2-3 accepted and source contracts are stable. |
| Candidate 4 Research Hub Readiness Wiring | Lane 3 Research Hub | None first | Best after source readiness adapter gap check. |

### Wave 2 - Higher Coupling

| Item | Suggested lane | Schema | Parallel notes |
| --- | --- | --- | --- |
| Candidate 1 Evidence-Aware Screener | Lane 3/New Discovery | Likely if saved screens | Start after source evidence DTOs are accepted; avoid source edits. |
| Candidate 3 Portfolio/Watchlist Overlay | Lane 3 Portfolio/Watchlist/Today Review | Possible later | Split source membership APIs from Today Review display. |

If Product Owner ranks Candidate 1 first, architecture should still isolate a first slice: read-only current evidence search without persisted historical results. Saved screens can be included only with single schema-owner coordination.

## Local/Free/No-Paid Constraints

- Use existing local database and app services only. No hosted search, paid screener APIs, paid market data, paid AI note generation, brokerage APIs, or cloud alerting.
- Keep batch work bounded and user-triggered. No background full-universe polling for Cycle 3 unless a source module already owns a disabled-by-default scheduler.
- Indian market event data remains deferred unless a free/local source is proven. Do not smuggle event-risk fields into screener or Today Review filters without source feasibility.
- Any portfolio/watchlist overlay must work with locally stored user data. No broker import or account sync.
- Research and decision surfaces must remain educational/research support. No recommendations, execution workflow, or order language.

## Architect Next Action

After PO Cycle 3 Top 5 and Orchestrator intake exist, create final architecture contracts in priority order. First contract pass should verify:

- Which Cycle 2 artifacts are accepted/released versus still blocked.
- Whether Candidate 1 requires saved screens in the first slice.
- Whether Candidate 3 includes thesis badges or waits for C2-WP-05 acceptance.
- Whether Candidate 2 requires persisted excluded-instrument history beyond bounded examples.
- Whether Candidate 5 blocks weak proof or only downgrades confidence.

Until those answers exist, keep this document as feasibility planning only.

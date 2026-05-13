# Cycle 2 QA Verification Plan - 2026-05-13

## Mode And Scope

Mode: QA Verification Planning. This is an early QA plan from PO briefs and Orchestrator intake. Final QA execution waits for implementation handoff, completed architecture contracts, and developer-focused validation evidence.

Write scope for this QA pass: this file only.

Sources read:
- `docs/codex-agent-team-plan/po-current-state-review-2026-05-13-cycle2.md`
- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle2.md`
- `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-orchestrator-intake.md`
- Existing UI/backend test anchors only as needed.

Global constraints:
- App remains personal/local-use only.
- Scope defaults to `IN / STOCK`.
- No paid services, paid providers, broker APIs, order placement, live trading, execution workflow, or advice wording.
- No full-universe/provider-heavy QA runs unless a work packet explicitly defines a bounded local run.
- Mutating jobs must be user-triggered, scoped, bounded, resumable, and visible in evidence.

## QA Entry Conditions

QA can plan early, but no item moves into execution until all applicable entry conditions are met:

- Architect has published the Cycle 2 architecture contract and the item is reconciled against its canonical fields, statuses, module boundaries, persistence decisions, and downstream consumption rules.
- Developer handoff identifies changed files, endpoints, data model changes, migrations if any, and focused validation already run.
- Developers have run focused validation before QA, including relevant backend tests, relevant Playwright specs, build/type checks where touched, and any migration/status commands required by the work packet.
- Work packet confirms no unbounded provider/full-universe jobs were run and no paid/broker/live-trading behavior was added.
- Local test persona/authentication path is available or the work packet provides a supported test setup.
- Any skipped developer check has an owner, reason, and replacement evidence.

## Common Evidence Rules

For each completed work packet, QA should collect:

- API evidence: request path, scope params/body, representative response fields, status codes, and conservative missing/partial behavior.
- UI evidence: focused Playwright output and at least one browser/screenshot/manual observation for the user-facing path when UI changed.
- Backend evidence: focused service/route/repository test output for contract behavior, negative cases, and bounded execution.
- Safety evidence: body text scan or assertions confirming no prohibited wording such as `buy now`, `sell now`, `guaranteed`, `place order`, `execute order`, `live trade`, or `financial advice`.
- Data-limit evidence: batch size, limit, offset, dry-run flag, max batches, run scope, and no scheduler/full-universe side effect.

## Architecture Contract Dependencies

QA will reconcile exact assertions after Architect publishes the contract file. Current expected dependencies:

- C2-WP-01 depends on repair-run state model, repair action taxonomy, bounded request fields, readiness reconciliation fields, status semantics, and any repair persistence fields.
- C2-WP-02 depends on signal generation audit fields, model/ruleset version contract, source data date, idempotency key, duplicate/no-op semantics, and Signal Quality grouping/filter contract.
- C2-WP-03 depends on proof status taxonomy, proof source of truth, registry API fields, sample sufficiency rules, backtest evidence fields, and downstream consumer contract.
- C2-WP-04 depends on candidate/exclusion reason contract, source module dependency boundaries, stale/missing semantics, candidate detail shape, and allowed status vocabulary.
- C2-WP-05 depends on thesis module boundary, authenticated ownership model, persistence fields, evidence checklist reference fields, status vocabulary, and no-advice wording rules.

QA rejection applies if implementation invents statuses or response fields that contradict the architecture contract, omits required contract fields, or consumes private/internal fields instead of approved public contracts.

## C2-WP-01 - Trusted Universe Repair Workbench

### Acceptance Scenarios

- Market Data/Data Quality shows repair lanes for `PROVIDER_VALIDATION`, `PRICE_BACKFILL`, `STALE_EOD`, `CATALOG_IDENTITY`, and `INSUFFICIENT_TRUSTED_UNIVERSE`.
- Each repair lane exposes affected count, bounded batch size, expected effect, last run, success count, failure count, skipped count, retryable failures, and next action.
- Dry-run and actual run requests are explicit user actions, scoped to `IN / STOCK`, and bounded by contract-defined batch/max-batch fields.
- Readiness summary refreshes after repair and reconciles blocker counts, trust status, review mode, and next action.
- Today Review remains `NO_REVIEW` and publishes no candidates until readiness thresholds are met.
- Partial/failure runs remain usable and explain retry/manual blockers without hiding Today Review impact.

### API/UI Evidence To Collect

- API: readiness summary before/after, repair plan, latest repair run, dry-run payload, bounded actual-run payload, and Today Review latest state.
- UI: repair lanes, bounded controls, latest run status, before/after counts, next action, warnings, and Today Review `NO_REVIEW` gating.
- Record exact `region`, `assetType`, `batchSize`, `offset`, `maxBatchesPerAction`, `dryRun`, run status, and blocker deltas.

### Focused Checks To Run

- Playwright: `npm.cmd run test:ui -- market-data-foundation.spec.ts today-trade-review.spec.ts --workers=1`
- Backend: focused Jest tests under `backend/tests/modules/market-data-foundation`, `backend/tests/modules/data-quality-engine`, and Today Review consumption tests.
- API/manual: authenticated GET/POST checks for readiness, repair plan, latest repair run, dry-run, and Today Review latest using only bounded payloads.

### Data Setup Limits

- Use mocked Playwright/API fixtures for provider validation, catalog identity repair, metadata enrichment, stale EOD, and price backfill.
- Live QA may run dry-run by default. Actual repair execution requires work-packet-approved bounded limits.
- Do not run scheduler, drain full universe, or provider-heavy repair outside explicit bounded scope.

### Negative Cases

- Readiness summary unavailable while universe health still renders conservative fallback.
- Repair run partial/fails and preserves blocker/next action.
- Unsupported provider, retryable provider failure, stale EOD, missing price history, and manual metadata required.
- Batch size above allowed cap is rejected or clamped per contract.
- Today Review receives repaired-but-still-untrusted state and remains candidate-empty.

### Rejection Criteria

- Any repair action can run unbounded or outside `IN / STOCK`.
- UI implies candidates are reviewable while `reviewMode=NO_REVIEW` or trust is not sufficient.
- Readiness and Today Review disagree on mode/counts for the same scope.
- Provider-heavy/full-universe work is triggered by page load, scheduler, or non-explicit action.

## C2-WP-02 - Raw Signal Generation Scope And Model-Version Audit

### Acceptance Scenarios

- Signal Generation shows latest run scope, model/ruleset version, source data date, batch size, generated, skipped, duplicate/idempotent, failed, duration, and data-quality eligibility summary.
- Signals expose model version, source data date, scoring input summary, and eligibility at generation time.
- Re-running the same scoped generation is idempotent and does not create duplicate active signals for the same instrument/date/model.
- Signal Quality can filter or group by model version without mixing incompatible generations.
- Batch generation remains manual, bounded, and scoped to `IN / STOCK`.

### API/UI Evidence To Collect

- API: latest run/audit response, generation request payload, generation result counts, representative signal record/audit fields, and Signal Quality model-version filter/group response.
- UI: latest run audit panel, model version visibility, duplicate/no-op counts, bounded run controls, and Signal Quality grouping/filter display.
- Record idempotency key inputs and duplicate/no-op behavior from repeat runs.

### Focused Checks To Run

- Playwright: `npm.cmd run test:ui -- signal-generation-engine.spec.ts signal-quality-lab.spec.ts --workers=1`
- Backend: focused Jest tests under `backend/tests/modules/signal-generation-engine` and Signal Quality route/service tests for model-version grouping.
- API/manual: repeat the smallest approved scoped run or fixture-backed API scenario and compare generated vs duplicate/no-op counts.

### Data Setup Limits

- Prefer fixture-backed unit/service tests for idempotency and audit fields.
- Live run must use approved small batch only, with `useDataQualityFilter=true`, `region=IN`, `assetType=STOCK`, and explicit limit/batch cap.
- Do not generate broad historical signal universes for QA.

### Negative Cases

- Missing model version/source data date yields conservative unavailable or rejected state per contract.
- Same instrument/date/model is reprocessed and counted as duplicate/no-op, not a new active signal.
- Different model version remains separately visible and does not overwrite prior audit evidence.
- Ineligible data-quality rows are skipped with reason.
- Signal Quality query with unknown model version returns empty/conservative results, not mixed totals.

### Rejection Criteria

- Duplicate active signals are created for same instrument/date/model.
- Signal Quality aggregates across model versions without disclosure.
- Generation can run unbounded, outside `IN / STOCK`, or without data-quality eligibility tracking.
- Audit fields are only UI-derived and unavailable from the approved API/contract source.

## C2-WP-03 - Strategy Proof Registry And Evidence Index

### Acceptance Scenarios

- Strategy proof registry exposes proof statuses such as `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, or Architect-approved equivalents.
- Registry rows include strategy code/version, scope, selected backtest timeframe, sample size, win/loss and drawdown summary, latest evaluation date, missing evidence reason, and next bounded action.
- Missing or weak proof stays visible and points to inspect/run a bounded local backtest.
- Trade Plan proof chain and Strategy Decision consume the same proof status contract where included in the implementation slice.
- No workflow implies buy/sell advice, paper readiness without proof, or live readiness.

### API/UI Evidence To Collect

- API: proof registry list/detail, proof status counts, missing evidence reasons, sample sufficiency fields, linked backtest summary, and downstream proof status when applicable.
- UI: registry table/filter, status labels, missing-evidence next action, strategy detail proof panel, and any Backtesting Lab link/payload.
- Record sample count/timeframe/scope for at least proven/limited/unproven or blocked fixture states.

### Focused Checks To Run

- Playwright: `npm.cmd run test:ui -- strategy-framework.spec.ts backtesting-strategy-lab.spec.ts trade-plan-risk-engine.spec.ts strategy-decision-engine.spec.ts --workers=1` as applicable to touched surfaces.
- Backend: focused Jest tests under `backend/tests/modules/strategy-framework`, `backend/tests/modules/backtesting-strategy-lab`, and downstream consumer tests only if those files are in scope.
- API/manual: registry list/detail checks and a bounded/stubbed backtest next-action payload.

### Data Setup Limits

- Use mocked backtest summaries for UI and service tests.
- Live QA should inspect existing local proof/backtest rows only unless a bounded backtest run is explicitly approved.
- Do not run large backtest grids, parameter sweeps, or broad strategy optimization.

### Negative Cases

- Strategy has no backtest evidence and appears `UNPROVEN`/missing, not ready.
- Sample size below sufficiency threshold caps status to limited/unproven.
- Stale proof or mismatched market/asset/model version does not satisfy current scope.
- Backtest failure produces `BLOCKED`/missing evidence reason and retry/inspect action.
- Support rules/draft strategies are not promoted as proven entry strategies unless contract allows it.

### Rejection Criteria

- Proof status is inferred from raw strategy existence or latest performance alone.
- Missing proof is hidden, or downstream modules treat weak proof as ready.
- Status labels differ across Strategy Framework, Backtesting Lab, Trade Plans, or Strategy Decision for the same proof record.
- Backtest action is unbounded or framed as transaction readiness.

## C2-WP-04 - Today Review Explainability And Exclusion Reasons

### Acceptance Scenarios

- Today Review summary shows excluded counts by readiness, data, signal maturity, calibration, strategy proof, trade-plan proof-chain, and outside-scope reasons.
- Candidate detail shows ranking components, hard blockers, readiness state, signal evidence, calibration readiness, strategy proof, and trade-plan paper-readiness state.
- Promoted, watched, blocked, unproven, insufficient-data, and excluded rows expose reasons without optimistic fallback.
- Excluded examples are inspectable but not promoted as actionable candidates.
- Today Review consumes public Trade Plan proof-chain and Calibration readiness outputs conservatively.
- Language remains research-support only.

### API/UI Evidence To Collect

- API: Today Review latest/run response with exclusion summary, scan funnel, candidate reason fields, excluded examples, and candidate detail.
- UI: group tabs/counts, exclusion summary, excluded examples, candidate detail reason panels, source module labels, and warnings.
- Record reason taxonomy and source contract field used for at least one promoted/watch/blocked/unproven/insufficient/excluded fixture.

### Focused Checks To Run

- Playwright: `npm.cmd run test:ui -- today-trade-review.spec.ts signal-calibration-engine.spec.ts trade-plan-risk-engine.spec.ts signal-quality-lab.spec.ts --workers=1` as applicable.
- Backend: focused Jest tests under `backend/tests/modules/today-trade-review`, plus consumer-contract tests for calibration/proof/trade-plan readiness if touched.
- API/manual: Today Review latest and candidate detail checks with local current state and at least one mocked/fixture state for exclusions.

### Data Setup Limits

- Use fixture/mocked responses for full reason taxonomy coverage.
- Do not run full Today Review generation solely to synthesize every reason category.
- Live QA may inspect latest run and run Today Review only if the work packet confirms the run is bounded and local.

### Negative Cases

- Source readiness/proof/calibration API unavailable and Today Review downgrades instead of assuming ready.
- `NO_REVIEW` state has zero promoted candidates and explains trusted-universe gating.
- Partial trusted-universe scan is disclosed separately from load failure.
- Candidate with blocked paper-readiness stays blocked/watch-only.
- Excluded row can be inspected without action language or promotion.

### Rejection Criteria

- Candidate promotion happens when hard blocker, untrusted readiness, unavailable calibration, or blocked proof-chain should prevent it.
- Exclusion reasons are missing, collapsed into vague text, or not tied to source module fields.
- Today Review edits or depends on private source-module internals outside the architecture contract.
- UI uses advice/execution wording.

## C2-WP-05 - Research Thesis And Evidence Checklist

### Acceptance Scenarios

- User can create/edit/read a private local thesis note with bull case, bear case, invalidation, catalyst, evidence checklist, status, review date, and links/references to relevant readiness/proof states.
- Checklist can reference data readiness, Signal Quality usability, Calibration readiness, Strategy Proof, Today Review bucket, and Trade Plan paper-readiness.
- Allowed statuses include `WATCH`, `ACTIVE_RESEARCH`, `INVALIDATED`, `DEFERRED`, and `ARCHIVED`.
- Notes are owned by the authenticated user and are not visible to another user/test persona.
- Workflow remains research documentation only and does not introduce execution, advice, or recommendation language.

### API/UI Evidence To Collect

- API: create/update/list/detail/delete or archive responses as implemented, ownership checks, validation errors, and checklist reference fields.
- UI: thesis form, required fields/validation, status controls, checklist references, saved detail, edit flow, and archived/invalidated state.
- Record user ownership evidence and local/private persistence behavior.

### Focused Checks To Run

- Playwright: likely new or extended `stock-research-workbench`/research-thesis spec; also `research-hub.spec.ts` only if links are implemented there.
- Backend: focused Jest tests under `backend/tests/modules/stock-research-workbench` or new `research-thesis` module, including validation, service, route, and ownership tests.
- API/manual: authenticated create/update/list/detail flow with one thesis per status group where practical.

### Data Setup Limits

- Use small local fixture instruments/watchlist/Today Review references.
- Do not require upstream repair, signal generation, backtest runs, or Trade Plan generation to create thesis checklist references; unresolved references should render as unavailable/unknown.
- Do not integrate external notes, paid storage, hosted services, or AI-generated thesis content.

### Negative Cases

- Missing bull/bear/invalidation/checklist fields fail validation per contract.
- Invalid status or invalid checklist reference is rejected or stored as unavailable per contract.
- User B cannot read or mutate User A thesis.
- Deleted/archived/invalidate flows do not remove audit-critical evidence unexpectedly unless contract defines hard delete.
- Stale linked readiness/proof fields are labeled snapshot/current according to contract.

### Rejection Criteria

- Notes are globally visible or not scoped to authenticated user.
- UI or API suggests buy/sell/execute behavior from a thesis.
- Checklist references silently imply readiness when source evidence is missing.
- Implementation expands into generic external notes/sync/AI service behavior outside local scope.

## QA Scaling Plan

If multiple items reach Ready for QA concurrently, QA will scale by risk and independence:

1. Prioritize C2-WP-01 first if it changes readiness/repair contracts, because Today Review and downstream reviewability depend on it.
2. Run C2-WP-02 and C2-WP-03 in parallel only if their developer handoffs confirm non-overlapping Signal Generation and Strategy Proof files/contracts.
3. Hold final C2-WP-04 signoff until relevant source contracts it consumes are either complete or explicitly mocked/stable under Architect-approved public fields.
4. Run C2-WP-05 independently if it stays within Stock Research Workbench/research-thesis boundaries and does not require Today Review or Research Hub write scope.
5. Use one shared regression pass after two or more items land: Market Data readiness, Signal Generation/Quality, Strategy Proof/Backtesting, Today Review, Trade Plans, Research Hub, and thesis entry points.

Concurrent QA evidence should be split into per-work-packet evidence files at execution time. If capacity is constrained, execute source-of-truth modules before consumer UI modules: Market Data, Signal Generation, Strategy Proof, Today Review, then Thesis.

## Batch-Level Exit Criteria

- All implemented C2-WP-01 through C2-WP-05 items have passed their focused backend/API/UI checks or have documented blockers accepted by Orchestrator/PO.
- Architecture contract dependencies are reconciled, and no implementation relies on undocumented private fields.
- Developer-focused validation evidence exists before QA evidence.
- No paid/provider-heavy/broker/live-trading scope was introduced.
- Every mutating action remains explicit, local, bounded, scoped, and non-advisory.
- PO can review collected evidence without needing to infer safety from mock-only UI coverage.

# CF-W1-DQ-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split required. A bounded module-local first child (`CF-W1-DQ-02A`) is feasible. The full parent is not Ready for Implementation.

`CF-W1-DQ-02` cannot honestly be treated as one clean backend packet in the current codebase. The smallest safe first slice stays inside Data Quality Engine service/types/doc/tests and consumes existing Market Data public session exports without editing Market Data source. Broader persisted or API-wide currentness exposure is a separate follow-on because current `DataQualityEvaluation` rows do not store the needed session-aware fields.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/99-decision-inbox/open-decisions.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`

## Current Source Findings

- `data-quality-engine.service.ts` still derives stale/currentness from `STALE_PRICE_DAYS = 7` and `Date.now() - latestDate`.
- `market-data-foundation.market-session.ts` already exports `latestCompletedTradingDateForRegion()` and `shouldRunMarketDataSync()` through `market-data-foundation/index.ts`; the first child does not need new Market Data helpers.
- Market Data instrument payloads already project session-related evidence such as `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, and `trusted_baseline_blocker_codes`.
- `DataQualityEvaluation` persistence currently stores scores plus `dataGaps`, `warnings`, `readinessReasons`, and `readinessBlockers`, but it does not store `latestObservedTradingDate`, `latestCompletedTradingDate`, currentness status, or reason code.
- `data-quality-engine.repository.ts` reconstructs DTOs and summary counts from persisted string arrays, including stale detection via `latest price is stale`; that preserves fail-closed filtering once new blocker/gap strings are persisted, but it cannot emit a structured session-aware currentness object without a wider DQE read-side change.

## Architecture Decision

Do not promote the previously drafted all-in-one packet. Replace it with a two-part architecture result:

1. First child feasible:
   `CF-W1-DQ-02` first child can add service-local currentness classification and fail-closed propagation inside Data Quality Engine only.
2. Parent still split:
   full persisted/public exposure of currentness evidence remains blocked until Team 00 explicitly approves a wider DQE read-side/public-contract packet.

## Recommended First Child

Recommended first child scope:

- consume existing Market Data public session helpers from `backend/src/modules/market-data-foundation/index.ts`;
- classify currentness inside `data-quality-engine.service.ts`;
- add additive currentness evidence fields to the in-memory DQ evaluation DTO;
- convert non-current outcomes into stable blocker/reason-code strings so persisted DQ rows and strict callers keep failing closed without duplicating session logic;
- keep the slice backward-compatible by not requiring schema, route, repository, Market Data source, or frontend work.

The first child should support semantics equivalent to:

```ts
type DataQualityCurrentnessStatus = 'CURRENT' | 'STALE' | 'MISSING' | 'BLOCKED';

type DataQualityCurrentnessReasonCode =
  | 'CURRENT_COMPLETED_SESSION'
  | 'CURRENT_FINALIZATION_PENDING'
  | 'STALE_COMPLETED_SESSION_MISSED'
  | 'MISSING_LATEST_PRICE'
  | 'SESSION_EVIDENCE_UNAVAILABLE'
  | 'PROVIDER_GAP_BLOCKED';
```

Required first-child behavior:

- `CURRENT_COMPLETED_SESSION`: latest observed trading date matches the latest completed session.
- `CURRENT_FINALIZATION_PENDING`: market is open or in grace, and the latest observed date still matches the latest completed session rather than the in-progress day.
- `STALE_COMPLETED_SESSION_MISSED`: latest observed date lags the latest completed session.
- `MISSING_LATEST_PRICE`: no latest price exists.
- `SESSION_EVIDENCE_UNAVAILABLE`: region/session timing cannot be derived from existing Market Data public helpers.
- `PROVIDER_GAP_BLOCKED`: Market Data evidence already shows a provider-gap or missing-final-candle blocker.

## Exact Future File Reservations

Allowed first-child writer set:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Forbidden first-child files:

- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source/tests

If implementation discovers that the first child needs any Market Data helper edit, DQE repository edit, route change, generated-file change, or schema change, stop and return to Team 00. That is outside the bounded first-child packet.

## Explicit Parent Blocker

The full parent requirement is blocked from Ready promotion as a single packet because session-aware currentness evidence is not durably represented in persisted `DataQualityEvaluation` rows.

To expose currentness evidence consistently from list/summary/diagnostics paths, a later packet would need some combination of:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- possibly `backend/src/modules/data-quality-engine/index.ts`
- focused repository and route tests
- and, if durable date/reason fields are required instead of derived read-time reconstruction, a separate Prisma/schema approval path

That is a broader DQE public-contract/read-side change than the first child and must not be folded into the bounded slice silently.

## QA Planning Handoff For Team 04

Existing QA planning already exists in `04-qa/CF-W1-DQ-02A-qa-plan.md`. Team 04 should keep executable validation bounded to the first child only:

- current after latest completed session;
- current during open/grace window without false stale classification;
- stale when latest observed date lags the latest completed session;
- missing latest price;
- session-evidence unavailable for unsupported scope;
- provider-gap blocked via existing Market Data blocker evidence;
- `readinessBlockers`, `dataGaps`, and use-case tiers stay fail-closed for stale/missing/blocked outcomes;
- default `filterEligibleInstruments()` behavior still excludes non-current instruments through the existing strict path.

Team 04 should explicitly reject any implementation that widens into repository/list/summary/diagnostics persistence coverage, Market Data source edits, schema work, route work, or shared-file changes for this first child.

## Readiness Result

Split required.

- Module-local first slice feasible: yes.
- Ready recommendation for the parent as written: no.
- Current recommendation to Team 00: route the bounded first child to Team 04 QA planning, keep the broader parent blocked until DQE read-side/public-contract scope is intentionally approved.

## 2026-05-20 Residual Parent Revalidation After Accepted `CF-W1-DQ-02A`

Residual review against the accepted parked branch commit `c2d6753` (`codex/team05-market-data/CF-W1-DQ-02A`) confirms that `CF-W1-DQ-02A` should not be duplicated and that no honest `CF-W1-DQ-02B` exists inside a no-schema, no-route, no-repository boundary.

### Additional Evidence Inspected

- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- accepted branch evidence via `git show --stat --oneline c2d6753`
- accepted branch application/docs state via:
  - `git show c2d6753:backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `git show c2d6753:backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `git show c2d6753:backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `git show c2d6753:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02A-developer-handoff.md`
  - `git show c2d6753:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02A-qa-verification.md`
  - `git show c2d6753:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02A-code-review.md`
  - `git show c2d6753:docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-DQ-02A-architect-signoff.md`
  - `git show c2d6753:docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-DQ-02A-po-acceptance-packet.md`
- current shared-branch source:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`

### Residual Findings

- `c2d6753` only touched the approved DQE service/types/doc/test writer set plus execution-plan evidence docs. The accepted child boundary held exactly.
- On the accepted branch, additive `currentness` exists only on service-evaluated payloads. Persisted DQE read paths still reconstruct DTOs from repository rows that store blocker/gap arrays, not durable session-aware currentness fields.
- `summary()` still aggregates stale/missing counts from persisted `dataGaps`; it cannot expose currentness status/reason/date breakdowns without read-side widening.
- `list()`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()` still return repository projections. `diagnostics()` returns the persisted repository row whenever one already exists, so accepted `currentness` is not consistently visible on the investor-facing diagnostics path after the first persisted evaluation.
- A service-only workaround would either:
  - fabricate partial read-time currentness on selected endpoints while leaving list/summary projections inconsistent, or
  - refetch Market Data per persisted row and create a second live read-path contract that is not durably represented in DQE storage.

### Residual Decision

`BLOCKED`

No honest `READY-CANDIDATE` child exists inside a no-schema, no-route, no-repository boundary after accepted `CF-W1-DQ-02A`.

Why:

1. The remaining value is read-side/public-contract value, not more service-local classification.
2. Direct investor/trader trust requires currentness to be consistent on persisted diagnostics/list/summary surfaces, not only on freshly evaluated payloads.
3. Any bounded child that avoids repository scope would create selective exposure, duplicated fetch behavior, or misleading confidence about what persisted DQ rows actually know.

### Exact Consent Gate Required For Any Real Follow-up

Team 00 must explicitly authorize a DQE read-side/public-contract packet stacked on accepted commit `c2d6753`, with at least:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- focused repository/service tests
- controller/route-response test coverage if existing HTTP responses (`summary`, `list`, `diagnostics`) become additively currentness-aware

If Team 00 wants durable replayable currentness dates/reason codes rather than read-time reconstruction from blocker strings, the packet must stop and request separate Prisma/schema approval before implementation.

### Parallel-Safety Result

This residual parent is not parallel-safe for a new implementation child under the current no-schema/no-route/no-repository constraint.

- Safe now: docs-only architecture/outbox updates.
- Unsafe without consent: any implementation that touches DQE persisted read paths or promises investor-facing currentness on existing API responses.

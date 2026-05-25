# CF-W1-DQ-02 Read-Side Currentness QA Plan

Date: 2026-05-25

Owner: Team 04 QA Factory

## Work Item

`CF-W1-DQ-02-RS1` - Data Quality Engine read-side/public-contract currentness reconstruction.

## QA Status

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Docs-only QA planning is prepared from the requirement, architecture packet, contract, work packet, Team 03 outbox, and current DQE source/test surface. Executable QA remains blocked until Team 00 promotes one exact implementation handoff for the reserved `data-quality-engine` repository/service/types/doc/test files only.

No Team 04 planning blocker remains. Team 00 can now evaluate this packet for Ready promotion as one bounded backend-only `data-quality-engine` child, provided it preserves the exact writer set and one-writer rule from the architecture packet.

## Verdict

The `CF-W1-DQ-02-RS1` QA plan is ready for Team 00 Ready evaluation as one bounded `data-quality-engine` read-side child.

Remaining Team 00 readiness work after this QA plan:

- copy the exact seven-file writer set from the architecture/work-packet packet into the Ready queue
- reserve one dedicated DQE writer for repository + service + types + doc + focused tests in a single pass
- keep the packet separate from Team 07 Today Review work and any Market Data, schema, route, shared-utility, package, frontend, provider, startup, or backfill widening

## Scope

First-slice QA for additive read-time currentness reconstruction across persisted DQE read surfaces.

Planned in-scope implementation surfaces, once Team 00 promotes an exact handoff:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Out of scope for this child:

- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/src/api/routes.ts`
- all `backend/src/modules/market-data-foundation/**`
- Prisma schema, migrations, generated files, or durable stored currentness fields
- package manifests, shared backend utilities, provider/scheduler/worker/queue/startup/backfill files
- all frontend source/tests and shared UI

## Contract Inputs Reviewed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- current `data-quality-engine` source/tests for packet-shape and gap confirmation:
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Current Source Alignment

- `summary()` currently delegates to repository aggregation that still derives `stalePriceCount` from `dataGaps` string matching, not from a shared session-aware currentness basis.
- `list()` currently returns repository DTO projections directly, with no additive read-side currentness contract.
- `diagnostics()` currently returns the persisted repository row as-is whenever one exists, which keeps persisted-row semantics ahead of reconstructed currentness semantics.
- `getLatestEvaluationForInstrument()` and `getEvaluationsForInstruments()` currently proxy repository results directly, so they can drift from summary/list/detail semantics if reconstruction is not centralized.
- `data-quality-engine.types.ts` currently has no read-side currentness object or equivalent additive currentness fields.
- Current repository/service/invariants tests cover fail-closed readiness behavior, but they do not yet prove one truthful currentness story across `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()`.

Those findings match the Team 02 requirement and Team 03 architecture verdict: the residual gap is the DQE read side and public contract, not another evaluator-only stale rule.

## Required QA Assertions

- Currentness metadata is additive only. Existing DQ score/status/gap/blocker/warning/use-case-tier fields remain present and unrenamed.
- The same instrument and same current authoritative evidence produce the same currentness story across:
  - `summary()`
  - `list()`
  - `diagnostics()` when a persisted row exists
  - `getLatestEvaluationForInstrument()`
  - `getEvaluationsForInstruments()`
- The reconstructed contract distinguishes, at minimum:
  - `CURRENT_COMPLETED_SESSION`
  - `CURRENT_FINALIZATION_PENDING`
  - `STALE_COMPLETED_SESSION_MISSED`
  - `MISSING_LATEST_PRICE`
  - `SESSION_EVIDENCE_UNAVAILABLE`
  - `PROVIDER_GAP_BLOCKED`
  - `CONTRADICTORY_EVIDENCE`
- Summary counts are derived from the same per-row reconstructed basis used by `list`, `diagnostics`, and latest-helper reads. No summary-only stale heuristic remains.
- Current completed session is explicit:
  - latest observed trading date equals latest completed trading date
  - currentness stays current
  - the reason code or equivalent semantics map to completed-session currentness
- Current finalization pending is explicit:
  - the in-progress or finalizing session does not force a stale result when the latest observed date still matches the latest completed trading date
  - the reason code or equivalent semantics map to finalization-pending currentness
- Stale missed completed session is explicit:
  - latest observed trading date is behind the latest completed trading date
  - the row is not allowed to remain implied-current because persisted blocker strings happen to be incomplete
- Missing latest price is explicit:
  - no latest observed trading date can be reconstructed
  - the output remains missing/blocked and does not imply freshness
- Session evidence unavailable is explicit:
  - if authoritative session timing cannot be derived from allowed public inputs, the contract must expose unavailable/blocked semantics instead of silently falling back to stale text
- Provider-gap blocked is explicit:
  - if allowed public evidence shows provider-gap or missing-final-candle style blocking, the row remains blocked and must not be upgraded to current
- Contradictory evidence is explicit:
  - if authoritative current inputs conflict, the row remains fail-closed
  - conflicting evidence must not be collapsed into a positive current story
- Fail-closed propagation is preserved:
  - non-current reconstructed states must not leave `dailyReview` or `signal` effectively ready when the row should remain blocked or unavailable
  - downstream helper consumers such as `filterEligibleInstruments()` stay fail-closed
- Research-support and local-first constraints remain intact:
  - no direct financial-advice wording
  - no new paid/cloud/provider/startup/backfill/live execution behavior
  - no separate DQE-owned session calendar implementation

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Current completed session | The same row/evidence maps to current completed-session semantics on `list`, `diagnostics`, latest helpers, and the summary breakdown. |
| Current finalization pending | The same row/evidence maps to current finalization-pending semantics on all five surfaces and is not reclassified stale because the current day is still forming/finalizing. |
| Stale missed completed session | The same row/evidence maps to stale missed-session semantics on all five surfaces; summary counts the row from that same reconstructed basis. |
| Missing latest price | The same row/evidence maps to missing-latest-price semantics on all five surfaces and remains fail-closed for downstream eligibility. |
| Session evidence unavailable | The same row/evidence maps to unavailable/blocked semantics on all five surfaces; no stale-text fallback or implied freshness is allowed. |
| Provider-gap blocked | The same row/evidence maps to blocked semantics on all five surfaces and preserves upstream blocking rather than rewriting the row as current. |
| Contradictory evidence | The same row/evidence maps to contradictory-evidence semantics on all five surfaces and stays fail-closed. |
| Summary/list/detail/latest parity | For a mixed set of reconstructed rows, summary counts are derived from the same reconstructed per-row basis used by `list`, `diagnostics`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()`. |
| Latest-helper propagation | `getLatestEvaluationForInstrument()` and `getEvaluationsForInstruments()` return the same currentness semantics later consumed by `filterEligibleInstruments()`, with no helper-only downgrade or upgrade drift. |
| Existing DQ payload compatibility | Existing DQ score/status/gap/blocker consumers remain backward-compatible because the currentness fields are additive only. |
| Forbidden-scope attempt | Any controller/router/route-registry/schema/generated/package/shared-utility/Market Data/frontend/provider/startup/backfill widening is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Focused backend tests after Team 00 promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Recommended backend build after accepted implementation and resource checks:

```powershell
cd backend
npm.cmd run build
```

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation does any of the following:

- edits any file outside the exact seven-file DQE writer set
- edits:
  - `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.module.ts`
  - `backend/src/modules/data-quality-engine/index.ts`
  - `backend/src/api/routes.ts`
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated files
  - package manifests
  - shared backend utilities
  - any `backend/src/modules/market-data-foundation/**`
  - provider/scheduler/worker/queue/startup/backfill files
  - any frontend file or shared UI file
- leaves different currentness semantics for the same instrument/evidence across `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()`
- keeps summary counts on stale/currentness categories derived from string matching or a separate heuristic instead of the same reconstructed per-row basis
- relies on persisted stale text alone when authoritative read-time evidence is available
- implies freshness when authoritative evidence is missing, blocked, or contradictory
- weakens current fail-closed downstream behavior for helper consumers or eligibility filtering
- introduces durable stored currentness fields, schema changes, or route widening
- duplicates Market Data session-calendar logic inside DQE instead of consuming existing allowed public session evidence

These are not soft warnings. They are rejection conditions for the bounded first child.

## Stop Conditions

Stop QA and return the packet to Team 00 / Architect if:

- truthful cross-surface reconstruction cannot be delivered inside the exact DQE writer set
- implementation requires Market Data source writers, schema/storage changes, route/controller widening, package/generated/shared scope, or frontend work
- summary/list reconstruction proves unbounded or clearly laptop-hostile for this child
- implementation can only make some of the five read surfaces truthful while leaving others persistence-shaped

## Evidence Required Later

- Exact implementation handoff limited to the reserved DQE repository/service/types/doc/test files only
- Scenario evidence for:
  - current completed session
  - current finalization pending
  - stale missed completed session
  - missing latest price
  - session evidence unavailable
  - provider-gap blocked
  - contradictory evidence
  - fail-closed propagation
- Proof that `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument()`, and `getEvaluationsForInstruments()` tell the same currentness story for the same instrument/evidence
- Proof that summary counts come from the same reconstructed per-row basis as row/detail/latest-helper reads
- Focused backend repository/service/invariants test output
- Backend build output
- Explicit note that no forbidden scope, no Market Data source edits, and no durable-storage widening occurred

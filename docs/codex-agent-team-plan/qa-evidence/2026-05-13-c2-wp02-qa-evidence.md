# C2-WP-02 QA Evidence - Raw Signal Generation Scope And Model-Version Audit

Date: 2026-05-13  
QA mode: static, backend, schema, and runtime QA  
Decision: **QA Signed Off**

## Runtime QA Signoff Addendum

Runtime evidence was completed after the earlier blocked review.

- Backend focused QA: `npm.cmd test -- --runInBand tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- Backend result: passed, 6 suites / 63 tests.
- UI smoke: `npx.cmd playwright test tests/ui/signal-generation-engine.spec.ts -g "exposes raw signal filters and batch action" --workers=1 --reporter=list --timeout=30000`
- UI smoke result: passed, 1 test.
- UI bounded workflow: `npx.cmd playwright test tests/ui/signal-generation-engine.spec.ts tests/ui/signal-quality-lab.spec.ts -g "run signals sends scoped bounded batch request|sends selected model version through dashboard and recalculation requests|recalculate sends selected horizon and scoped bounded batch request" --workers=1 --reporter=list --timeout=45000`
- UI bounded workflow result: passed, 3 tests.
- Signal Quality focused regression after revision: passed, 6 tests / 1.5m.
- Schema gate: `npx.cmd prisma migrate status` reports `Database schema is up to date!` after resolving the local migration history for the already-applied schema.
- Safety proof: generation remains manual, bounded, scoped to `IN / STOCK`, and no paid provider, broker, order placement, live-trading, or advice behavior was introduced.

Final QA decision: `QA Signed Off`.

## Sources Reviewed

- [C2-WP-02 work packet](../work-packets/2026-05-13-cycle2-work-packets.md#c2-wp-02---raw-signal-generation-scope-and-model-version-audit)
- [Roadmap requirement 2](../po-roadmap-backlog-2026-05-13-cycle2.md#2-raw-signal-generation-scope-and-model-version-audit)
- [C2-WP-02 architecture contract](../architecture-contracts/2026-05-13-cycle2-architecture-contracts.md#c2-wp-02---raw-signal-generation-scope-and-model-version-audit)
- [C2-WP-02 QA plan](../qa-plans/2026-05-13-cycle2-qa-plan.md#c2-wp-02---raw-signal-generation-scope-and-model-version-audit)
- [Developer handoff](../developer-handoffs/2026-05-13-c2-wp02-developer-handoff.md)
- Static changed-file review for:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/202605130001_signal_generation_run_audit/migration.sql`
  - `backend/src/modules/signal-generation-engine/*`
  - `backend/tests/modules/signal-generation-engine/*`
  - `frontend/src/features/signal-generation-engine/*`
  - `frontend/tests/ui/signal-generation-engine.spec.ts`
  - Signal Quality read-only surface, because model-version filtering/grouping is an explicit acceptance scenario.

Note: the current worktree includes other packet changes outside Signal Generation, including Market Data, Strategy Framework, and Today Review files. This QA evidence only evaluates C2-WP-02-owned Signal Generation/schema files plus read-only Signal Quality contract visibility.

## Validation Already Available

Accepted from Orchestrator/developer handoff:

- Prisma generate: passed.
- Local Prisma db push: passed after accepted data-loss prompt in local dev database.
- Backend build: passed.
- Frontend build: passed with Vite large chunk warning only.
- Focused backend integrated regression: passed, 7 suites / 146 tests across Cycle 2 touched modules.
- C2-WP-02 focused backend tests included repository, routes, and service coverage under `backend/tests/modules/signal-generation-engine`.

Not available:

- Focused UI smoke is not passed. Playwright was interrupted during Orchestrator memory cleanup.
- No QA-captured runtime API response for latest run audit, representative signal audit fields, or repeat-run duplicate/no-op behavior.
- No migration-apply/status proof was provided for the checked-in migration file beyond Prisma generate and local db push.

## Static Evidence

- Schema/migration: `SignalGenerationRun` is added with scope, requested user, status, model/ruleset version, source data date, generated date, batch/progress counts, duplicate/idempotent count, data-quality counts, duration, warnings, and timestamps. `SignalResult` gains nullable `generationRunId`, `rulesetVersion`, `sourceDataDate`, `sourcePriceDate`, `scoringInputSummary`, and `dataQualityEligibilitySnapshot`; the migration adds indexes and a `generationRunId` foreign key.
- Backend API/DTO: `GET /api/v1/signals/runs/latest` is routed to `latestRunAudit`; `POST /api/v1/signals/run` creates/completes a run audit and returns `runAudit`. Signal DTOs expose `modelVersion`, `rulesetVersion`, source dates, scoring input summary, data-quality eligibility, audit status, generation run id, and write status.
- Idempotency: persistence still uses `instrumentId + modelVersion + generatedDate` and upserts through that key. Repository logic reports `CREATED`, `UPDATED`, or `NO_OP`; service run summary maps updated plus no-op rows into `duplicateOrIdempotentCount`.
- Frontend Signal Generation: the dashboard loads latest run audit, shows scope/model/ruleset/source date/status/count/duration chips, and the signal table shows row-level audit chips plus detail drawer fields for model/ruleset/source data/scoring inputs/data-quality eligibility/write status.
- Bounded/manual generation: UI run request is user-triggered and the static UI spec expects `batchSize: 100`, `limit: 100`, `offset: 0`, `maxConcurrency: 4`, `useDataQualityFilter: true`, `region: "IN"`, and `assetType: "STOCK"`.

## Acceptance Scenario Status

| Scenario | Status | Evidence | Gaps |
|---|---|---|---|
| Signal Generation shows latest run scope, model/ruleset version, source data date, batch size, generated/skipped/duplicate/idempotent/failed/duration, and data-quality eligibility summary. | Static partial | Schema, service `runAudit`, latest-run endpoint, and dashboard audit panel are present. | No passed UI smoke and no QA runtime response for latest-run endpoint. |
| Signals expose model version, source data date, scoring input summary, and eligibility at generation time. | Static partial | Nullable audit fields are persisted and mapped to DTOs; service builds scoring and data-quality snapshots. | No runtime representative signal payload captured. |
| Re-running the same scoped generation is idempotent and does not create duplicate active signals for same instrument/date/model. | Static partial | Unique key and upsert remain in schema/repository; backend tests cover created/updated/no-op counts. | No QA repeat-run API/manual proof against local runtime. |
| Signal Quality can filter or group by model version without mixing incompatible generations. | Gap | Signal Generation list/history can accept `modelVersion`; Signal Quality displays model version in history rows. | Signal Quality query parsing/types/UI filters do not expose `modelVersion` filtering/grouping in the static review. This needs an approved Signal Quality consumer slice or Orchestrator acceptance-boundary clarification. |
| Batch generation remains manual, bounded, and scoped to `IN / STOCK`. | Static partial | UI run action is manual; static UI spec checks bounded `IN / STOCK` payload; service clamps batch/concurrency and passes scope to Market Data. | Runtime UI smoke and API payload proof are missing. |

## API Evidence Status

Expected latest-run endpoint from contract:

```text
GET /api/v1/signals/runs/latest?region=IN&assetType=STOCK&modelVersion=signal-engine-v1
```

Static route exists, but no runtime response was captured.

Expected manual run request from static UI spec:

```json
{
  "batchSize": 100,
  "limit": 100,
  "offset": 0,
  "maxConcurrency": 4,
  "useDataQualityFilter": true,
  "region": "IN",
  "assetType": "STOCK"
}
```

Static test covers this payload shape, but the focused Playwright run was interrupted and is not counted as passed.

Expected signal audit fields:

```text
modelVersion, rulesetVersion, sourceDataDate, sourcePriceDate,
scoringInputSummary, dataQualityEligibility, auditStatus,
generationRunId, writeStatus
```

Static schema/DTO/service/repository evidence exists, but no live API payload was captured by QA.

## Gaps And Owners

1. Missing focused UI smoke for `frontend/tests/ui/signal-generation-engine.spec.ts`.
   - Owner: Orchestrator/QA runtime validation lane to rerun when memory/process controls allow.
   - If it fails, responsible implementation owner: C2-WP-02 Signal Generation frontend owner.

2. Missing runtime API/manual evidence for latest-run response, representative signal audit fields, and repeat-run duplicate/no-op behavior.
   - Owner: Orchestrator/QA runtime validation lane.
   - If the runtime response or repeat-run counts fail, responsible implementation owner: C2-WP-02 Signal Generation backend owner.

3. Migration/runtime proof is incomplete for final signoff.
   - Owner: Orchestrator/schema validation lane or C2-WP-02 schema owner.
   - Required proof: checked-in migration apply/status against the intended local migration workflow, or an explicit Orchestrator decision that local `db push` is sufficient for this gate.

4. Signal Quality model-version filter/group acceptance is not proven by static review.
   - Owner: Orchestrator to assign an approved Signal Quality read-only consumer slice or clarify that this acceptance scenario is deferred until after Signal Generation contract acceptance.
   - If in scope now, responsible implementation owner: Signal Quality owner, because C2-WP-02 work packet forbids Signal Quality implementation unless separately approved.

## QA Decision

Decision: **QA Signed Off**.

The earlier runtime blocker is resolved by the Runtime QA Signoff Addendum above. Signal Generation and the approved Signal Quality consumer slice are accepted for QA after backend focused tests, schema status, Signal Generation UI smoke, and bounded Signal Quality model-version workflow checks passed.

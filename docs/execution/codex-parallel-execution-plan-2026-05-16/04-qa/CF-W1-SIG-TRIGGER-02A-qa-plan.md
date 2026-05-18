# CF-W1-SIG-TRIGGER-02A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Signal Generation persisted trigger-audit surfacing QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded backend-only `signal-generation-engine` child slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved Signal Generation files. The broader `CF-W1-SIG-TRIGGER-02` parent remains split-required and blocked from single-packet promotion.

Current status refresh: Team 03 prepared the bounded architecture/contract/work-packet set on 2026-05-18. Team 04 aligns this QA plan to the same no-schema, module-local first child and does not widen it into schema, route, frontend, downstream consumer, shared-file, or provider/live-data work.

## Scope

Validation plan for additive persisted trigger-audit surfacing and provenance labeling in `CF-W1-SIG-TRIGGER-02A`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Out of scope for this first child:

- Prisma schema, migrations, generated files, or any durable trigger-storage redesign
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- backend/frontend route registries
- frontend source/tests, shared backend utilities, shared UI, package manifests, or generated shared contracts
- `strategy-framework`, `strategy-decision-engine`, `today-trade-review`, `trade-plan-risk-engine`, `alerts-monitoring`, `portfolio-management`, `portfolio-intelligence`, `watchlist-management`, `ai-investment-copilot`, or `market-data-foundation` source edits
- provider, live-market, startup/backfill, paid/cloud, telemetry, broker, or broad downstream adoption work

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- `06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- `08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- `10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- `09-summaries/CF-W1-SIG-TRIGGER-01-po-acceptance-packet.md`

Current Signal Generation source surfaces already show the exact bounded gap this child must cover:

- `signal-generation-engine.service.ts` already adds `triggerContract`, but `withTriggerContract()` currently marks `created_at` and `updated_at` unavailable for every row and does not label whether `trigger_timestamp` came from `sourcePriceDate` or `sourceDataDate`.
- `signal-generation-engine.service.ts` currently derives `strategy_id` and `strategy_version` from transient `strategyMatches[]` enrichment when present, but that enrichment is not labeled as compatibility-only provenance.
- `signal-generation-engine.repository.ts` already persists and rehydrates `generationRunId`, `rulesetVersion`, `sourceDataDate`, `sourcePriceDate`, and DQ eligibility snapshots for current rows, but the trigger projection still drops persisted row audit timestamps and run timing/status evidence.
- Team 03 architecture review already confirmed the underlying persisted row/run evidence exists for `SignalResult.createdAt`, `SignalResult.updatedAt`, and run `status`, `startedAt`, `completedAt`; this child is about surfacing that evidence honestly, not inventing new persistence.
- `signal-generation-engine.trigger-contract.test.ts` currently proves the first child predecessor only for unavailable-field and legacy-incomplete behavior, so this QA packet must extend coverage without weakening strict DQ trusted read/run/latest behavior.

## Required QA Assertions

- Trigger audit surfacing is additive only. Existing `SignalResultDto`, `triggerContract`, `contractStatus`, `unavailable_fields`, and `incomplete_reasons` fields remain present and unrenamed.
- Persisted row timestamps are exposed for current rows:
  - `created_at` uses the persisted row timestamp when the repository already owns it
  - `updated_at` uses the persisted row timestamp when the repository already owns it
  - current-row tests prove these fields are no longer hard-coded `null`
- Run audit metadata is additive and conditional:
  - when `generationRunId` resolves to a persisted run, additive run status and timing evidence are exposed
  - when a run row does not resolve, the packet does not invent run status or timestamps
- `trigger_timestamp` semantics are explicit and stable:
  - `SOURCE_PRICE_DATE` when populated from `sourcePriceDate`
  - `SOURCE_DATA_DATE` when populated from `sourceDataDate`
  - `UNAVAILABLE` when neither persisted source date exists
  - QA must reject any implementation or test that treats this child as proving a durable rule-fire timestamp
- Provenance labeling is explicit:
  - fields derived from persisted signal/run evidence are marked persisted
  - `strategy_id` and `strategy_version` remain compatibility-only when they come from transient `strategyMatches[]`
  - compatibility-only enrichment must not be upgraded into durable trigger provenance
- Current persisted evidence remains usable:
  - `reason_summary`, `passed_conditions`, `failed_conditions`, `data_quality_status`, `generationRunId`, `rulesetVersion`, and current DQ audit/readiness evidence stay consistent with current rows
- The following fields remain unavailable unless future approved work truly persists them:
  - `trigger_price`
  - `entry_rule_id`
  - `exit_rule_id`
  - `invalidation_rule_id`
  - `timeframe`
  - rule-version fields beyond current `rulesetVersion`
  - any lifecycle state richer than the optional module-local `detected` mapping
- Lifecycle semantics remain bounded:
  - only `detected` may be populated if the implementation can prove module-owned raw detection semantics
  - otherwise `lifecycle_status` stays `null` and explicitly unavailable
  - no other lifecycle state is allowed in this child
- Legacy row handling remains explicit:
  - missing audit/DQ evidence still yields `LEGACY_INCOMPLETE`
  - incomplete reasons stay visible rather than replaced by silent nulls
- Strict DQ trusted read/run/latest behavior does not regress:
  - current trusted reads still require `auditStatus === CURRENT`
  - `dataQualityEligibility.filterApplied === true`
  - `eligible === true`
  - `signalReadinessStatus === READY`
  - the child must not weaken fail-closed behavior to make trigger-audit rows more visible
- Research-support and local-first constraints remain intact:
  - no direct advice, target-price, guarantee, broker, or automation wording
  - no provider/live-data, paid/cloud, telemetry, or downstream behavior widening
- QA must reject the packet immediately if implementation touches forbidden scope.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Current trusted row with persisted `createdAt` and `updatedAt` | `triggerContract.created_at` and `triggerContract.updated_at` surface persisted timestamps and are removed from the unavailable-field list for that row. |
| Current trusted row with `sourcePriceDate` present | `trigger_timestamp` remains populated and additive semantics label it as `SOURCE_PRICE_DATE`, not a durable rule-fire timestamp. |
| Current trusted row with `sourcePriceDate` absent but `sourceDataDate` present | `trigger_timestamp` remains populated and additive semantics label it as `SOURCE_DATA_DATE`. |
| Current trusted row with neither source date | `trigger_timestamp` is `null`, timestamp semantics resolve to `UNAVAILABLE`, and incomplete reasons remain explicit. |
| Current row with `generationRunId` that resolves to a run row | Additive run audit evidence exposes stable equivalents of run `status`, `startedAt`, and `completedAt` without removing existing fields. |
| Current row with `generationRunId` that does not resolve to a run row | `generationRunId` may remain visible, but run status/timing evidence stays unavailable and is not fabricated. |
| Current row with transient `strategyMatches[]` enrichment attached | `strategy_id` and `strategy_version` may populate, but provenance labeling marks them compatibility-only rather than persisted trigger provenance. |
| Current row without strategy enrichment | `strategy_id` and `strategy_version` remain unavailable, and the compatibility-only field list is empty or equivalent. |
| Current row for unavailable trigger fields | `trigger_price`, rule ids, `timeframe`, and any unproven lifecycle state remain unavailable and still appear in the incomplete contract surface. |
| Legacy row missing audit or DQ snapshots | `contractStatus` remains `LEGACY_INCOMPLETE`, missing audit fields stay explicit, and the packet does not backfill invented timestamps or run evidence. |
| Trusted read/list/latest behavior after trigger-audit surfacing | Existing strict DQ trusted read/run/latest behavior remains unchanged; rows do not bypass current fail-closed gates because new audit fields were added. |
| Implementation touches Prisma/schema/migrations, generated files, routes/controllers/routers/validation, frontend, shared utilities/UI, package manifests, downstream modules, providers/live data, paid/cloud, broker, or telemetry | QA rejects exactly and returns the packet to Team 00 / Architect for re-splitting. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- controller/router/validation or route-registry widening
- frontend, shared utility, shared UI, package, or generated-contract changes
- Strategy Framework or downstream consumer edits as a backdoor for trigger provenance
- provider/live-market, startup/backfill, paid/cloud, telemetry, broker, or broad backend suites

## Exact Reject Conditions

Reject the packet immediately and return it to Team 00 / Architect if implementation edits:

- `backend/prisma/schema.prisma` or any migration file
- any generated file
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- any `frontend/src/**` file
- shared backend utilities or shared frontend components
- any package manifest
- any file under `backend/src/modules/strategy-framework/**`
- any file under `backend/src/modules/strategy-decision-engine/**`
- any file under `backend/src/modules/today-trade-review/**`
- any file under `backend/src/modules/trade-plan-risk-engine/**`
- any file under `backend/src/modules/alerts-monitoring/**`
- any file under `backend/src/modules/portfolio-management/**`
- any file under `backend/src/modules/portfolio-intelligence/**`
- any file under `backend/src/modules/watchlist-management/**`
- any file under `backend/src/modules/ai-investment-copilot/**`
- any file under `backend/src/modules/market-data-foundation/**`
- any provider, live-data, paid/cloud, broker, or telemetry path

These are first-child rejection conditions, not soft warnings.

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation cannot surface the bounded child using existing persisted signal/run evidence already owned by the module
- implementation needs Strategy Framework source changes, shared contracts, schema work, route work, or downstream consumer adoption to complete the packet
- implementation tries to claim durable rule provenance, rule-defined trigger price, or broader lifecycle ownership from evidence the module does not persist
- implementation treats transient `strategyMatches[]` enrichment as trusted persisted provenance
- implementation weakens current strict DQ trusted read/run/latest gates in order to expose more trigger-audit rows

## Evidence Required Later

- Exact implementation handoff limited to the reserved Signal Generation service/types/repository/doc/test files only
- Scenario evidence for persisted `created_at`/`updated_at`, run audit metadata, timestamp semantics, compatibility-only strategy provenance, unavailable-field preservation, and legacy-row handling
- Focused Signal Generation repository/service/trigger-contract/DQ-invariant test output only after approval
- Backend build output only after approval
- Confirmation that strict DQ trusted read/run/latest behavior remained intact
- Explicit note that schema, routes, frontend, shared files, downstream consumer adoption, durable rule provenance, rule-defined trigger price, and broader lifecycle ownership remained out of scope

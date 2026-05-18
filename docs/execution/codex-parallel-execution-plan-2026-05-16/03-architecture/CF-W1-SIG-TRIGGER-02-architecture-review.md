# CF-W1-SIG-TRIGGER-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split required. A bounded module-local first child (`CF-W1-SIG-TRIGGER-02A`) is feasible. The full parent is not Ready for Implementation.

`CF-W1-SIG-TRIGGER-02` cannot honestly be promoted as one clean no-schema packet. The current module already persists some audit evidence that the accepted `TriggerObjectV1` projection does not surface, but durable rule provenance, rule-defined trigger price, and downstream trigger adoption still cross blocked strategy/schema/shared boundaries.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-01-full-trigger-object-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-SIG-TRIGGER-01-po-acceptance-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-TRIGGER-01-architecture-readiness.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-01-trigger-object-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-TRIGGER-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-TRIGGER-01-qa-plan.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `frontend/src/features/signal-generation-engine/types.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Current Source Findings

- `SignalResult` already persists `generationRunId`, `rulesetVersion`, `sourceDataDate`, `sourcePriceDate`, `dataQualityEligibilitySnapshot`, `createdAt`, and `updatedAt`.
- `SignalGenerationRun` already persists run `status`, `startedAt`, `completedAt`, scope, and warnings.
- `signal-generation-engine.repository.ts` currently drops `SignalResult.createdAt`, `SignalResult.updatedAt`, and `SignalGenerationRun` timing/status evidence when mapping to `SignalResultDto`.
- `signal-generation-engine.service.ts` currently sets `triggerContract.created_at`, `triggerContract.updated_at`, and `triggerContract.lifecycle_status` to `null` for every row even though some row-level audit evidence already exists.
- `triggerContract.trigger_timestamp` is currently populated from `sourcePriceDate` or `sourceDataDate` without explicit semantics that this is source-bar timing, not durable rule-fire timing.
- `triggerContract.strategy_id` and `strategy_version` are filled only when a transient `strategyMatches[]` enrichment is attached. That is compatibility-only evidence, not persisted trigger provenance.
- No current persisted field stores rule ids, rule versions, timeframe, or rule-defined trigger price.
- `strategy-decision-engine` and `today-trade-review` consume `SignalResultDto` read paths, so any stronger trigger-evidence claim must separate persisted evidence from compatibility-only enrichment and must not silently change downstream consumers.

## Architecture Decision

Do not promote the full parent as one packet. Replace it with a split architecture result:

1. First child feasible:
   `CF-W1-SIG-TRIGGER-02A` can stay entirely inside `signal-generation-engine` by surfacing already-persisted audit metadata and labeling field provenance inside `TriggerObjectV1`.
2. Parent still split:
   durable rule provenance, rule-defined trigger price, broader lifecycle ownership, and downstream consumer adoption remain blocked for later approval-gated packets.

## Recommended First Child

Recommended first child scope: persisted audit surfacing and provenance labeling only.

The bounded slice should:

- expose existing `SignalResult.createdAt` and `SignalResult.updatedAt` through additive trigger-audit metadata instead of marking them unavailable;
- expose existing `SignalGenerationRun.status`, `startedAt`, and `completedAt` through additive trigger-audit metadata when `generationRunId` is present;
- add explicit timestamp semantics so `trigger_timestamp` can be read as `SOURCE_PRICE_DATE`, `SOURCE_DATA_DATE`, or `UNAVAILABLE`, rather than being mistaken for a durable rule-fire timestamp;
- distinguish `persisted` fields from `compatibility-only` fields inside the trigger audit payload, so transient `strategyMatches[]` evidence is not mistaken for durable trigger provenance;
- preserve research-support language and keep `trigger_price`, rule ids, rule versions, timeframe, and broader lifecycle states unavailable unless future approved work truly persists them.

Semantics equivalent to the following are sufficient; exact type names may differ:

```ts
type TriggerFieldEvidenceLevel = 'PERSISTED' | 'COMPATIBILITY_ONLY' | 'UNAVAILABLE';

type TriggerTimestampSemantics =
  | 'SOURCE_PRICE_DATE'
  | 'SOURCE_DATA_DATE'
  | 'UNAVAILABLE';

interface TriggerAuditEvidence {
  persistedFields: string[];
  compatibilityOnlyFields: string[];
  triggerTimestampSemantics: TriggerTimestampSemantics;
  runStatus: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | null;
  runStartedAt: string | null;
  runCompletedAt: string | null;
}
```

Optional lifecycle rule for the first child:

- if implementation can prove module-owned raw detection semantics without inventing downstream state, the only allowed populated lifecycle value is `detected`;
- otherwise `lifecycle_status` must remain `null` and explicitly unavailable.

No other lifecycle state may be claimed in this child.

## Exact Future File Reservations

Allowed first-child writer set:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Forbidden first-child files:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/types files
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/ai-investment-copilot/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/**`
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration files
- paid/cloud, broker, or telemetry files

If implementation discovers that the first child needs Strategy Framework source edits, shared contract changes, schema work, route work, or downstream consumer edits, stop and return to Team 00. That is outside the bounded first-child packet.

## Explicit Parent Blockers

The full parent remains blocked from Ready promotion as one packet because:

- durable `strategy_id`, `strategy_version`, rule ids, and rule versions are not persisted on `SignalResult` and durable Strategy Framework rule history is already blocked behind separate schema/generated approval;
- `trigger_price` is still not stored as a rule-defined observed price;
- any lifecycle state richer than module-local raw detection would widen into downstream adoption and shared semantics;
- Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, and Copilot adoption are explicitly out of scope for this requirement.

Those items must stay separate from the first child.

## QA Planning Handoff For Team 04

Team 04 should prepare bounded backend QA for `CF-W1-SIG-TRIGGER-02A` only:

- current persisted rows expose additive `created_at` and `updated_at` trigger audit evidence instead of hard-coded `null`;
- run-linked rows expose additive run `status`, `startedAt`, and `completedAt` evidence when `generationRunId` exists;
- `trigger_timestamp` semantics are explicit and never tested as a rule-fire timestamp unless the source proves it;
- transient `strategyMatches[]` fields are marked compatibility-only rather than persisted trigger provenance;
- `trigger_price`, rule ids, timeframe, and any still-unproven lifecycle semantics remain unavailable;
- legacy rows remain `LEGACY_INCOMPLETE`;
- existing DQ fail-closed trusted read/run/latest behavior does not regress.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

Team 04 should explicitly reject any implementation that widens into schema/migrations, Strategy Framework, route registries, frontend work, shared utilities/UI, downstream consumer modules, provider/live-data behavior, paid/cloud behavior, broker flows, or telemetry.

## Readiness Result

Split required.

- Module-local first slice feasible: yes.
- Ready recommendation for the full parent as written: no.
- Current recommendation to Team 00: keep `CF-W1-SIG-TRIGGER-02` out of Ready promotion as a single packet, and route only the bounded `CF-W1-SIG-TRIGGER-02A` child to Team 04 QA planning if this line becomes active.

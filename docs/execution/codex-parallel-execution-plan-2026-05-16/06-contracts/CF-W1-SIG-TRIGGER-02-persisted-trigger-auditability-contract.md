# CF-W1-SIG-TRIGGER-02 Persisted Trigger Auditability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Split-required contract. First child `CF-W1-SIG-TRIGGER-02A` only is defined here. Not Ready for Implementation.

## Contract Intent

The bounded first child improves trigger auditability by surfacing already-persisted Signal Generation audit evidence and by separating persisted evidence from compatibility-only enrichment inside the existing module-local `TriggerObjectV1` projection.

This contract does not approve durable rule-history work, schema changes, route changes, shared contracts, frontend work, or downstream consumer adoption.

## First-Child Boundary

Allowed implementation boundary:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- focused Signal Generation repository/service/trigger-contract/DQ-invariant tests

Forbidden in the first child:

- editing Prisma/schema/migrations or generated files;
- editing route registries, controllers, routers, validation, shared utilities, shared UI, package manifests, or frontend files;
- editing Strategy Framework, Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, Copilot, or Market Data source files;
- touching providers, live-data integration, paid/cloud, broker, or telemetry behavior.

If implementation cannot stay inside that boundary, the child fails the contract and must return to Team 00 for re-splitting.

## Required First-Child Semantics

The first child must keep `TriggerObjectV1` additive and must add audit semantics equivalent to:

```ts
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

The exact field names may differ. The semantics must not.

## Required Source Mapping Rules

- `created_at` must use the persisted `SignalResult.createdAt` timestamp when the row is current and the repository already owns the value.
- `updated_at` must use the persisted `SignalResult.updatedAt` timestamp when the row is current and the repository already owns the value.
- `trigger_timestamp` may remain the existing source-date mapping only if audit semantics explicitly label whether it came from `sourcePriceDate` or `sourceDataDate`.
- `generationRunId` may remain the run identifier, but when a run row is available the child must also expose additive run `status`, `startedAt`, and `completedAt` evidence.
- `strategy_id` and `strategy_version` may only be treated as compatibility-only evidence when they come from transient `strategyMatches[]` enrichment; they are not persisted trigger provenance in this child.
- `passed_conditions`, `failed_conditions`, `reason_summary`, `data_quality_status`, `rulesetVersion`, and current run audit ids may continue to use the existing persisted signal-row evidence where present.

## Lifecycle Rule

For the first child:

- if implementation can prove module-owned raw detection semantics without inventing downstream state, the only allowed populated lifecycle value is `detected`;
- otherwise `lifecycle_status` must remain `null` and explicitly unavailable.

No other lifecycle state may be claimed in this child.

## Required Unavailable Behavior

The first child must continue to mark these fields unavailable unless future approved work truly persists or owns them:

- `trigger_price`
- `entry_rule_id`
- `exit_rule_id`
- `invalidation_rule_id`
- rule version fields beyond current `rulesetVersion`
- `timeframe`
- any lifecycle state richer than the optional module-local `detected` mapping

The child must not fabricate those values.

## Backward-Compatibility Rules

- `SignalResultDto` must remain additive and backward-compatible.
- Existing Signal Generation trusted DQ read/run/latest behavior must remain intact.
- Existing `triggerContract.contractStatus`, `unavailable_fields`, and `incomplete_reasons` behavior must remain explicit.
- The child must make persisted-versus-compatibility-only evidence clearer; it must not silently upgrade transient strategy-match fields into trusted persisted trigger evidence.

## Explicit Non-Goals For The First Child

- No durable rule-history or rule-version persistence.
- No rule-defined trigger-price persistence.
- No new trigger table or persisted trigger JSON snapshot.
- No route/API replacement.
- No frontend or downstream consumer adoption.
- No Market Data, Strategy Framework, Strategy Decision, Today Review, Trade Plan, Alerts, Portfolio, Watchlists, or Copilot source changes.

## Parent Blocker Preserved

The full parent remains split-required because:

- durable rule provenance still depends on separate Strategy Framework durability work that is not available in the current no-schema boundary;
- rule-defined trigger price is not stored today;
- broader lifecycle ownership and downstream adoption remain cross-module concerns;
- any schema/shared/downstream expansion needs separate approval.

## Test Contract For Team 04

Focused backend tests for the first child must prove:

- persisted `created_at` and `updated_at` are exposed when the row already owns them;
- run audit metadata is exposed only when a generation run row exists;
- `trigger_timestamp` semantics distinguish source-price-date from source-data-date;
- compatibility-only strategy provenance is labeled as such;
- unavailable fields remain unavailable;
- legacy rows remain legacy-incomplete;
- DQ fail-closed trusted read/run/latest behavior still passes.

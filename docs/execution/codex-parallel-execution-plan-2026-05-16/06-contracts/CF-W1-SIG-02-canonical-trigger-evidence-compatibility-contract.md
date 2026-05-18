# CF-W1-SIG-02 Canonical Trigger Evidence Compatibility Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for one bounded backend-only `signal-generation-engine` child.

This contract is valid only when Team 00 sequences it on top of the accepted `CF-W1-SIG-TRIGGER-02A` semantics, either by stacking on parked commit `788c237` or by reserving the same Signal Generation writer set and folding those semantics into one pass.

## Contract Intent

Make the existing additive `triggerContract` packet the one canonical trigger-evidence packet for current Signal Generation read surfaces.

The child must not add a second competing trigger packet, must not require schema work, and must not widen into downstream consumer adoption.

## Canonical Packet Rule

- Keep `SignalResultDto` additive and backward-compatible.
- Keep the packet on `SignalResultDto.triggerContract`.
- Do not introduce a sibling field such as `canonicalTriggerEvidence`.
- Keep existing packet fields present.
- Add explicit provenance and packet-origin semantics so the packet becomes canonically self-describing.

## Required Contract Semantics

Field names may differ, but semantics equivalent to the following are required:

```ts
type TriggerEvidenceLevel = 'PROVEN' | 'COMPATIBILITY_ONLY' | 'UNAVAILABLE';

type TriggerEvidenceOrigin =
  | 'PERSISTED_SIGNAL_ROW'
  | 'PERSISTED_RUN_ROW'
  | 'REQUEST_LOCAL_ENRICHMENT'
  | 'REQUEST_LOCAL_GENERATION'
  | 'UNAVAILABLE';

type TriggerPacketOrigin =
  | 'PERSISTED_READ'
  | 'REQUEST_LOCAL_GENERATED';

type TriggerTimestampSemantics =
  | 'SOURCE_PRICE_DATE'
  | 'SOURCE_DATA_DATE'
  | 'UNAVAILABLE';

interface TriggerFieldProvenance {
  level: TriggerEvidenceLevel;
  origin: TriggerEvidenceOrigin;
}

interface TriggerCanonicalAudit {
  packetOrigin: TriggerPacketOrigin;
  fieldProvenance: Record<string, TriggerFieldProvenance>;
  provenFields: string[];
  compatibilityOnlyFields: string[];
  unavailableFields: string[];
  triggerTimestampSemantics: TriggerTimestampSemantics;
  runStatus: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | null;
  runStartedAt: string | null;
  runCompletedAt: string | null;
}
```

Exact type names may differ. The semantics must not.

## Contract Status Rule

For this child:

- `COMPLETE` means the packet fully explains evidence provenance, even if some business fields are null by design.
- `LEGACY_INCOMPLETE` remains valid for legacy rows missing current audit/readiness basis.
- `CONTRACT_INCOMPLETE` is reserved for implementation failure or truly unclassified required evidence.

Current non-legacy rows should not remain `CONTRACT_INCOMPLETE` merely because `trigger_price`, `timeframe`, or rule ids are intentionally unavailable.

## Required Field Mapping Rules

### Proven Current Evidence

These must be treated as proven when present from current owned persisted evidence:

- `signal_id` from persisted `SignalResult.id`
- `instrument_id`
- `symbol`
- `reason_summary`
- `passed_conditions`
- `failed_conditions`
- `data_quality_status` when current row already owns the DQ snapshot
- `created_at` from persisted `SignalResult.createdAt`
- `updated_at` from persisted `SignalResult.updatedAt`
- `generationRunId` when present
- run `status`, `startedAt`, and `completedAt` when the linked run row resolves
- `trigger_timestamp` only as source-date timing, with explicit semantics

### Compatibility-Only Evidence

These remain compatibility-only in this child:

- `asset_class` when derived from current instrument enrichment
- `region` when derived from current instrument enrichment
- `strategy_id` when derived from transient `strategyMatches[]`
- `strategy_version` when derived from transient `strategyMatches[]`

Compatibility-only evidence must be explicit. It must not be silently upgraded into persisted trigger provenance.

### Explicitly Unavailable Evidence

These must remain unavailable unless future approved work truly persists or owns them:

- `trigger_price`
- `timeframe`
- `entry_rule_id`
- `exit_rule_id`
- `invalidation_rule_id`
- rule-version fields beyond current `rulesetVersion`
- any lifecycle state richer than optional module-local `detected`

## Timestamp / Provenance Decision

- `created_at` and `updated_at` require repository-owned row mapping and must not stay unavailable.
- run audit timing/status requires repository-owned relation reads and must not be fabricated in service-only logic.
- `trigger_timestamp` may use `sourcePriceDate` first and `sourceDataDate` second, but the packet must declare which meaning applies.
- `latestForInstrument()` request-local generation must set packet origin equivalent to `REQUEST_LOCAL_GENERATED` even when the generated row is persisted before response return.

## Lifecycle Rule

For this child:

- populate `lifecycle_status` only if the implementation can honestly map the module-owned row to `detected`;
- otherwise keep `lifecycle_status` null and explicitly unavailable;
- no richer lifecycle state is allowed.

## Backward-Compatibility Rules

- Preserve existing `SignalResultDto` fields.
- Preserve existing route behavior.
- Preserve raw score, direction, filter, and DQ fail-closed behavior.
- Preserve research-support language.
- Preserve current `triggerContract` field presence.
- Preserve `unavailable_fields` and `incomplete_reasons`, though their exact content will change once canonical provenance is explicit.

## Exact File Boundary

Allowed implementation files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Forbidden:

- Prisma/schema/migrations or generated files
- route registries
- controller/router/validation/module/index/config files
- frontend files
- shared backend utilities or shared frontend components
- package manifests
- `strategy-framework`, `strategy-decision-engine`, `today-trade-review`, `trade-plan-risk-engine`, `alerts-monitoring`, `portfolio-management`, `portfolio-intelligence`, `watchlist-management`, `ai-investment-copilot`, or `market-data-foundation` source edits
- provider/live-data, paid/cloud, broker, or telemetry files

## Explicit Non-Goals

- no downstream consumer adoption
- no schema changes
- no shared contracts
- no trigger table
- no durable rule-history persistence
- no rule-defined trigger-price persistence
- no broader lifecycle ownership

## QA Contract Notes For Team 04

Focused QA must prove:

- current rows become canonically `COMPLETE` with explicit provenance classification;
- legacy rows remain `LEGACY_INCOMPLETE`;
- request-local generation is labeled explicitly;
- compatibility-only asset/region/strategy provenance cannot be mistaken for persisted-origin evidence;
- unavailable fields remain unavailable;
- DQ trusted read/run/latest behavior still fails closed.

# CF-W1-SMI-01 Smart Money Evidence Freshness And Partial-Trust Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for one bounded backend-only `smart-money-intelligence` slice. Not yet promoted for implementation.

## Contract Intent

Smart Money confirmation context must distinguish persisted daily snapshot evidence from on-demand derived fallback, expose the requested range plus bounded data-through framing, and mark missing ownership evidence as partial trust instead of allowing it to read like complete confirmation.

This contract increases trustworthiness without changing Smart Money scoring math, without widening into provider or storage work, and without pulling frontend implementation into the first child.

## Ownership

`smart-money-intelligence` owns this behavior.

Upstream modules remain read-only evidence providers:

- `market-data-foundation`

Downstream modules remain read-only consumers and must use persisted-only reads if they need bounded Smart Money context:

- `historical-context-snapshots`
- `market-context-intelligence`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `today-trade-review`
- `portfolio-intelligence`
- `ai-investment-copilot`

## Required Source Boundary

Implementation must stay inside:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Forbidden:

- repository, controller, router, validation, provider, module, public export, schema, migrations, generated files, route registries, shared backend utilities, shared UI, Market Data source, Data Quality source, provider/live-data, startup/backfill, packages, and all frontend implementation.

## Required Additive Contract

Additive metadata must be equivalent to:

```ts
type SmartMoneyEvidenceStatus =
  | 'USABLE'
  | 'LIMITED'
  | 'UNAVAILABLE';

type SmartMoneyFreshnessStatus =
  | 'CURRENT'
  | 'STALE'
  | 'UNKNOWN';

type SmartMoneyEvidenceSource =
  | 'PERSISTED_SNAPSHOT'
  | 'ON_DEMAND_DERIVED';

type SmartMoneyDataThroughBasis =
  | 'SNAPSHOT_DATE'
  | 'LAST_PRICE_BAR_DATE'
  | 'UNAVAILABLE';

type SmartMoneyOwnershipTrustStatus =
  | 'COMPLETE'
  | 'PARTIAL_OWNERSHIP_GAP';

type SmartMoneyEvidenceReasonCode =
  | 'PERSISTED_SNAPSHOT_USED'
  | 'ON_DEMAND_FALLBACK_USED'
  | 'SNAPSHOT_CURRENT'
  | 'SNAPSHOT_STALE'
  | 'OWNERSHIP_PLACEHOLDER'
  | 'INSUFFICIENT_PRICE_HISTORY'
  | 'DATA_THROUGH_FROM_SNAPSHOT_DATE'
  | 'DATA_THROUGH_FROM_LAST_PRICE_BAR'
  | 'DOWNSTREAM_PERSISTED_ONLY';

interface SmartMoneyEvidence {
  evidenceStatus: SmartMoneyEvidenceStatus;
  freshnessStatus: SmartMoneyFreshnessStatus;
  provenance: {
    source: SmartMoneyEvidenceSource;
    persistedSnapshotAvailableAtRequestStart: boolean;
    downstreamSafe: boolean;
    reasonSummary: string;
  };
  coverage: {
    requestedRange: SmartMoneyRange;
    snapshotDate: string | null;
    dataThroughDate: string | null;
    dataThroughBasis: SmartMoneyDataThroughBasis;
    rangeLabel: string;
  };
  ownershipTrust: {
    status: SmartMoneyOwnershipTrustStatus;
    ownershipDataStatus: SmartMoneyDataStatus;
    reasonSummary: string;
  };
  reasonCodes: SmartMoneyEvidenceReasonCode[];
  reasonSummary: string;
}

interface SmartMoneyStockSummary {
  // existing fields preserved
  evidence: SmartMoneyEvidence;
}
```

Exact property names can differ, but the semantics must remain stable and additive.

## Required Mapping Rules

Provenance rules:

- `PERSISTED_SNAPSHOT` means a persisted daily Smart Money snapshot already existed when the request began.
- `ON_DEMAND_DERIVED` means `stock()` had to calculate Smart Money context because no persisted daily snapshot was available at request start.
- `downstreamSafe = true` is allowed only on persisted snapshot responses.
- `downstreamSafe = false` must be used on on-demand derived fallback responses.

Freshness rules:

- `CURRENT` means the persisted daily snapshot is aligned to the current snapshot boundary and its `updatedAt` timestamp is not older than that boundary.
- `STALE` means a persisted row exists but its `updatedAt` timestamp predates the current snapshot boundary enough that the module should not frame it as current confirmation context.
- `UNKNOWN` is reserved for malformed or unavailable timing evidence.

Coverage rules:

- `requestedRange` must echo the Smart Money range used for the summary.
- `snapshotDate` must be visible for persisted daily snapshots.
- `dataThroughDate` must be visible with an explicit basis:
  - `SNAPSHOT_DATE` on persisted daily snapshot reads;
  - `LAST_PRICE_BAR_DATE` on on-demand derived reads;
  - `UNAVAILABLE` when insufficient history prevents a valid date reference.
- `rangeLabel` must make it clear whether the evidence covers the configured `1M`, `3M`, or `6M` Smart Money window.

Ownership-trust rules:

- `COMPLETE` is allowed only when ownership evidence is actually present.
- `PARTIAL_OWNERSHIP_GAP` must be used whenever insider/institutional ownership remains the current placeholder state.
- Missing ownership must not be hidden inside coarse `confidence` text only.

Evidence-status rules:

- `USABLE` is allowed only when Smart Money evidence is persisted, current, and not degraded by missing ownership or insufficient history.
- `LIMITED` must be used when evidence is useful but partial, including ownership-placeholder persisted snapshots and on-demand derived detail fallback.
- `UNAVAILABLE` must be used for missing persisted snapshots on downstream-safe reads and for insufficient-history detail fallback.

## Required Service Rules

- `latestPersistedStock()` and `latestPersistedStocks()` must remain persisted-only reads and must not trigger on-demand calculation or persistence.
- `stock()` may keep its existing fallback behavior, but when fallback occurs it must return explicit `ON_DEMAND_DERIVED` / `downstreamSafe = false` evidence framing.
- `top()` and `distribution()` must preserve current ordering while enriching each row with additive evidence metadata.
- Existing fields such as `smartMoneyScore`, `status`, `confidence`, `explanation`, `updatedAt`, `dataStatus`, `range`, `signals`, `insiderOwnership`, and `researchUrl` must remain present and backward-compatible.
- Existing route shapes and query params must remain unchanged.

## Required Product-Language Rules

- Use research-support wording such as `confirmation context`, `evidence`, `partial trust`, `current`, `stale`, `limited`, `unavailable`, and `reason summary`.
- Do not introduce direct-advice, target-price, guaranteed, broker, or automation language.

## Explicit Non-Goals

- No Smart Money scoring rewrite.
- No new ownership provider integration.
- No Market Data ingestion redesign.
- No Data Quality scoring duplication.
- No Prisma/schema changes.
- No route-registry changes.
- No shared helper or shared UI changes.
- No frontend implementation in this first child.

## Explicit Blocker Boundary

The bounded first child is not blocked.

Later blocked paths:

- exact durable persisted candle-level coverage dates;
- repository shape changes;
- schema additions for provenance/freshness persistence;
- frontend trust-surface rendering;
- cross-module consumer adoption beyond existing additive backward compatibility.

Those are separate follow-on packets and must not be folded into this child.

## Test Contract

Focused tests must prove:

- persisted snapshot provenance and currentness framing;
- stale persisted snapshot framing;
- missing persisted snapshot returns a downstream-safe data gap rather than an auto-generated Smart Money result;
- on-demand detail fallback is explicit and limited-trust;
- ownership-placeholder scenarios are marked partial rather than complete;
- additive backward compatibility of existing Smart Money summary fields.

## Ready Recommendation

`Ready candidate`

This contract is narrow enough for Team 04 QA planning and Team 00 Ready evaluation without schema, route, shared, Market Data source, Data Quality source, provider/live-data, startup/backfill, package, generated-file, or frontend approval.

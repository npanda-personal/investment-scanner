# CF-W1-MCTX-02 Market Context Freshness Basis Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Draft architecture contract for a bounded first slice. Not Ready for Implementation.

## Contract Intent

Market Context summary must tell downstream consumers whether the returned summary already existed as a persisted snapshot when the request began or whether it had to be generated on demand because persisted evidence was missing.

The first slice is backend-first and additive only. It must not widen into repository persistence, route changes, or frontend adoption.

## Ownership

`market-context-intelligence` owns the contract.

Downstream consumers such as Historical Context, Signal Calibration, Research Hub, and Today Review should reuse this owned basis packet later instead of inferring provenance from timestamps.

## Required First-Slice Boundary

Allowed future implementation boundary:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`

Forbidden:

- repository/controller/router/validation/index edits;
- frontend work;
- downstream consumer edits;
- Prisma/schema/migrations;
- route-registry, shared utility, shared UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Required Additive Semantics

The additive payload must preserve semantics equivalent to:

```ts
type MarketContextFreshnessBasis =
  | 'PERSISTED_AT_REQUEST_START'
  | 'GENERATED_ON_DEMAND'
  | 'GENERATED_FALLBACK_AFTER_MISSING_PERSISTED';

interface MarketContextBasisPacket {
  basis: MarketContextFreshnessBasis;
  persistedSnapshotAvailableAtStart: boolean;
  reasonCodes: string[];
  reasonSummary: string;
}
```

Recommended additive placement:

```ts
interface MarketContextSummary {
  // existing fields
  freshnessBasis: MarketContextBasisPacket;
}
```

Exact type names may differ. The semantics must not.

## Required Mapping Rules

- `PERSISTED_AT_REQUEST_START`: `summary()` found a persisted snapshot before any generation attempt.
- `GENERATED_ON_DEMAND`: the service had to compute the summary because no persisted snapshot existed at request start.
- `GENERATED_FALLBACK_AFTER_MISSING_PERSISTED`: reserved for the same first-slice generated path when the reason needs explicit missing-persisted wording for downstream trust.

The first slice must also preserve explicit existing reason labels for:

- macro intentionally unconfigured;
- partial evidence;
- low or missing breadth support where existing summary fields already justify that wording.

## Service Rules

- `summary()` must keep the existing regime math and persisted-save behavior.
- The first slice may refactor service flow so the generated response can be decorated before or after persistence, but without editing the repository contract.
- `latestPersistedSummary()` should remain a persisted-only read path and may return additive persisted basis metadata when non-null.

## Compatibility Rules

- preserve all existing summary fields and route shapes;
- add provenance metadata only;
- do not require frontend adoption in this child.

## Test Contract

Focused backend tests must prove:

- persisted path labeling;
- generated fallback labeling;
- explicit macro-unconfigured reason preservation;
- additive compatibility of the current summary DTO fields;
- no repository or route dependency widening.

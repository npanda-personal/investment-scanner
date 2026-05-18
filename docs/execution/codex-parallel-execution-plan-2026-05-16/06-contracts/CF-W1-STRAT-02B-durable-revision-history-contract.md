# CF-W1-STRAT-02B Durable Revision History Contract

Date: 2026-05-18

## Status

Proposal packet ready.

This contract defines the durable-history boundary for Strategy Framework after accepted `CF-W1-STRAT-02A`. It does not authorize Prisma/schema edits, migrations, generated artifacts, repository/service implementation, tests, UI work, or Ready-for-implementation promotion.

## Contract Intent

Strategy Framework needs durable persisted definition history keyed by strategy version, not just current registry trust metadata.

This packet exists to make that boundary exact before any high-risk `strategy-framework` or Prisma writer is opened.

## No No-Schema First Child

There is no remaining honest no-schema or no-generated first child for this requirement.

Why:

- `CF-W1-STRAT-02A` already owns the current source-declared trust metadata and DQ gate surface;
- durable history requires version-keyed persisted identity, which current Prisma and repository mappings do not provide;
- current Strategy Framework service reads do not consume persisted definition history for list/detail/proof payloads.

Any attempt to treat `02A` as durable history or to create a new service-only child without the persistence foundation must be rejected.

## Durable Identity Contract

Any future durable child must preserve behavior equivalent to:

```ts
interface PersistedStrategyDefinitionIdentity {
  strategyCode: string;
  strategyVersion: string;
  storageMode: 'VERSION_KEYED_IMMUTABLE';
}
```

Required behavior:

- `strategyCode + strategyVersion` is the durable persisted identity;
- reseeding the same version is idempotent;
- reseeding a newer version inserts a new persisted row;
- older persisted rows remain queryable after later version seeds.

Exact Prisma field names may differ, but the behavior may not.

## Rule Snapshot Contract

Each persisted version row must preserve the rule declaration snapshot for that stored version, including entry, exit, noise, risk, and market-gate rule JSON already owned by Strategy Framework.

Minimum rule-history rule:

- no fabricated durable history for legacy rows;
- no backfilled older-version claim unless a later approved packet proves a local-only reconstruction path;
- source-declared current registry metadata from `CF-W1-STRAT-02A` remains distinct from durable persisted history availability.

## Additive Service Metadata Contract

Any later compatibility child must expose additive metadata capable of distinguishing:

```ts
interface StrategyDurableHistoryMetadata {
  ruleVersioningStatus:
    | 'SOURCE_DECLARED_ONLY'
    | 'LEGACY_UNDECLARED'
    | 'DURABLE_PERSISTED_HISTORY';
  historyStatus:
    | 'CURRENT_ONLY'
    | 'PERSISTED_VERSION_HISTORY_AVAILABLE';
  reasons: string[];
}
```

Exact property names may differ, but all three state families must remain distinguishable.

## Closed Scope From `CF-W1-STRAT-02A`

The following are already owned by accepted `CF-W1-STRAT-02A` and must stay closed here:

- source-declared rule revision trust surfacing
- additive DQ gate policy surface
- existing Strategy Framework UI trust framing
- legacy undeclared fallback semantics for current-state trust

This packet must not reopen evaluator math, proof-status semantics, route changes, shared UI changes, or duplicate Data Quality scoring logic.

## Exact Split Contract

### `CF-W1-STRAT-02B1`

Approval-gated schema/generated/repository foundation only.

Expected future writer set, proposed only:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`

Scope:

- version-keyed persisted definition identity
- additive insert behavior for new versions
- idempotent update behavior for unchanged versions
- legacy row classification foundation

### `CF-W1-STRAT-02B2`

Additive service compatibility child only after `02B1`.

Expected future writer set, proposed only:

- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

Scope:

- list/detail/proof durable-history metadata exposure
- backward-compatible read-path distinction between current registry trust and durable persisted history
- legacy undeclared persisted-row behavior without fabricated history

## Explicit Rejection In This Pass

Reject the following from `CF-W1-STRAT-02B`:

- application source edits
- Prisma/schema edits
- migrations
- generated client/types
- repository or service implementation
- evaluator changes
- controller/router/validation changes
- frontend/shared UI changes
- route-registry changes
- Data Quality Engine source changes
- package/provider/startup/backfill/live-data work
- paid/cloud, broker, or telemetry work

If any of that is required now, this packet must be returned to Team 00 because it exceeds the approved docs-only boundary.

## Acceptance Criteria For This Contract

- It clearly states that no no-schema/no-generated first child remains.
- It keeps `CF-W1-STRAT-02A` closed.
- Durable persisted identity is fixed to version-keyed behavior.
- Legacy rows are explicitly non-fabricated.
- Additive service metadata states are explicit.
- `02B1` and `02B2` are split sharply enough for later file reservations and QA review.

## QA Handoff Notes

Team 04 should review this contract against the requirement and parent `STRAT-02` packet and confirm:

- the packet does not smuggle implementation approval into the docs pass;
- the split between `02B1` and `02B2` is sharp;
- durable history is not overstated for legacy rows;
- `02A` trust metadata remains separate from the durable-history problem;
- no forbidden widening into evaluator/proof/router/UI/DQ duplication scope is implied.

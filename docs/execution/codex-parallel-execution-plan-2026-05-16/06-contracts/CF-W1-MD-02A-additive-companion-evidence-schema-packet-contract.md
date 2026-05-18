# CF-W1-MD-02A Additive Companion Evidence Schema Packet Contract

Date: 2026-05-18

## Status

Proposal packet ready.

This contract narrows the accepted `CF-W1-MD-02` ADR direction into an exact proposal-only schema packet. It does not approve Prisma/schema edits, migrations, generated artifacts, repository/service changes, DQE handoff implementation, tests, or downstream adoption.

## Contract Intent

Market Data Foundation needs a future additive companion evidence record so durable readiness claims are not conflated with current `PriceTick` and `LatestPrice` compatibility rows.

`CF-W1-MD-02A` exists to define that future boundary exactly before any high-risk file is opened.

## Proposal Boundary

This packet is limited to the following contract decisions:

- companion evidence storage remains the chosen architecture direction;
- the first schema proposal stays additive-first;
- the minimum idempotent natural key is fixed;
- the minimum durable evidence field set is fixed;
- migration posture is additive and non-destructive;
- durable-versus-derived evidence claims are fixed;
- later implementation is split across `MD-02B`, `MD-02C`, and `MD-02D`.

This packet rejects all implementation work.

## Minimum Natural Key Contract

The companion evidence proposal must use this minimum natural key:

```text
instrument_id or canonical_symbol
region
asset_type
timeframe
trading_date or timestamp
source
source_symbol or provider_symbol where provider identity differs
```

The proposal must explicitly reject a fallback to `symbol + timestamp` as the durable evidence identity.

## Minimum Durable Evidence Contract

The companion evidence proposal must cover these minimum durable fields:

- identity and scope:
  - `instrumentId` when available
  - `canonicalSymbol`
  - `region`
  - `assetType`
  - `timeframe`
  - `tradingDate` or `timestamp`
- provenance:
  - `source`
  - `sourceSymbol`
  - `providerSymbol` when distinct
  - `sourceTimestamp`
  - `ingestedAt`
  - `batchRunId` or `sourceFingerprint`
- validation basis:
  - `validationWindowStart`
  - `validationWindowEnd`
  - `latestCompletedTradingDateBasis` or equivalent session basis
- durable readiness evidence:
  - duplicate-row evidence
  - invalid-row evidence
  - missing-candle evidence
  - stale-currentness evidence
  - suspicious-volume evidence
  - adjusted-close-fallback evidence
  - provider-gap evidence
  - durable-versus-derived marker
- audit timestamps:
  - `createdAt`
  - `updatedAt`

Reason codes may be normalized as strings or JSON only if they remain queryable enough for `MD-02B` read/write logic and `MD-02C` DQE handoff work.

## Migration Posture Contract

The first implementation packet must follow this posture:

- additive schema only;
- no destructive rewrite of `PriceTick`;
- no destructive rewrite of `LatestPrice`;
- no automatic startup migration behavior beyond normal Prisma migration execution;
- no live-provider backfill;
- no startup/backfill, repair-run, or scheduler coupling by default.

Pre-existing price rows remain valid price rows but do not become retroactively durable evidence unless a later approved packet proves local-only backfill from existing local data.

## Explicit Rejection In This Pass

Reject the following from `CF-W1-MD-02A`:

- source implementation in `market-data-foundation`
- Prisma/schema edits
- migrations
- generated client/types
- repository/service/provider changes
- startup/backfill or repair implementation
- DQE handoff implementation
- downstream adoption
- frontend or UI work
- shared utility or shared UI changes
- route-registry changes
- package changes
- paid/cloud, broker, telemetry, or live-provider work

If any of that is needed now, this packet must be rejected back to Team 00 because it exceeds the approved docs-only boundary.

## Exact Child Split Contract

### `CF-W1-MD-02A`

- proposal-only docs packet;
- no application writer;
- Team 04 QA review scope is contract completeness only.

### `CF-W1-MD-02B`

- approval-gated schema plus Market Data implementation packet;
- expected high-risk files later include:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/**`
  - generated Prisma client/types
  - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.md`
  - focused Market Data tests

### `CF-W1-MD-02C`

- DQE handoff packet after `02B`;
- expected files later include:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.md`
  - focused DQE tests
- if implementation needs DQE repository or schema work, that must be surfaced as a new blocker rather than silently folded in.

### `CF-W1-MD-02D`

- downstream adoption packet after `02C`;
- downstream modules must consume DQE public outputs only;
- Team 00 should split the downstream writer sets further if one-writer overlap appears across Lane 2 or Lane 3 modules.

## Acceptance Criteria For This Contract

- `MD-02A` remains proposal-only.
- Minimum natural key is explicit.
- Minimum durable evidence fields are explicit.
- Additive migration posture is explicit.
- Durable-versus-derived claim boundary is explicit.
- `MD-02B/C/D` split is explicit.
- High-risk implementation files remain blocked from this pass.

## QA Handoff Notes

Team 04 should review this contract against the parent ADR and confirm:

- no destructive migration semantics are implied;
- no implementation claims are smuggled into `02A`;
- the required evidence categories are all represented;
- the `02B/C/D` split is sharp enough that Team 00 will not route repository, DQE, downstream, or UI work under this child.

# DECISION-20260526 - CF-W1-MD-02B Schema And Generated Consent

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Status

Open.

## Affected Workstream

- `CF-W1-MD-02B` only.

`CF-W1-MD-02A` docs-only proposal review may continue. Unrelated implementation lanes may continue.

## Decision Needed

The Product Owner already approved the storage direction on 2026-05-17: companion durable readiness/evidence storage.

That earlier decision did not approve opening high-risk implementation files. Team 03 has now refreshed `CF-W1-MD-02A` and confirmed the next real blocker is explicit consent to open the first implementation child `CF-W1-MD-02B` with:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- Market Data Foundation repository/service/types/doc/test writers needed to persist and read the companion evidence row

The decision now is whether Team 00 may open that implementation lane at all.

## Evidence

- `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- `03-architecture/CF-W1-MD-02A-architecture-review.md`
- `08-work-packets/CF-W1-MD-02A-work-packet.md`
- `10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`
- read-only inspection of `backend/prisma/schema.prisma`
- read-only inspection of `backend/src/modules/market-data-foundation/market-data-foundation.md`
- read-only inspection of `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`

## Problem

The architecture direction is settled, but the consent boundary is not.

Current source proves:

- `PriceTick` is still keyed by `symbol + timestamp`
- `LatestPrice` is still keyed by `symbol`
- read models expose derived freshness and readiness basis
- scheduled and repair flows already emit run-level evidence such as `sourceFingerprint` and changed instrument sets

Current source does not prove:

- durable per-candle or per-trading-date companion readiness evidence keyed by scope, timeframe, source, and source symbol
- durable distinction between stored companion evidence and read-path-only derived evidence
- a Market Data owned persistence surface that DQE can later consume without leaning on inferred claims

So `CF-W1-MD-02A` can be QA-reviewed now, but implementation cannot start honestly without opening schema/migration/generated work.

## Option A - Open Narrow Additive Implementation Consent

Authorize `CF-W1-MD-02B` as the first implementation child with this narrow posture:

- additive companion evidence storage only
- no destructive rewrite of `PriceTick` or `LatestPrice`
- no append-only run-history table in the first child
- no startup backfill
- no live-provider migration behavior
- no DQE adoption
- no downstream consumer adoption
- no route registry, shared utility, shared UI, package, or frontend scope

Proposed first-child writer set:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

Impact:

- opens the smallest honest storage slice
- preserves additive migration posture
- keeps later DQE and downstream adoption separate

## Option B - Keep Proposal-Only And Defer

Do not open `CF-W1-MD-02B` yet.

Impact:

- keeps current derived/read-path evidence posture only
- preserves zero schema risk in the near term
- leaves Daily Overview, Signal Position Ledger, Research Hub, and later trust consumers without durable stored readiness proof

## Recommendation

Team 03 recommends Option A when Team 00 wants the next highest-value consent-gated storage lane.

Reason:

- the storage direction is already approved
- `CF-W1-MD-02A` has now bounded the first implementation slice tightly enough
- the proposed writer set stays inside Market Data Foundation plus Prisma/generated outputs
- DQE adoption and downstream widening remain explicitly blocked behind later children

## Forbidden Until Resolved

Do not begin `CF-W1-MD-02B` implementation.

Do not edit:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`

for this workstream until this decision is resolved and Team 00 records exact file reservations.

## Unaffected Work

The following may continue:

- `CF-W1-MD-02A` Team 04 docs-only proposal review
- active DOV / SPL / RH implementation and QA lanes
- unrelated docs-only architecture and QA packet prep

## Required Resolution Format

Product Owner must choose:

- Option A: open `CF-W1-MD-02B` as the narrow additive schema/generated implementation child; or
- Option B: keep MD-02 proposal-only and defer the storage lane.

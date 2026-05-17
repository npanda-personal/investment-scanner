# DECISION-20260517 Market Data Durable Readiness Storage ADR Resolution

Date: 2026-05-17

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-market-data-durable-readiness-storage-adr.md`

## Approved Option

Option B as ADR direction only: companion durable readiness/evidence storage.

## Approved Policy

- Use companion durable readiness/evidence storage as the approved ADR direction.
- Target natural key should include canonical symbol or instrument, region, asset type, timeframe, timestamp or trading date, source, and source symbol where needed.
- Market Data owns durable evidence persistence.
- Data Quality Engine remains the evaluator.
- Until implementation is approved, product claims must remain limited to derived/read-path evidence.

## Not Approved

This decision does not approve immediate:

- Prisma schema changes.
- Migrations.
- Generated type changes.
- Repository changes.
- Service changes.
- Data Quality Engine handoff changes.
- Provider or live-provider behavior.
- Startup/backfill behavior.
- Source or executable test implementation.

Any future Prisma schema, migration, generated type, repository, service, or Data Quality Engine handoff work must be split into separate implementation slices with architecture and QA approval.

## Queue Impact

The Decision Inbox blocker for `CF-W1-MD-02` is resolved as ADR direction only.

`CF-W1-MD-02` is not Ready for source/schema implementation. Team 03 should prepare a formal ADR and future split work packets. Any actual Prisma/schema/migration implementation remains a true consent blocker and must not proceed under this resolution alone.

Recommended next child-slice preparation:

1. ADR document for companion durable readiness/evidence storage.
2. Schema/migration proposal packet, approval-gated.
3. Market Data repository/service implementation packet, approval-gated.
4. Data Quality Engine handoff packet, approval-gated only if needed.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.


# DECISION-20260517 Market Data Validation Hardening Policy Resolution

Date: 2026-05-18

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-market-data-validation-hardening-policy.md`

## Approved Option

Option A: conservative validation hardening without durable readiness storage implementation.

## Approved Policy

- Reject future-dated candles relative to the accepted evaluation date or latest completed market session date.
- Reject `adjustedClose` when present but non-finite, zero, negative, or outside accepted policy bounds.
- Missing `adjustedClose` is allowed but must be represented as fallback or incomplete evidence, not as a trusted completeness claim.
- Negative volume remains invalid.
- Zero or suspicious volume should be warning/readiness evidence unless a later asset-class-specific policy marks it invalid.
- Spike rejection remains opt-in until durable corporate-action evidence and source context can distinguish bad provider rows from legitimate corporate actions.

## Not Approved

This decision does not approve:

- durable readiness storage implementation;
- Prisma schema or migration changes;
- route registry changes;
- shared utility changes;
- provider, startup, or backfill behavior;
- frontend changes;
- package manifest changes;
- generated type changes;
- live-provider calls.

## Queue Impact

The Decision Inbox blocker for `CF-W1-MD-01` is resolved.

`CF-W1-MD-01` is not automatically Ready for Implementation. Future implementation must be bounded to Market Data validation source/tests only if Team 05, Team 03, Team 04, and Team 00 confirm exact file reservations, focused tests, and no durable-storage/provider/schema scope.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.


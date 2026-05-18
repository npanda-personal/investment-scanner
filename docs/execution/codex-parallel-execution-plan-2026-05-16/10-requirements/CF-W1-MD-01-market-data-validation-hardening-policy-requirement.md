# CF-W1-MD-01 - Market Data Validation Hardening Policy Requirement

Date: 2026-05-17

Owner: TEAM-05 - Market Data / Data Quality

Status: Policy resolved. Not Ready for Implementation. Current Team 00 routing keeps this behind the Lane 3 and platform front-runners; Team 05 acceptance still gates it.

## Product Value

Market Data Foundation must prevent malformed, future-dated, or misleading OHLC rows from silently becoming trusted downstream evidence. The validation policy needs to be explicit before source or test work hardens historical-price validation.

This requirement supports trustworthy local research workflows by making validation behavior explainable and auditable without using paid providers, live provider calls, Angel One, broker credentials, startup/backfill behavior, or cloud services.

## Problem

Current historical-price validation handles:

- required symbol,
- valid Date object,
- finite OHLC values,
- non-positive OHLC prices,
- invalid low/high shape,
- open/close outside low/high,
- finite and non-negative volume when present,
- duplicate rows within the same fetched batch,
- opt-in abnormal price spike rejection.

The accepted policy now covers:

- future-dated candles,
- invalid, non-positive, or out-of-range `adjustedClose`,
- missing `adjustedClose`,
- zero or suspicious volume,
- default spike handling versus corporate-action-safe handling.

How validation findings become durable readiness evidence remains separate under `CF-W1-MD-02`.

## Current Evidence

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `04-qa/CF-W1-MD-01-qa-plan.md`
- `11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`
- Current Team 00 routing keeps this behind `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, `CF-W1-L3-ALERT-01`, and `CF-W1-L3-AUTH-03`.

## Approved Decision

Decision resolution:

- `07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`

Product Owner approved Option A: conservative validation hardening without durable readiness storage implementation.

## Accepted Policy Direction

- reject future-dated candles relative to the accepted evaluation date or latest completed market session date;
- reject `adjustedClose` when it is present but non-finite, zero, negative, or outside accepted policy bounds;
- permit missing `adjustedClose` as explicit fallback evidence, not as a trusted completeness claim;
- keep negative volume invalid;
- treat zero or suspicious volume as warning/readiness evidence unless a later asset-class-specific policy marks it invalid;
- keep price-spike rejection opt-in until durable corporate-action evidence and provider source context can distinguish true bad rows from splits, bonuses, and other corporate actions;
- emit stable validation reason strings suitable for later durable readiness evidence.

## Non-Goals

- No Prisma schema or migration change.
- No generated type change.
- No route registry change.
- No shared utility or shared UI change.
- No provider, Angel One, live-provider, startup/backfill, repair-run, or scheduler behavior.
- No frontend or UI implementation.
- No broad test suite.
- No product claim that durable evidence exists before `CF-W1-MD-02` implementation.

## Future Allowed Files After Decision And Ready Promotion

Only after Ready promotion, a focused implementation packet may reserve exact files such as:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- optional focused Market Data readiness tests if the accepted policy affects readiness evidence

No file is reserved by this requirement alone.

## Forbidden Files Until Separate Approval

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/type files
- route registries
- shared backend utilities
- package manifests
- provider, scheduler, startup, repair, backfill, Angel One, broker, or live-provider files
- frontend source, shared UI, Playwright tests

## Acceptance Criteria After Policy Approval

- Focused tests prove future-dated candle behavior.
- Focused tests prove accepted `adjustedClose` behavior.
- Focused tests prove accepted zero/suspicious volume behavior.
- Existing OHLC validation remains fail-closed.
- Existing duplicate batch-row behavior remains deterministic.
- Spike tests preserve corporate-action-safe behavior according to the accepted policy.
- Validation reason strings are explainable and suitable for later durable readiness evidence.
- No paid/cloud/provider/broker/startup/backfill behavior is introduced.

## Current Blockers

- Team 05, Team 03, and Team 04 still need exact validation-only reservations, architecture confirmation, and focused QA refresh.
- `CF-W1-MD-02` durable evidence implementation is still ADR/source/schema blocked.
- Team 05 has no app-code Ready queue item for this requirement.

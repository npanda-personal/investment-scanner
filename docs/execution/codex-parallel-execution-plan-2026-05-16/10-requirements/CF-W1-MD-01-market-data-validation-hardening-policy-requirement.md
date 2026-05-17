# CF-W1-MD-01 - Market Data Validation Hardening Policy Requirement

Date: 2026-05-17

Owner: TEAM-05 - Market Data / Data Quality

Status: Needs Product / Architect / QA Decision. Not Ready for Implementation.

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

Current historical-price validation does not yet have an accepted policy for:

- future-dated candles,
- invalid, non-positive, or out-of-range `adjustedClose`,
- missing `adjustedClose`,
- zero or suspicious volume,
- default spike handling versus corporate-action-safe handling,
- how validation findings become durable readiness evidence after `CF-W1-MD-02`.

## Current Evidence

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `04-qa/CF-W1-MD-01-qa-plan.md`
- `11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`

## Required Decision

Decision Packet:

- `99-decision-inbox/DECISION-20260517-market-data-validation-hardening-policy.md`

Product Owner, Architect, and QA must choose the validation policy before source or test implementation.

## Candidate Policy Direction

Team 05 recommends a conservative but corporate-action-safe policy:

- reject future-dated candles relative to the accepted evaluation or latest-completed market session date;
- reject `adjustedClose` when it is present but non-finite, zero, negative, or outside accepted policy bounds;
- permit missing `adjustedClose` as explicit fallback evidence, not as a trusted completeness claim;
- keep negative volume invalid;
- treat zero or suspicious volume as warning/readiness evidence unless the accepted scope says the asset class makes it invalid;
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

Only after policy acceptance and Ready promotion, a focused implementation packet may reserve exact files such as:

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

- Product Owner / Architect / QA validation policy is unresolved.
- `CF-W1-MD-02` durable evidence implementation is still ADR/source/schema blocked.
- Team 05 has no app-code Ready queue item for this requirement.

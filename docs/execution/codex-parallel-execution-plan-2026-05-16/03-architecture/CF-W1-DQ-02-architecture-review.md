# CF-W1-DQ-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only currentness-evidence architecture packet prepared. Not Ready for Implementation.

This packet is intentionally narrower than `CF-W1-MD-02`. It must use existing Market Data session logic and current stored latest-price evidence without opening durable-storage, Prisma, route, or provider scope.

## Evidence Inspected

- `AGENTS.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `03-architecture/CF-W1-MD-02-architecture-review.md`
- `06-contracts/CF-W1-MD-02-durable-readiness-evidence-contract.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`

## Current Source Findings

- Data Quality still uses `STALE_PRICE_DAYS = 7` and treats stale/currentness as a simple calendar-age check.
- Market Data Foundation already owns session timing and latest completed trading-date logic in `market-data-foundation.market-session.ts`.
- `latestCompletedTradingDateForRegion(region, now)` already expresses the correct completed-session boundary for `IN`, `US`, and `EU`.
- Data Quality evaluation DTOs do not currently expose stable currentness evidence fields or reason codes.
- Existing DQ filter and tier logic can already fail closed when stale/missing evidence is represented in blockers and tier statuses.

## Architecture Decision

Prepare `CF-W1-DQ-02` as a backend-only Lane 1 packet that:

- reuses Market Data Foundation public session evidence;
- adds explicit DQ currentness evidence fields and stable reason codes;
- maps non-current, missing, or blocked session evidence into DQ blockers and use-case tiers so strict callers can fail closed without duplicating logic;
- avoids durable-storage claims and avoids route/API expansion beyond additive DTO fields.

## Currentness Evidence Model

The first implementation packet should add additive DQ evidence fields equivalent to:

```ts
type DataQualityCurrentnessStatus = 'CURRENT' | 'STALE' | 'MISSING' | 'BLOCKED';

interface DataQualityCurrentnessEvidenceDto {
  status: DataQualityCurrentnessStatus;
  reasonCode:
    | 'CURRENT_COMPLETED_SESSION'
    | 'CURRENT_FINALIZATION_PENDING'
    | 'STALE_COMPLETED_SESSION_MISSED'
    | 'MISSING_LATEST_PRICE'
    | 'SESSION_EVIDENCE_UNAVAILABLE'
    | 'PROVIDER_GAP_BLOCKED';
  latestObservedTradingDate: string | null;
  latestCompletedTradingDate: string | null;
  daysBehind: number | null;
  reason: string;
}
```

Meaning:

- `CURRENT_COMPLETED_SESSION`: latest stored price matches the latest completed trading session.
- `CURRENT_FINALIZATION_PENDING`: market session is still open or in grace, and the latest stored price matches the last completed session rather than the in-progress day.
- `STALE_COMPLETED_SESSION_MISSED`: the stored latest trading date lags the latest completed trading session.
- `MISSING_LATEST_PRICE`: no latest stored price exists.
- `SESSION_EVIDENCE_UNAVAILABLE`: Market Data session logic cannot produce a completed-session boundary for the scoped region.
- `PROVIDER_GAP_BLOCKED`: Market Data public evidence already shows a provider-gap or missing-final-candle blocker.

## Exact Future File Reservations

- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/market-data-foundation/market-data.market-session.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- Market Data repository, provider, scheduler, startup, repair, worker, queue, or Angel One files
- Data Quality repository, controller, router, or validation files
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend source/tests
- provider/live-market validation, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- This packet does not depend on `CF-W1-MD-02` schema/storage implementation and must not claim durable evidence.
- This packet depends on existing Market Data session helpers remaining the single source of currentness timing truth.
- It conflicts with any active Lane 1 work that reserves `data-quality-engine.service.ts`, `data-quality-engine.types.ts`, or `market-data-foundation.market-session.ts`, including future `CF-W1-MD-01` or `CF-W1-MD-02` implementation packets.
- Downstream alerts, portfolio, watchlist, trade-plan, and Copilot packets should consume the resulting DQ evidence after this packet exists rather than recreating session logic.

## Required QA Scenarios

Focused backend QA should prove:

- latest stored data that matches the latest completed session is marked current;
- pre-close or grace-window evidence is not falsely marked stale;
- missing latest price yields `MISSING_LATEST_PRICE`;
- lagging latest price yields `STALE_COMPLETED_SESSION_MISSED`;
- unsupported or session-unavailable scope yields `SESSION_EVIDENCE_UNAVAILABLE`;
- provider-gap or missing-final-candle blockers can flow into a blocked currentness result without claiming freshness.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The file reservations are exact, but Team 04 QA planning and Team 00 sequencing are still required. Under the root dependency rule, this is the strongest new upstream candidate for QA prep before downstream trust consumers.

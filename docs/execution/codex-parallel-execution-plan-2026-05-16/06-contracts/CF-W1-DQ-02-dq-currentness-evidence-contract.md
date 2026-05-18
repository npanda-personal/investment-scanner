# CF-W1-DQ-02 Data Quality Currentness Evidence Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Backend-only currentness-evidence contract prepared. Not Ready for Implementation.

## Contract Intent

Data Quality Engine must expose explainable market-session-aware currentness evidence instead of relying only on a blunt calendar-age rule.

Market Data Foundation remains the source of session timing and latest completed trading-date evidence. Data Quality Engine remains the owner of readiness evaluation and downstream fail-closed gating.

## Required Source Boundary

Implementation must use Market Data Foundation public exports only.

Allowed direction:

- Market Data Foundation public session helper or public helper type
- Data Quality Engine service/types/docs/tests

Forbidden:

- importing Market Data repository/provider internals into DQE;
- duplicating session-calendar logic inside DQE;
- changing Prisma/schema, routes, providers, startup/backfill, or durable-storage behavior.

## Required Currentness Fields

Add additive DQ evaluation evidence with fields equivalent to:

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

The exact type name may differ, but the semantics must stay stable.

## Required Mapping Rules

- If latest stored price matches the latest completed trading session, currentness is `CURRENT`.
- If the market is still open or in grace and the latest stored price matches the most recent completed session, currentness remains `CURRENT` with `CURRENT_FINALIZATION_PENDING`.
- If latest stored price is missing, currentness is `MISSING`.
- If the latest stored trading date lags the latest completed session, currentness is `STALE`.
- If session evidence cannot be derived for the scoped region, currentness is `BLOCKED`.
- If Market Data public evidence already indicates provider-gap or missing-final-candle blocker, currentness is `BLOCKED` and must not claim freshness.

## Downstream Fail-Closed Rule

Non-current results must propagate into standard DQ outputs so strict callers can fail closed without adding custom stale/session logic:

- `STALE`, `MISSING`, or `BLOCKED` currentness must contribute to `readinessBlockers`;
- signal and daily-review use-case tiers must not report `READY` when currentness is `STALE`, `MISSING`, or `BLOCKED`;
- callers using existing strict DQ filters or use-case tiers must be able to exclude non-current instruments without copying session logic.

## Forbidden Behavior

- Do not silently treat unsupported or session-unavailable regions as current.
- Do not keep the old seven-day rule as the only source of stale reasoning.
- Do not claim durable or provider-auditable evidence from this packet alone.
- Do not modify DQ routes or create frontend-only stale semantics.

## Test Contract

Focused backend tests must prove:

- current completed-session evidence;
- current pre-finalization evidence;
- stale lagging evidence;
- missing latest-price evidence;
- session-unavailable evidence;
- provider-gap blocked evidence;
- strict downstream DQ tiers remain non-ready for stale/missing/blocked cases.

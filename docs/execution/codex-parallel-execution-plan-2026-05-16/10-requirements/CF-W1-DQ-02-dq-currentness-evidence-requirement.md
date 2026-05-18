# CF-W1-DQ-02 - Data Quality Currentness Evidence Requirement

Date: 2026-05-18

## Status

Audit-derived requirement draft. Not Ready for Implementation.

## Product Value

Data Quality is a gate for every downstream trust surface. Currentness needs to reflect the latest completed market session, not just a calendar-age heuristic, or traders and research users can be shown stale evidence as if it were fresh. This is an upstream trust contract for market data, signal-quality, calibration, alerts, portfolio context, and review workflows.

## Evidence

- Audit `11-module-audits/audit-market-data-data-quality.md` found that Data Quality still uses a simple 7-calendar-day stale rule.
- The same audit found Data Quality does not directly consume market-session currentness or durable duplicate, invalid, or missing-candle evidence.
- The audit also found downstream trusted consumers remain blocked until readiness and currentness evidence are aligned.
- `03-architecture/CF-W1-DQ-02-architecture-review.md` already defines a bounded backend-only slice that reuses Market Data Foundation session evidence instead of duplicating session timing logic.
- `06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md` already specifies additive currentness fields, stable reason codes, and fail-closed propagation into DQ outputs.
- `CF-W1-MD-01` and `CF-W1-MD-02` cover validation hardening and durable evidence storage, but neither alone defines the downstream currentness contract.

## Acceptance Criteria

- Data Quality exposes an additive currentness evidence object or equivalent fields that can be traced to the latest completed trading session where available.
- Missing latest price, session-unavailable, provider-gap, and lagging-session states use stable, explainable reason codes.
- Currentness logic does not silently claim freshness from incomplete, blocked, or provider-gapped evidence.
- Existing strict DQ callers can fail closed without duplicating market-session logic.
- Focused tests cover current, stale, missing, blocked, pre-finalization, and session-gap scenarios.

## Non-Goals

- No live provider, broker, startup/backfill, or paid/cloud workflow.
- No Prisma schema, route registry, or frontend change in this requirement draft.
- No duplicate currentness logic in downstream consumers.
- No durable-storage redesign; this slice only consumes existing public session evidence.

## Future Candidate Files After Ready Promotion

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

## Next Gate

Team 04 QA planning and Team 00 sequencing for the bounded Market Data / Data Quality currentness slice, with later implementation reserved to Lane 1 only after the exact handoff exists.

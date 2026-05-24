# CF-W2-BT-05 Backtesting Rule Exit / Invalidation Evidence Requirement

Date: 2026-05-24

## Product Value

Trusted Signal Candidates need evidence about how documented strategy exits and invalidation rules behaved historically. Backtesting already reports exit diagnostics, but optional simulation controls such as take-profit assumptions can be confused with arbitrary target semantics if downstream candidate workflows consume them carelessly.

The user value is a clearer backtest evidence packet for each strategy/run that separates documented rule exits and invalidations from compatibility simulation assumptions.

## Audit Evidence

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md` documents exit diagnostics and optional take-profit simulation controls.
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts` counts `TAKE_PROFIT` exits as a simulation exit reason.
- Product direction rejects arbitrary target prices, R:R, and synthetic profit targets for trusted signal candidate workflows.

## Requirement

Define a backtesting evidence slice that exposes documented strategy/rule exit and invalidation proof separately from optional profit-target or take-profit simulation assumptions.

Trusted candidate consumers should be able to answer:

- Which documented exit or invalidation rules were tested?
- How often did those documented rules trigger?
- Which exits were end-of-test, max-hold, stop/risk, or simulation-assumption exits?
- Whether a run is safe to use as supporting evidence for signal health without target/R:R framing.

## Acceptance Criteria

- Backtesting evidence clearly distinguishes documented strategy/rule exits and invalidations from optional take-profit or other simulation-assumption exits.
- Any take-profit/profit-target-like simulation output is not exposed as trusted signal candidate target evidence.
- Evidence includes strategy code, strategy version, timeframe, region, asset type, run freshness, sample/trade count, and exit/invalidation reason counts where current source supports them.
- Missing or unsupported documented exit/invalidation rules are surfaced as missing evidence, not inferred.
- Today Review or signal candidate consumers can later use the evidence as supporting context without adding arbitrary targets or R:R.
- No Prisma/schema, route registry, shared UI, package manifest, generated type, provider/live, startup/backfill, broker, paid service, or broad UI rewrite is included in this requirement.

## Non-Goals

- No new trading recommendation language.
- No new order execution or broker integration.
- No arbitrary target prices or R:R.
- No strategy-rule semantic rewrite without Architect approval.
- No durable storage change unless Team 00 opens a separate consent packet.

## Likely Module Ownership

- Backend: `backtesting-strategy-lab`
- Possible downstream consumers after separate approval: `today-trade-review`, `signal-quality-lab`, `strategy-decision-engine`
- QA: focused backend evidence-shape tests first; downstream UI tests only after a separate consumer slice is promoted
- Architecture: confirm whether an additive read-path DTO can be produced from existing run metrics/trades without schema changes

## Status

Planning-only. Team 00 should route this to Team 03 after active Today Review and Signal DQ gates are unblocked.

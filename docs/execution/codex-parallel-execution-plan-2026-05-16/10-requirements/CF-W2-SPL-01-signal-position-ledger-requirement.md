# CF-W2-SPL-01 - Signal Position Ledger Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: Parent requirement draft. Not Ready for Implementation. Team 00 still owns any future child promotion.

Suggested module name:

- User-facing: `Signal Position Ledger`
- Backend module: `signal-position-ledger`
- Frontend feature: `signal-position-ledger`

Why this name is safe:

- `signal` keeps the feature anchored to system-generated research evidence, not broker execution.
- `position` refers to a system-tracked research state created from documented entry-trigger evidence and later closed only by documented exit, invalidation, or expiry evidence.
- `ledger` signals auditability and historical traceability instead of discretionary trading, portfolio accounting, or paper/live execution.

Do not use `active trades` as the primary module name. That wording reads too close to execution ownership and direct-action framing.

## Product Goal

Create a dedicated investor/trader-value module that shows system-triggered active and closed signal positions using reliable filtered system evidence only.

The module should let the user answer:

- which signal positions are currently active;
- which signal positions are already closed;
- when the entry trigger happened;
- at what source-proven entry trigger price;
- why the entry trigger was accepted by the system;
- what the current open return is from entry to the latest trusted price for active items;
- when a documented exit, invalidation, or expiry closed the position;
- at what close price and for what reason;
- which strategy, rule, and version support the lifecycle state;
- what data-quality, trust, and evidence limitations still apply.

This is a research-support module. It must not imply broker execution, real holdings, or direct financial advice.

## Why This Should Be A Separate Module

Current accepted and active work already covers parts of this story, but not the full cross-session lifecycle:

- `today-trade-review` is the daily review and candidate-routing surface, not a durable active-plus-closed lifecycle ledger.
- `CF-W1-TSC-02A-TREV-HEALTH` established accepted active-health semantics, but it lives on Today Review surfaces.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is still Today Review support evidence, not a dedicated ledger/history workflow.
- `signal-generation-engine` can expose source-proven trigger-entry evidence, but it does not own an investor-facing active/closed ledger.
- `strategy-decision-engine` owns review candidates and decision semantics, not a lifecycle record of opened and closed signal positions.
- `backtesting-strategy-lab` owns historical proof, not live active/closed system position tracking.
- `portfolio-management` owns user-held portfolio records and must not be confused with system-triggered research positions.

Because of that separation, this work should not be hidden as a Today Review patch or a portfolio feature add-on.

## Required Product Language

Prefer:

- signal position
- active signal position
- closed signal position
- entry trigger
- exit trigger
- invalidation trigger
- expiry
- reason summary
- trust status
- evidence status
- strategy version
- rule version

Avoid:

- active trades
- open trades
- closed trades
- buy now
- sell now
- profit target
- price target
- realized profit
- broker position
- execution

## Required Evidence Model

A row may appear in this module only when the module can prove its state from existing module-owned evidence.

Minimum active-position basis:

- source-proven entry trigger date or timestamp;
- source-proven entry trigger price;
- entry reason summary;
- strategy/rule/version basis;
- current lifecycle state from documented rule evidence or accepted health semantics;
- latest trusted price basis or explicit missing/stale reason;
- latest data-quality and trust status.

Minimum closed-position basis:

- all required entry basis above; and
- documented exit, invalidation, or expiry evidence;
- close date or timestamp;
- close price basis;
- close reason summary;
- close type: `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`.

If the current source cannot prove the close, the row must not be silently shown as closed.

## Required Views

The module should eventually support:

1. `Active`
2. `Closed`
3. optional detail drilldown after the list/detail contract is architecture-approved

Required Active list fields:

- stock/company name
- symbol
- region
- asset type
- entry trigger date
- entry trigger price
- entry reason summary
- current trusted price date
- current open return from entry to latest trusted price
- active lifecycle state
- data-quality status
- trust/evidence status
- strategy code
- strategy version
- rule or trigger basis

Required Closed list fields:

- stock/company name
- symbol
- region
- asset type
- entry trigger date
- entry trigger price
- entry reason summary
- close type
- close date
- close price
- close reason summary
- closed return from entry to close
- data-quality/trust status at close where current source supports it, otherwise explicit unavailable status
- strategy code
- strategy version
- rule or trigger basis

## Guardrails

- Current return for active items must use the latest trusted price basis available for the current scope, or explicitly show missing/stale price evidence.
- Closed return must be based only on source-proven entry evidence plus documented close evidence. Do not estimate a close from later price movement.
- The module must not infer a close from target hits, Trade Plan geometry, raw price movement, or unsupported heuristics.
- The module must not duplicate strategy logic, data-quality scoring, calibration scoring, or backtest math owned by upstream modules.
- The module must remain honest about unsupported legacy rows, missing lifecycle proof, and stale evidence.
- The module may link to Today Review, Strategy Decision, Signal Quality, Backtesting, or Research Hub evidence, but it must not recalculate those modules' owned outputs.

## Recommended Child Path

Existing broad first child:

- `CF-W2-SPL-01A - Signal Position Ledger first slice`

New narrowed child after Team 03 source audit:

- `CF-W2-SPL-01B - Signal Position Ledger active positions read model`

Recommended path now:

1. implement `CF-W2-SPL-01B` first as an active-only read model using existing persisted/public evidence only;
2. defer closed history to a later durable lifecycle/storage child after Team 00 intentionally opens that path.

Why the split is required:

- current source can support source-proven entry basis, latest trusted price basis, DQ/trust visibility, and strategy/rule/version provenance for active rows;
- current source cannot truthfully prove reusable closed lifecycle rows with close date, close price, and close reason from existing persisted/public evidence alone;
- combining `Active` and `Closed` in one first slice would force either invented lifecycle truth or unexpected storage widening.

## Acceptance Criteria

- A dedicated `Signal Position Ledger` module path exists in the requirement lane.
- The requirement clearly separates system-triggered signal positions from broker execution, portfolio holdings, and Trade Plan geometry.
- Active rows require source-proven entry trigger evidence and visible lifecycle/trust status.
- Closed rows require documented exit, invalidation, or expiry evidence and must not be inferred from target-like or price-only heuristics.
- Active rows include current return from entry to the latest trusted price or an explicit missing/stale reason.
- Closed rows include close date, close price, close reason, and return from entry to close where current source can prove them.
- Strategy/rule/version provenance and data-quality/trust status remain visible on both active and closed rows.
- The requirement stays anchored to existing signal, strategy, Today Review, and backtest evidence rather than broker execution.
- No product copy or acceptance criterion introduces direct buy/sell wording, arbitrary targets, or reward/risk framing.

## Non-Goals

- No broker integration.
- No order lifecycle, fills, or execution audit.
- No quantity, capital allocation, portfolio sizing, tax, or P/L accounting.
- No portfolio reconciliation against real holdings.
- No Trade Plan target, stop, or reward/risk promotion into this module as truth source.
- No manual journaling feature in the first slice.
- No alerting or notification automation in the first slice.
- No route-registry, Prisma, generated-type, or shared-UI assumptions are pre-approved by this requirement alone.

## Dependencies

- Accepted `CF-W1-SIG-TRIGGER-ENTRY-01` for source-proven entry trigger price and timestamp basis.
- Accepted `CF-W1-TSC-02A-TREV-HEALTH` for accepted active-health semantics.
- Accepted or settled no-target Today Review stack (`CF-W2-TSC-04A` and `CF-W2-TSC-05A`) before any shared wording or Today Review reuse assumptions are made.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` remains useful if the first slice wants richer DQ/calibration/backtest support evidence.
- `CF-W1-STRAT-02B` remains a valuable future companion if exact durable strategy-version history is needed for higher-trust lifecycle replay.
- Team 03 architecture review already concluded that truthful closed-history support is not available from the current source without a later durable lifecycle/storage child.

## Explicit Forbidden Scope

Until Team 03 and Team 00 explicitly approve a bounded implementation packet, this requirement does not authorize:

- Prisma schema or migration changes
- route-registry changes
- shared backend utility or shared frontend component changes
- package manifest or generated-type changes
- broker, portfolio, or execution integration
- provider/live-trading, startup/backfill, paid/cloud, telemetry, or credential work
- Trade Plan-first UI or target/reward/risk framing
- silent cross-module rewrites in `today-trade-review`, `portfolio-management`, `trade-plan-risk-engine`, or `backtesting-strategy-lab`

## Next Gate

Team 03 should take `CF-W2-SPL-01B` as the next module-level architecture candidate after the active Today Review writer family clears and Team 00 confirms sequencing.

Team 04 should keep QA at scaffold-only status until Team 03 finishes the `CF-W2-SPL-01B` architecture/contract/work-packet packet.

Team 00 must not move this parent requirement to Ready from the requirement lane.

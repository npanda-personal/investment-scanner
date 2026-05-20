# CF-W1-L3-DQ-01A Lane 3 Passive Readiness DTO Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Contract prepared. Not Ready for Implementation.

This child freezes the accepted passive readiness DTO semantics already established by:

- `CF-W1-L3-PORT-01A` at accepted commit `f1432e6`
- `CF-W1-L3-PORT-01B` at accepted commit `a2edfb6`

It does not authorize a fresh combined portfolio-plus-watchlist implementation pass on plain current `dev`.

## Intent

Lane 3 passive display surfaces must expose readiness truthfully without implying actionability or reliability when the underlying DQ state is not trusted.

This contract governs only passive portfolio and watchlist display semantics.

It does not govern:

- alert creation
- review reliability labels
- watchlist review priority
- portfolio-intelligence ranking logic
- shared DTO extraction

## Approved Data Source Boundary

Allowed source boundary:

- `DataQualityEngineService` via the public module export only

Approved read methods:

- `getEvaluationsForInstruments(instrumentIds)`
- `getLatestEvaluationForInstrument(instrumentId)`

Forbidden:

- `diagnostics()` as a default read path
- `DataQualityEngineRepository` imports
- recreated readiness scoring, stale thresholds, liquidity scoring, coverage scoring, or use-case-tier scoring inside Lane 3 consumer modules

## Canonical Passive DTO Semantics

Canonical display semantics:

- `displayStatus = READY | LIMITED | BLOCKED`
- `actionStatus = READY | BLOCKED`

Canonical passive rule:

- `LIMITED` is visible passive context only
- `LIMITED` must not imply trusted display, trusted summary, or action-ready standing

Canonical blocked rule:

- missing DQ
- `NOT_READY`
- `UNUSABLE`
- stale hard blockers
- unsupported scope
- scope mismatch
- provider-gap blocker states when surfaced as blockers

must fail closed to blocked or untrusted passive context.

## Canonical Accepted Shapes

Portfolio passive readiness shape:

- `PortfolioHoldingReadinessDto`
- `PortfolioReadinessSummaryDto`

Watchlist passive readiness shape:

- `WatchlistItemReadinessDto`
- `WatchlistReadinessSummaryDto`

Canonical fields expected on item/holding readiness DTOs:

- `source`
- `instrumentId`
- `symbol`
- `displayStatus`
- `actionStatus`
- `signalReadinessStatus`
- `coverageStatus`
- `liquidityStatus`
- `dailyReviewTierStatus`
- `signalTierStatus`
- `eligibleForSignals`
- `reasons`
- `blockers`
- `warnings`
- `lastEvaluatedAt`

Canonical fields expected on passive summary DTOs:

- `status`
- `readyCount`
- `limitedCount`
- `blockedCount`
- `missingEvaluationCount`
- `canUseForTrustedDisplay`
- `canUseForActionWorkflows`

## Required Mapping Rules

The passive contract must preserve the accepted mapping behavior proven by `PORT-01A` and `PORT-01B`:

1. missing evaluation:
   - `displayStatus = BLOCKED`
   - `actionStatus = BLOCKED`
   - readiness tier/status fields use `MISSING` variants where defined
   - blocker includes `Missing data quality evaluation.`

2. automation-only blocker:
   - does not override otherwise-ready passive mapping
   - if daily-review tier is `READY`, signal tier is `READY`, and signal eligibility is true, passive display remains `READY`

3. limited evidence:
   - daily-review `LIMITED` or signal-readiness `LIMITED` maps to `displayStatus = LIMITED`
   - `actionStatus = BLOCKED`

4. hard-block evidence:
   - stale
   - unsupported
   - scope mismatch
   - `UNUSABLE` coverage
   - `NOT_READY`
   - daily-review tier `BLOCKED`

   map to `displayStatus = BLOCKED`

5. summary roll-up:
   - any blocked row makes summary `status = BLOCKED`
   - otherwise any limited row makes summary `status = LIMITED`
   - otherwise summary `status = READY`

## Freshness And Trusted-Date Rule

This child does not introduce a new `latestTrustedDataDate` field.

Current acceptable passive freshness evidence is:

- `lastEvaluatedAt`

If a later child needs a distinct trusted-date field, that must be proposed separately. `DQ-01A` must not reopen accepted DTOs only to rename or expand freshness metadata.

## Implementation Locality Rule

`DQ-01A` itself is not a new module-local implementation packet.

The accepted module-local implementation owners remain:

- `portfolio-management` through `CF-W1-L3-PORT-01A`
- `watchlist-management` through `CF-W1-L3-PORT-01B`

Therefore this child must not:

- reopen both modules together
- create shared readiness files
- start fresh code edits from plain current `dev`

## Dependency Rule

- accepted `f1432e6` is the canonical portfolio passive baseline
- accepted `a2edfb6` is the canonical watchlist passive baseline
- plain current `dev` contains neither accepted baseline
- active `CF-W1-L3-WATCH-01` must keep its existing watchlist writer ownership

Downstream consumers including `CF-W1-L3-DQ-01B` and later `INTEL-02` must treat this contract as the passive baseline and must not re-decide passive mapping rules independently.

## Forbidden Behavior

- do not treat `LIMITED` as trusted or action-ready
- do not infer trust from price, valuation, or latest signal presence alone
- do not add shared DTO files
- do not edit DQE source or exports
- do not edit `portfolio-management` or `watchlist-management` source under this child
- do not change Prisma/schema, migrations, route registries, shared utilities, shared UI, packages, generated files, providers, startup/backfill, live-data, paid/cloud, broker, or telemetry scope

## QA Planning Gate

Team 04 can start QA planning now against this contract.

Planning expectations:

- verify that accepted `PORT-01A` and `PORT-01B` semantics match this frozen passive contract
- require base/ancestor confirmation for `f1432e6` and `a2edfb6` before executable validation
- keep `DQ-01A` QA contract-level, not a fresh combined implementation execution pass

## Next Gate

Do not promote `DQ-01A` as a fresh code packet.

Use it to:

1. lock the passive readiness DTO baseline,
2. unblock Team 04 QA planning, and
3. route `CF-W1-L3-DQ-01B` as the next bounded implementation child.

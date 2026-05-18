# CF-W1-BT-01A Backtesting DQ Fail-Closed Characterization Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Characterization-only contract prepared.

This contract is for proving current `backtesting-strategy-lab` behavior. It does not authorize a fail-closed policy change.

## Contract Intent

Backtesting must have an explicit characterization record for the current DQ gate and history-completeness behavior before any later fail-closed rewrite is proposed.

The first child is descriptive:

- characterize current service behavior with focused tests;
- clarify the module doc;
- stop before service, route, schema, provider, or UI changes.

## Required Source Boundary

Allowed implementation scope for this child:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

Forbidden:

- all backend source behavior changes
- route tests or validation tests
- all frontend files
- Prisma/schema/migrations
- generated files
- route registries
- shared utilities/UI
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, and `trade-plan-risk-engine` source changes
- provider/live-data/startup/backfill/package changes

## Required Characterization Assertions

### 1. DQ Disabled Baseline

When `useDataQualityFilter` is false or absent:

- no DQE filtering is applied;
- the input universe is returned unchanged;
- metadata reports no DQ exclusions.

This assertion must be treated as a current-state characterization, not a trusted policy endorsement.

### 2. DQ Enabled Default Call Shape

When `useDataQualityFilter` is true and no stricter flags are supplied, the service must currently call DQE with:

- `minSignalReadinessScore = 70` when unset;
- `excludeNotReady = true`;
- `includeLimited = false`;
- `excludeIlliquid = true`;
- `excludeMissingQuality = false`;
- `missingQualityBehavior = WARN_AND_PROCESS`.

### 3. Missing-Quality Strict Option

When `excludeMissingQuality = true`, the characterization must prove the current service changes the DQE call to:

- `excludeMissingQuality = true`;
- `missingQualityBehavior = SKIP`.

The resulting filtered universe should reflect DQE exclusions returned by the mocked public dependency.

### 4. Limited / Not-Ready Option Pass-Through

When `excludeNotReady = false`, the characterization must prove the current service changes the DQE call to:

- `excludeNotReady = false`;
- `includeLimited = true`.

This proves that limited readiness can remain processable when the caller asks for it.

### 5. Registered History Completeness

For registered-strategy runs:

- no instrument with enough bars must produce `availabilityStatus = INSUFFICIENT_HISTORY`;
- mixed enough-history plus insufficient/missing-history instruments must produce `availabilityStatus = PARTIAL`.

The test should also make the underlying data-coverage counts explicit.

### 6. Warning-State Language

Current warning strings used by this path must remain research-support oriented. Characterization should verify wording such as:

- DQ exclusion warnings;
- insufficient-history warnings;
- benchmark unavailable warnings where relevant.

The child must not introduce trade-instruction, target-price, or guarantee wording.

## Compatibility Rules

- No current payload field is renamed or removed.
- No new API route or query parameter is added.
- No new DTO field is required in this first child.
- No simulation math, benchmark math, or strategy-evaluator behavior changes.

## Explicit Deferrals

The following remain outside this contract:

- any default fail-closed DQ behavior change
- user-visible trust badges or run-level review labels
- frontend rendering changes
- route/controller/repository changes
- schema/generated-file work
- trade-plan semantics
- strategy-rule or registered-strategy contract changes

If later work needs those paths, it must be split into a separate child packet.

## Test Contract

Focused coverage must prove:

- DQ-disabled fail-open baseline
- DQ-enabled default missing-quality warning/process semantics
- strict missing-quality skip semantics when explicitly requested
- limited/not-ready option pass-through when explicitly requested
- `INSUFFICIENT_HISTORY` for no qualifying registered history
- `PARTIAL` for mixed registered history completeness
- research-support warning wording remains intact

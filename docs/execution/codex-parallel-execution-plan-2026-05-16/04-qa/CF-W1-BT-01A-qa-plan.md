# CF-W1-BT-01A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: QA-plan ready for Team 00 Ready evaluation as one characterization-only `backtesting-strategy-lab` packet. Executable QA remains pending a future implementation handoff, and implementation sequencing must stay behind the accepted parked `CF-W1-BT-02` branch state because both children touch the same backtesting test/doc files.

## Scope

Validation plan for `CF-W1-BT-01A` backtesting Data Quality fail-closed characterization.

In-scope after Team 00 promotion:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

This child is characterization-only. QA should prove current behavior and current research-support wording without approving:

- service or type changes
- simulation-math changes
- default fail-closed behavior changes
- route/controller/repository/validation/module/export changes
- frontend/UI changes
- Prisma/schema/migration/generated changes
- shared utility/shared UI/package/provider/live-data/startup/backfill changes
- any widening into `CF-W1-BT-02` run-review rewrite or trade-plan semantics

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `03-architecture/CF-W1-BT-01A-architecture-review.md`
- `06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `08-work-packets/CF-W1-BT-01A-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-BT-01A-architecture-outbox.md`

Current source evidence inspected in `dev`:

- `backtesting-strategy-lab.service.ts:534` returns the full universe unchanged when `useDataQualityFilter` is false or absent.
- `backtesting-strategy-lab.service.ts:547-551` currently maps enabled DQ filtering to `includeLimited: !config.excludeNotReady`, `excludeNotReady: config.excludeNotReady ?? true`, `excludeMissingQuality: config.excludeMissingQuality ?? false`, and `missingQualityBehavior: config.excludeMissingQuality ? 'SKIP' : 'WARN_AND_PROCESS'`.
- `backtesting-strategy-lab.service.ts:494-495` currently maps registered history outcomes to `INSUFFICIENT_HISTORY` when no instrument has enough history and `PARTIAL` when mixed sufficient and insufficient/missing history exists.
- `backtesting-strategy-lab.service.ts:177-179` already emits research-support data-coverage warnings for no qualifying history, DQ exclusions, and bounded-universe caps.
- `backtesting-strategy-lab.service.ts:687-692` already emits research-support realism warnings for weak exits, low sample size, low coverage, benchmark underperformance, drawdown, and benchmark data gaps.
- `backtesting-strategy-lab.md:126-140` already documents the optional DQ filter inputs, states that the filter is disabled by default, and lists current DQ metadata fields.
- `backtesting-strategy-lab.md:180` already documents `availabilityStatus` values including `PARTIAL` and `INSUFFICIENT_HISTORY`.
- `backtesting-strategy-lab.service.test.ts:332` already covers one DQ-enabled filtering metadata path.
- `backtesting-strategy-lab.service.test.ts:485` already covers one registered insufficient-history path.

Gap still uncharacterized by current tests/docs:

- fail-open baseline when `useDataQualityFilter` is false
- default enabled-path `WARN_AND_PROCESS` missing-quality semantics
- caller-allowed limited readiness when `excludeNotReady=false`
- mixed-history registered `PARTIAL` outcome
- module-doc explanation that these are current descriptive semantics, not a fail-closed endorsement

## Required QA Assertions

- `useDataQualityFilter=false` or absent remains a current-state fail-open baseline:
  - DQE filtering is not invoked
  - the input universe is processed unchanged
  - `excludedForDataQuality` remains `0`
  - the evidence is framed as current behavior only, not a trusted fail-closed policy
- `useDataQualityFilter=true` with no stricter overrides currently calls DQE with:
  - `minSignalReadinessScore = 70` when unset
  - `excludeNotReady = true`
  - `includeLimited = false`
  - `excludeIlliquid = true`
  - `excludeMissingQuality = false`
  - `missingQualityBehavior = WARN_AND_PROCESS`
- `excludeMissingQuality=true` currently changes the DQE call to:
  - `excludeMissingQuality = true`
  - `missingQualityBehavior = SKIP`
  - the resulting filtered universe reflects DQE exclusions returned by the mocked public dependency
- `excludeNotReady=false` currently changes the DQE call to:
  - `excludeNotReady = false`
  - `includeLimited = true`
  - caller-allowed limited readiness remains processable
- registered backtests still map history completeness honestly:
  - no qualifying instrument history -> `availabilityStatus = INSUFFICIENT_HISTORY`
  - mixed qualifying plus insufficient/missing history -> `availabilityStatus = PARTIAL`
  - data-coverage counts show enough-history, insufficient-history, and missing-history inputs explicitly
- current warnings remain research-support only:
  - warnings use language such as warning, review, readiness, reliability, insufficient history, benchmark unavailable, or data coverage
  - no direct advice, no `buy now`, no `sell now`, no target-price wording, no guarantee wording
- QA must reject any implementation attempt that widens this child into:
  - simulation rewrite
  - source-level fail-closed policy change
  - `CF-W1-BT-02` review-disposition work
  - route/schema/frontend/shared-file changes

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| DQ disabled baseline | `useDataQualityFilter=false` or absent bypasses DQE filtering and preserves the full candidate universe as current behavior. |
| Default enabled DQ call shape | `useDataQualityFilter=true` with no stricter flags calls DQE with `excludeNotReady=true`, `includeLimited=false`, `excludeMissingQuality=false`, and `missingQualityBehavior=WARN_AND_PROCESS`. |
| Strict missing-quality option | `excludeMissingQuality=true` flips the DQE call to `missingQualityBehavior=SKIP` and the filtered-universe metadata reflects returned exclusions. |
| Caller-allowed limited readiness | `excludeNotReady=false` flips the DQE call to `includeLimited=true`, proving limited readiness remains processable when the caller asks for it. |
| Registered insufficient history | No qualifying registered-history instrument returns `availabilityStatus=INSUFFICIENT_HISTORY` and explicit insufficient-history counts. |
| Registered partial history | Mixed qualifying and insufficient/missing registered history returns `availabilityStatus=PARTIAL` and explicit mixed coverage counts. |
| Existing warning wording | Data-coverage and realism warnings remain research-support oriented and avoid direct-advice or target language. |
| Scope drift attempt | Any service/types/source-policy, route/schema, frontend/UI, shared-file, provider, or package widening is a QA reject. |

## Module-Doc Expectations

The module doc update for this child should remain additive and descriptive only. QA should confirm it explicitly states:

- the DQ filter is optional and disabled by default on current `dev`
- current enabled defaults still use warning/process semantics for missing DQ unless the caller requests strict skip behavior
- caller-allowed limited readiness is still processable when `excludeNotReady=false`
- `PARTIAL` and `INSUFFICIENT_HISTORY` are current registered-run history outcomes
- these notes characterize current trust limits and do not claim a fail-closed backtesting policy

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 promotion, single-writer sequencing, and implementation handoff:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Optional bounded backend build after approved implementation and resource checks:

```powershell
cd backend
npm.cmd run build
```

No frontend UI smoke, provider checks, Prisma commands, or broad suites are authorized for this child.

## Sequencing Risk With Accepted Parked CF-W1-BT-02

This QA plan is ready, but execution must respect the existing backtesting writer reservation:

- `03-architecture/CF-W1-BT-01A-architecture-review.md:111-114` records that `CF-W1-BT-02` already has accepted branch-local work parked outside `dev` and recommends integrating or stacking this child after that work.
- `08-work-packets/CF-W1-BT-01A-work-packet.md:94` records the same sequencing constraint and names the safe options: sequence behind accepted `CF-W1-BT-02` or assign one dedicated writer in a worktree that already contains the accepted BT-02 baseline.

QA should reject any implementation routing that asks two writers to edit:

- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`

in parallel across `CF-W1-BT-01A` and `CF-W1-BT-02`.

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend builds
- local servers and services
- frontend/UI smoke
- Prisma commands
- provider/live-data validation

Forbidden for this child:

- `backtesting-strategy-lab.service.ts` edits
- `backtesting-strategy-lab.types.ts` edits
- repository/controller/router/validation/module/public export changes
- route tests and validation tests
- all frontend files
- Prisma/schema/migrations/generated files
- route registries
- shared backend utilities and shared frontend components
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, and `trade-plan-risk-engine` source changes
- package/provider/live-data/startup/backfill/paid-cloud/broker/telemetry changes

## Stop Conditions

Stop QA and return the packet to Team 00 / Architect if:

- characterization requires any service or types edit
- implementation changes default DQ policy instead of documenting/testing current behavior
- implementation widens into `CF-W1-BT-02` run-review disposition work
- implementation touches forbidden files or shared routes/schema/generated surfaces
- the sequencing plan does not account for the accepted parked `CF-W1-BT-02` work on the same backtesting files

## Evidence Required Later

- exact implementation handoff limited to the reserved backtesting test/doc files
- focused service-test evidence for:
  - DQ-disabled fail-open baseline
  - default enabled `WARN_AND_PROCESS` semantics
  - strict missing-quality skip
  - caller-allowed limited readiness
  - `INSUFFICIENT_HISTORY`
  - mixed-history `PARTIAL`
- module-doc evidence that current trust limits are described without claiming a fail-closed policy
- explicit note that no simulation rewrite, source-policy change, route/schema/frontend/shared-file widening, or BT-02 review-disposition work occurred

# CF-W2-SPL-01A QA Plan

Date: 2026-05-26

## Work Item

`CF-W2-SPL-01A` - Signal Position Ledger first slice.

## QA Readiness State

BLOCKED BY MISSING GATE. NOT READY.

Team 04 can prepare requirement-aligned acceptance coverage now, but executable QA planning cannot be finalized because the requirement explicitly says `Architecture split required first` and asks Team 03 to decide read-model-only versus durable ledger/storage-first.

This document is therefore a blocked QA plan, not a Ready-for-implementation QA packet.

## Source And Requirement Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01-signal-position-ledger-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01A-signal-position-ledger-first-slice-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01-pre-architecture-qa-scaffold.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SIG-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-QA-01-focused-test-command-matrix.md`
- `backend/package.json`
- `frontend/package.json`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Why QA Is Blocked

The missing gate is explicit in the requirement set:

1. Team 03 must decide whether current persisted evidence can truthfully support a dedicated `Closed` list without new persistence.
2. Team 03 must decide whether the first honest implementation is:
   - one read-model-first active-plus-closed slice;
   - one active-only read-model slice followed by durable closed history later; or
   - one durable ledger/storage-backed first slice.
3. Team 00 must sequence the approved child after that architecture decision and record exact file reservations.

Until those gates are resolved, Team 04 cannot lock:

- exact backend test files;
- exact frontend spec names;
- route-level QA expectations;
- list/detail contract expectations beyond the requirement text;
- export scope for the first slice.

## Requirement-Aligned Acceptance Coverage

Once the architecture gate clears, Team 04 should accept only if all of the following pass.

### Active list

- Active signal positions appear only with source-proven entry trigger date/timestamp, entry trigger price, and entry reason summary.
- Active rows show company name, symbol, current trusted price date, current return percent, lifecycle state, trust/evidence status, data-quality status, and strategy/rule/version provenance.
- Current return percent is shown only when a latest trusted price basis exists.
- If the latest price basis is stale, unsupported, blocked, or missing, the row shows an explicit warning or unavailable state instead of a fresh-looking return.

### Closed list

- Closed signal positions appear only with documented close type `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`.
- Closed rows show company name, symbol, entry trigger date, entry trigger price, close type, close date, close price, close reason summary, closed return percent, trust/evidence status, and strategy/rule/version provenance.
- Closed return percent is calculated only from source-proven entry price and documented close price.
- Rows without documented close evidence stay out of `Closed` or remain explicitly unsupported.

### Trust boundaries

- The first slice stays separate from Today Review daily ranking semantics and from Portfolio holdings semantics.
- No row is upgraded to trusted active or closed status from target-like heuristics, reward/risk math, Trade Plan geometry, or later price movement alone.
- Data-quality and trust limitations remain visible and never silently upgrade weak evidence.
- The module consumes public upstream outputs where they already exist and does not duplicate strategy, DQ, or backtest calculations locally.

## UI State Expectations

Future executable QA must verify:

- empty state for no active rows in selected scope;
- empty state for no closed rows in selected scope;
- unsupported-proof state when current sources cannot prove close history;
- stale latest-price warning state for active rows;
- loading state for initial load;
- loading state for tab switch or scope refetch if those are independent;
- error state for failed fetch without falling back to fake zeros or blank success states.

## Sorting, Filtering, And Export Expectations

If the first slice is table based, Team 04 should require:

- explicit default sort documented by requirement or architecture;
- numeric sorting for returns and prices;
- chronological sorting for entry and close dates;
- predictable placement of unavailable values;
- filters that respect tab boundaries and do not relabel unsupported rows as trusted;
- symbol/company search that preserves row identity.

If export is approved in the implementation slice, Team 04 should require:

- export matches visible filtered truth unless the requirement later states otherwise;
- research-support wording only;
- visible trust/evidence/data-quality columns or explicit unavailable placeholders;
- no conversion of price return into realized profit, account performance, or other account-like semantics.

## Language Guard

Reject future implementation or test acceptance text if it introduces:

- `active trades`
- `open trades`
- `closed trades`
- `buy now`
- `sell now`
- `target price`
- `price target`
- `profit target`
- `reward/risk`
- `R:R`
- `realized profit`
- `broker position`
- `execution`
- `financial advice`

## Focused Command Recommendations After Gate Clears

Exact commands depend on Team 03's module and file decision. The most likely command families are:

```text
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts --runInBand
```

```text
cd backend
npm.cmd test -- signal-generation-engine.trigger-contract.test.ts today-trade-review.service.test.ts strategy-decision-engine.service.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

```text
cd backend
npm.cmd run build
```

```text
cd frontend
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

```text
cd frontend
npm.cmd run build
```

```text
rg -n "active trades|open trades|closed trades|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|broker position|execution|financial advice" backend/src frontend/src backend/tests frontend/tests
```

## QA Rejection Conditions

Reject the future implementation handoff if:

- active rows appear without source-proven entry evidence;
- closed rows appear without documented close evidence;
- current return uses stale or unsupported price data without visible warning;
- closed return is inferred from later market movement or target-like heuristics;
- the first slice widens into broker, portfolio, quantity, cost-basis, tax, or account P/L semantics;
- implementation requires schema, route, shared utility, shared UI, package, or generated-file changes without explicit architecture and Team 00 approval;
- the module duplicates DQ or strategy calculations instead of using upstream public outputs;
- trusted user-facing wording drifts into target/reward/risk/advice/broker language.

## Missing Gate

Required next gate: Team 03 architecture review and child-splitting recommendation for `CF-W2-SPL-01A`.

Until that gate exists, Team 04 cannot mark this item Ready for implementation QA.

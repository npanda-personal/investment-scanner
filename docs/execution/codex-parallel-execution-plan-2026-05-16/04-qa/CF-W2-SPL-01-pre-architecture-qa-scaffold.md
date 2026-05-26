# CF-W2-SPL-01 Pre-Architecture QA Scaffold

Date: 2026-05-26

Owner: Team 04 - QA Factory

Status: Requirement-aligned pre-architecture QA scaffold only. Not Ready for implementation or executable QA.

## Work Item

`CF-W2-SPL-01` / `CF-W2-SPL-01A` - Signal Position Ledger safe research-support workflow for active and closed system-triggered signal positions.

## Purpose

Prepare a docs-only QA risk and verification scaffold aligned to the Team 02 requirement drafts and held before Team 03 decides whether the first honest slice is:

1. a read-model-only module using current persisted evidence; or
2. a durable ledger/storage-backed slice.

This scaffold is intentionally generic. It defines what Team 04 must later verify without pre-approving schema, route, shared-contract, or UI decisions.

## Current QA Posture

Team 04 does not treat this item as Ready because the requirement still carries an architecture-first gate and key truth-source questions are still open:

- whether closed rows can be reconstructed honestly from current persisted evidence;
- whether the first slice is active-plus-closed, active-only, or split by implementation order;
- whether the workflow lands in a dedicated `signal-position-ledger` route immediately or first appears behind an existing shell surface;
- whether any export behavior is required in the first slice.

Until Team 03 resolves those boundaries, this packet is a guardrail and coverage template only.

This scaffold is specifically aligned to:

- `CF-W2-SPL-01 - Signal Position Ledger`
- `CF-W2-SPL-01A - Signal Position Ledger First Slice`

## Scope Assumptions For Later QA

Future executable QA should assume the module is research-support only and must remain separate from:

- broker execution;
- live or paper order workflows;
- portfolio holdings truth;
- quantity, capital allocation, tax, or realized P/L accounting;
- target price, reward/risk, or Trade Plan geometry as lifecycle proof.

Any implementation that crosses those boundaries is a QA rejection or Team 00 / Team 03 escalation.

## Acceptance Scenario Scaffold

Team 04 should require scenario coverage for at least the following cases once the implementation packet exists.

### Active rows

- Active row appears only with source-proven entry trigger timestamp/date, entry trigger price, entry reason summary, and strategy/rule/version provenance.
- Active row shows current return percent only when a latest trusted price basis exists.
- Active row shows explicit stale or unavailable price status when the latest price basis is stale, missing, unsupported, or blocked by data quality.
- Active row preserves visible trust/evidence status and data-quality status without silently upgrading weak evidence.
- Active row does not appear when entry trigger proof is missing, ambiguous, or derived only from heuristic replay.
- Active row shows company name and symbol, and should carry `region` and `assetType` whenever the parent requirement's broader list contract is included in the implementation slice.

### Closed rows

- Closed row appears only when close type is documented as `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`.
- Closed row includes close date/timestamp, close price, and close reason summary from documented evidence.
- Closed return percent is computed only from source-proven entry price and documented close price.
- Closed row remains excluded or explicitly unsupported when close evidence cannot be proven from documented rule evidence.
- Closed row does not infer closure from target hit, reward multiple, later price movement, or free-text heuristics.
- Closed row keeps close type visible as `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`.

### Lifecycle truth boundaries

- Active and closed tabs/lists never show the same row as both active and closed for the same lifecycle state.
- Unsupported legacy rows remain hidden or explicitly unsupported instead of being upgraded into trusted history.
- Scope changes by `region` or `assetType` refetch and recalculate the visible list using scoped evidence only.
- Strategy/rule/version fields remain visible, or explicitly show unavailable status when the source cannot prove them.
- The first slice stays separate from Today Review daily ranking semantics and Portfolio holdings semantics.

## Data Correctness Checks

Future QA must verify the implementation against these correctness rules:

- `current return percent` equals the price return from entry trigger price to latest trusted price, not realized account performance.
- `closed return percent` equals the price return from entry trigger price to documented close price only.
- Entry trigger date and price are sourced from upstream trusted entry evidence, not copied from display-only text.
- Close date and price are sourced from documented exit/invalidation/expiry evidence, not reconstructed from subsequent candles.
- Stock/company name and symbol remain aligned to the same instrument record across list rows and detail drilldown if detail exists.
- Data-quality status reflects upstream Data Quality Engine outputs or explicit unavailable status. The module must not invent a parallel DQ score.
- Trust/evidence status reflects real provenance limits such as stale price, missing close proof, unsupported historical replay, or unavailable strategy version.
- Sorting must not change numeric values, round-trip calculations, or mix unsupported rows into trusted result sets.
- Export output, if later approved, must preserve the same filtered dataset and the same safe semantics shown in the UI.

## Wording Guardrails

Team 04 should reject any trusted user-facing copy, DTO label, export header, or test acceptance text that introduces:

- `active trades`
- `open trades`
- `closed trades`
- `buy now`
- `sell now`
- `price target`
- `target price`
- `profit target`
- `reward/risk`
- `R:R`
- `realized profit`
- `guaranteed`
- `financial advice`
- `broker position`
- `execution`

Preferred wording remains:

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
- current return percent
- closed return percent

Team 04 should also reject any wording that relabels price return as:

- booked performance
- account gain
- portfolio profit

## Empty, Error, And Loading States

If the workflow is list or table based, Team 04 should require visible domain-specific states for:

- no active rows for the selected scope;
- no closed rows for the selected scope;
- no rows because trusted entry evidence is unavailable;
- no closed history because the current source cannot prove close events yet;
- stale latest-price basis preventing current return calculation;
- upstream fetch failure for list data;
- filter combination returning zero results;
- loading state for initial fetch;
- loading state for market-scope refetch;
- loading state for tab switch if active and closed are loaded independently.

Required state behavior:

- states must explain whether absence means no qualifying rows, unsupported proof, or a fetch error;
- loading must not show zero-state copy before the request resolves;
- stale or unsupported evidence must look different from success;
- errors must not fall back to misleading zeros, blank returns, or fake closed-history rows.

## Sorting, Filtering, And Export Expectations

If the first slice uses a table or table-like grid, Team 04 should require the following behaviors.

### Sorting

- Active list default sort should be explicit in the requirement or architecture packet. Team 04 should not accept an undocumented default sort.
- Numeric sorts must treat return percentages and prices numerically, not lexically.
- Date sorts must treat entry and close timestamps chronologically, not lexically.
- Unsupported or unavailable values must sort predictably and consistently.

### Filtering

- Minimum future filter expectations likely include status/tab, symbol/company search, strategy code/version, trust/evidence status, data-quality status, and, when exposed by the implementation, `region` and `assetType`.
- Filter chips or dropdowns must not relabel unsupported proof as trusted rows.
- Search must not merge different symbols or instruments into one row.
- Active and closed filters must respect the selected lifecycle tab and not leak rows across tabs.

### Export

If export is approved later, Team 04 should require:

- export reflects the same filtered and sorted visible dataset, unless the requirement explicitly says otherwise;
- export headers use research-support wording;
- export includes visible trust/evidence/data-quality columns or explicit unavailable placeholders;
- export excludes hidden internal-only fields unless the requirement explicitly names them;
- export does not convert unavailable values into zero, blank success states, or invented returns;
- export does not rename price return as realized profit or account performance.

## Focused Test Command Recommendations

These are recommendations only. Use them after Team 03 defines the slice and once the exact source/test files are known.

### Likely backend validation

If a dedicated backend module is created:

```text
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts --runInBand
```

If controller/validation/routes are added later and approved:

```text
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts signal-position-ledger.routes.test.ts --runInBand
```

Upstream regression checks likely needed depending on actual evidence reuse:

```text
cd backend
npm.cmd test -- signal-generation-engine.trigger-contract.test.ts today-trade-review.service.test.ts strategy-decision-engine.service.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Backend build gate:

```text
cd backend
npm.cmd run build
```

### Likely frontend validation

If a dedicated UI feature/spec is introduced:

```text
cd frontend
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

If the first slice is attached to an existing surface temporarily, run the relevant existing spec plus the new feature spec if created:

```text
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts signal-position-ledger.spec.ts --workers=1
```

Frontend build gate:

```text
cd frontend
npm.cmd run build
```

### Language guard

Run against the eventual changed files only:

```text
rg -n "active trades|open trades|closed trades|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|guaranteed|financial advice|broker position|execution|booked performance|account gain|portfolio profit" backend/src frontend/src backend/tests frontend/tests
```

## QA Rejection Conditions

Reject the future implementation handoff if any of the following occur:

- rows are shown as active without source-proven entry evidence;
- rows are shown as closed without documented exit, invalidation, or expiry evidence;
- current return is shown against stale, missing, or unsupported latest price without visible warning;
- closed return is inferred from price movement or target-like heuristics;
- target/reward/risk/broker/advice wording appears in trusted surfaces;
- data-quality or trust semantics are duplicated locally instead of consumed from upstream public outputs;
- route, schema, shared UI, shared utility, package, or generated-file scope is widened without explicit Team 00 / Team 03 approval;
- unsupported historical rows are silently upgraded into trusted closed history;
- export semantics, if present, differ from the visible filtered truth without explicit requirement support.

## Current Planning Blockers

- `CF-W2-SPL-01A` still says `Architecture split required first`.
- Team 03 has not yet decided read-model-only versus durable ledger/storage-first.
- The exact first-slice route and module boundary are not yet approved.
- Export may be deferred entirely from the first slice.
- Current workspace still contains older Today Review target/trade-plan language, so cross-surface wording verification must wait for the accepted base if this workflow reuses any Today Review surface.

## Next Gate

Team 03 architecture review and Team 00 sequencing decision.

After that, Team 04 should convert this scaffold into a bounded implementation QA plan tied to exact file reservations, exact commands, and exact rejection criteria.

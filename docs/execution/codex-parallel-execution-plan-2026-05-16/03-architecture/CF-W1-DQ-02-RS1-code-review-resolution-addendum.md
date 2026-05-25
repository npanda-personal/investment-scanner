# CF-W1-DQ-02-RS1 Code Review Resolution Addendum

Date: 2026-05-25

Owner: Team 03 Architecture Factory

## Status

Architectural correction after Team 10 rejection.

`CF-W1-DQ-02-RS1` is not fit for more Team 05 rework under the current packet shape.

## Verdict

`NO BOUNDED MODULE-LOCAL REWORK AVAILABLE`

Team 10's rejection is valid at architecture level, not only at implementation level.

The 2026-05-25 RS1 architecture/contract/work-packet stack overreached by requiring both of these at the same time:

- bounded summary behavior with no full-scope row loading; and
- summary parity with reconstructed row/detail/helper currentness that depends on Market Data per-instrument session evidence.

Current source does not provide a truthful way to satisfy both inside the approved DQE-only writer set.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- `03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- `06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- `08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- `13-implementation-evidence/CF-W1-DQ-02-RS1-ready-promotion.md`
- Team 10 rejection:
  - `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-DQ-02-RS1\docs\execution\codex-parallel-execution-plan-2026-05-16\13-implementation-evidence\CF-W1-DQ-02-RS1-code-review.md`
- Team 05 read-only implementation evidence:
  - `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
  - `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts`
  - `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- Market Data read-only public surface:
  - `backend/src/modules/market-data-foundation/index.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
  - `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- Prior durable-evidence direction:
  - `07-decisions/DECISION-20260517-market-data-durable-readiness-storage-adr-resolution.md`
  - `03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`

## Why The Current Packet Fails

### 1. Summary parity is not available inside the DQE-only boundary

`summary()` can stay bounded today only by using repository aggregates over persisted DQ rows.

But the reconstructed currentness classifier used on row/detail/helper reads depends on current Market Data evidence that is not stored on `DataQualityEvaluation` rows:

- `latest_price_date`
- `expected_latest_trading_date`
- `latest_completed_eod_date`
- `stored_data_through_date`
- `readiness_blockers`
- `trusted_baseline_blocker_codes`

Without those inputs, DQE summary cannot truthfully populate reconstructed `currentnessCounts` from repository data alone.

### 2. The current public Market Data surface has no usable bulk evidence path

Current public options are insufficient for summary parity without forbidden widening:

- `getInstrument(id, scope)` returns the needed evidence, but only per instrument and with recomputed readiness/baseline work.
- `getInstrumentsByIds(ids)` is batched, but it returns bare `toV1Instrument(stock)` output without the computed readiness/trusted-baseline fields needed by the same classifier.
- `listInstruments(...)` computes the needed evidence, but using it for `summary()` would require a full-scope paged scan of Market Data rows, which violates the bounded summary expectation.

So the missing capability is not in Team 05's implementation discipline. It is a missing cross-module bulk evidence contract.

### 3. Helper parity creates the same bulk fanout problem

The packet also required parity on:

- `getEvaluationsForInstruments()`
- `filterEligibleInstruments()` via helper consumption

Those helpers are bulk-consumed by downstream modules. Under current public inputs, truthful reconstruction requires repeated `getInstrument()` calls per instrument. That is module-local code, but not a bounded module-local architecture.

## Architecture Correction

Treat the 2026-05-25 RS1 Ready packet as architecturally superseded by this addendum.

Team 05 should not keep reworking the same seven DQE files in an attempt to satisfy the current RS1 contract. The blocker is upstream contract shape, not missing local polish.

## Rejected Rework Paths

The following are not acceptable fixes for the current packet:

- loading all DQE rows and reconstructing summary by scanning the full result set;
- paging all Market Data instruments only to backfill summary `currentnessCounts`;
- keeping summary bounded by legacy phrase matching while claiming reconstructed parity;
- adding DQE-local duplicate session logic;
- widening into Market Data source files without a new packet;
- adding durable currentness fields or schema/storage changes under RS1.

## Recommended Reframing

### Recommended immediate disposition

`Stop CF-W1-DQ-02-RS1 as blocked.`

Do not send the current packet back to Team 05 for another bounded DQE-only rework pass.

### Recommended future split for Team 00 decisioning

Open a Decision Packet with two explicit options:

1. Product-scope reduction option:
   - allow a narrower no-schema child where `summary()` does not expose reconstructed `currentnessCounts`;
   - explicitly remove bulk-helper parity from the child;
   - limit reconstructed currentness to bounded per-row reads only.

2. Full-parity option:
   - approve a future cross-module slice that first creates a truthful bulk evidence source for DQE summary and helper consumers;
   - acceptable directions are:
     - Market Data bulk evidence API/read model, or
     - approved durable Market Data evidence storage plus DQE handoff.

Under current requirement language, Option 1 is a scope reduction and needs Product Owner approval.
Option 2 is a cross-module architecture expansion and also needs Team 00 decisioning plus follow-on architecture/QA prep.

## Required Gate Type

`Decision Packet required`

This is not an Architect-only correction for implementation to continue unchanged, because:

- the requirement currently names `summary`, `list`, `diagnostics`, and latest-helper reads together;
- the current acceptance criteria require summary counts/breakdowns to share the same reconstruction basis;
- relaxing that requirement is product-scope change;
- preserving it requires a capability outside the DQE-only packet.

## Next Gate

Return `CF-W1-DQ-02-RS1` to Team 00 as blocked pending Decision Packet.

Decision Packet must ask the Product Owner to choose one of:

- reduce RS1 to bounded row/detail-only currentness truth and remove summary/helper parity from the child; or
- keep full parity as the goal and queue a future approved bulk-evidence or durable-evidence slice first.

Until that decision exists:

- Team 05: do not continue RS1 rework
- Team 04: do not re-run QA on RS1
- Team 10 rejection stands

## Structural Result

- No application files changed
- One architecture addendum added

## Validation

- Builds run: none
- Tests run: none
- UI checks run: none
- Live local data checks run: none
- Reason: docs-only architecture correction pass

## Risks / Assumptions

- Assumption: Team 10 rejection accurately reflects the Team 05 worktree reviewed on 2026-05-25.
- Residual risk: if Team 00 wants to salvage a smaller no-schema child quickly, Team 02 requirement wording must be updated first so Team 05 is not sent against a contradictory contract again.

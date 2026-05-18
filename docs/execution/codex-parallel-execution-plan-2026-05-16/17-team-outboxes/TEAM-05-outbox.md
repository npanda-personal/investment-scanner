# TEAM-05 Outbox

Date: 2026-05-18

Team: TEAM-05 - Market Data / Data Quality

State: Docs-only readiness inspection completed

## Branch / Worktree

- Branch: `dev`
- Worktree: shared repository worktree
- Team 00 assignment check: no alternate exact Team 05 docs target was assigned; `17-team-outboxes/TEAM-05-outbox.md` remains the required write target.

## Assignment

Evaluate whether `CF-W1-MD-01` can be promoted to a validation-only implementation slice without durable storage, providers, schema, route, startup/backfill, package, generated, frontend, or shared utility scope.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-05-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-01-market-data-validation-hardening-policy-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-01-market-data-validation-hardening-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-market-data-validation-hardening-policy-resolution.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/TEAM-05-market-data-data-quality-domain-audit-2026-05-17.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`

## Ready-Promotion Recommendation

Recommendation: **Do not promote `CF-W1-MD-01` to Ready as currently written.**

Reason: the prepared packet is close, but it still conflates two different scopes:

1. reject-only validation hardening that can stay inside `market-data-foundation.validation.ts` and its focused test; and
2. fallback/warning evidence for missing `adjustedClose` and suspicious volume, which the current validation API does not model cleanly without touching additional contracts or consumers.

## Why The Current Packet Is Not Yet Ready

### Blocker 1 - Warning/fallback evidence is not representable in the reserved validation surface alone

Current validation primitives:

- `validateHistoricalPrice(price)` returns only `string[]` errors.
- `partitionHistoricalPrices(prices, spikeThreshold?)` returns only `valid` and `invalid`, plus ad hoc duplicate metadata.

Current storage consumer behavior:

- `market-data-foundation.repository.ts` builds `warnings` only from `validation.invalid`.
- Valid rows with missing `adjustedClose` or zero volume currently produce no validation-side warning/fallback evidence.

Impact:

- The accepted policy says missing `adjustedClose` must be represented as fallback/incomplete evidence.
- The accepted policy says zero or suspicious volume should be warning/readiness evidence.
- That is not fully achievable inside the currently reserved files unless Team 00/03 explicitly accepts an ad hoc non-typed warning channel on the validation result, or widens scope to include at least the repository/type contract and matching tests.

### Blocker 2 - Future-date boundary input is underspecified for an isolated validation-only slice

Accepted policy:

- reject future-dated candles relative to the accepted evaluation date or latest completed market session date.

Current code shape:

- `partitionHistoricalPrices` is called from repository, Yahoo provider, exchange EOD adapter, and Angel One provider.
- The validator has no boundary/evaluation-date input today.

Impact:

- A backward-compatible optional parameter could keep this inside validation-only scope.
- The current contract/work packet does not state that constraint explicitly.
- Without that clarification, implementation pressure can spill into provider/adapter/repository call-site edits.

### Blocker 3 - "Suspicious volume" is not yet deterministic enough for a bounded Ready handoff

Observed codebase behavior:

- negative volume is invalid;
- zero volume is accepted by validation and later treated as readiness blockage through volume coverage;
- no explicit suspicious-volume threshold or stable reason string exists in the validation layer.

Impact:

- The decision resolved directionally, but the exact suspicious-volume rule for this first slice is still too loose for a bounded Ready packet.
- Team 00 should either narrow the child slice to zero-volume behavior only, or define the first-pass suspicious-volume rule/reason string explicitly before promotion.

## What Is Safe To Promote After Narrowing

If Team 00/03 split `CF-W1-MD-01` into a stricter child limited to **reject-only validation hardening plus documentation**, Team 05 recommends that child can become Ready with these exact files:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Allowed behavior for that narrowed child:

- reject future-dated candles using a backward-compatible validation boundary input with a safe default;
- reject present-but-invalid `adjustedClose` values;
- preserve duplicate handling and opt-in spike rejection;
- document that warning/fallback evidence for missing `adjustedClose` and suspicious volume remains a follow-on contract unless an explicit validation warning channel is accepted.

## Candidate Tests If A Narrowed Child Is Promoted

Required focused test file:

- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

Useful secondary regression checks only if Team 00 widens the packet deliberately:

- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`

Those secondary tests should not be pulled into the first Ready handoff unless the packet explicitly includes readiness/storage evidence behavior.

## Focused Validation Commands

For the narrowed validation-only child:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts --runInBand
```

Only if Team 00 deliberately widens the packet to cover readiness/storage evidence assertions:

```powershell
cd backend
npm.cmd test -- market-data.validation.test.ts market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts --runInBand
```

## Tests Run

None.

This was a docs-only readiness inspection. No application implementation or executable QA was authorized.

## Changes Made

- Updated `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md` only.

## Blockers For Team 00

1. Split or narrow `CF-W1-MD-01` so the first Ready slice is reject-only validation hardening.
2. Decide whether missing `adjustedClose` / zero-or-suspicious-volume evidence must:
   - stay out of the first slice, or
   - widen the slice to include a formal validation warning channel and its consuming tests.
3. Clarify the first-pass future-date boundary contract as backward-compatible optional validation input, so provider/repository/startup scope does not get pulled in.
4. Clarify whether "suspicious volume" has an actual deterministic first-pass threshold or is deferred.

## Next Gate

Return to Team 00 / Team 03 / Team 04 for packet narrowing or contract clarification before any Ready promotion.

---

## 2026-05-18 Readiness Refinement Addendum - CF-W1-MD-01

### Result

Recommendation: **Ready-recommended only for a narrowed child packet**, not for `CF-W1-MD-01` as currently written.

Recommended narrowed child scope:

- reject-only validation hardening inside Market Data validation source/tests;
- no repository, provider, startup/backfill, Prisma/schema, route, shared utility, package, generated, frontend, or live-provider changes;
- module doc update limited to validation limitations/non-goals.

### Why The Narrowed Child Is Safe

Source inspection confirms a bounded reject-only slice can stay module-local because the current validator already owns:

- historical price row rejection via `validateHistoricalPrice(...)`;
- duplicate batch-row rejection via `partitionHistoricalPrices(...)`;
- opt-in spike rejection via `partitionHistoricalPrices(..., spikeThreshold)` and `defaultSpikeRejectionThreshold()`.

Evidence:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts:10`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts:65`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts:141`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`

### Exact Ready-Recommendable File Reservations

Single-writer allowed files for the narrowed child:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

### Exact Forbidden Files For The Narrowed Child

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts`
- Data Quality Engine source/tests
- Prisma schema, migrations, generated files
- route registries
- shared backend utilities
- package manifests
- frontend source, shared UI, Playwright tests

### Required QA Scenario Split

In-scope for the narrowed child:

- future-dated candle rejection with explicit boundary input/default behavior;
- invalid `adjustedClose` rejection when present but non-finite, zero, negative, or out-of-policy;
- negative volume remains invalid;
- duplicate row behavior remains deterministic;
- spike rejection stays opt-in and off by default.

Blocked from the narrowed child unless scope widens:

- missing `adjustedClose` as fallback/incomplete evidence;
- zero-volume or suspicious-volume warning/readiness evidence.

Reason:

- `validateHistoricalPrice(...)` returns `string[]` only and has no warning/evidence channel;
- repository warnings are derived from `validation.invalid`, so valid rows with missing `adjustedClose` or zero volume produce no validator-owned evidence today;
- provider/adapter/repository call sites currently invoke `partitionHistoricalPrices(prices)` without a future-date boundary input.

Evidence:

- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts:10`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts:1484`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts:1306`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts:183`
- `backend/src/modules/market-data-foundation/market-data-foundation.exchange-eod-adapter.ts:157`
- `backend/src/modules/market-data-foundation/market-data-foundation.angel-one-provider.ts:145`
- `backend/tests/modules/market-data-foundation/market-data-readiness-evidence.invariants.test.ts:115`
- `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts:227`

### Required Upstream Updates Before Team 00 Promotion

Team 03 architecture/work-packet update required:

- narrow the first child explicitly to reject-only validation hardening;
- define future-date boundary as a backward-compatible optional validator input or explicitly defer boundary plumb-through to a later packet;
- defer missing-`adjustedClose` fallback evidence and zero/suspicious-volume warning evidence to a follow-on child unless scope is widened deliberately.

Team 04 QA update required:

- split QA matrix into reject-only scenarios versus deferred warning/evidence scenarios;
- do not require readiness/storage invariant tests for the narrowed child;
- keep focused test command on `market-data.validation.test.ts` only.

Product Owner / Architect decision still required only if any team wants the first child to include:

- missing `adjustedClose` fallback/incomplete evidence;
- zero/suspicious-volume warning evidence;
- deterministic suspicious-volume thresholds/reason strings;
- repository/provider/readiness evidence behavior.

### Next Gate

Return to Team 00 for child-packet narrowing, then Team 03 contract/work-packet refresh and Team 04 QA refresh. Ready promotion should target the narrowed validation-only child, not the broader `CF-W1-MD-01` packet.

---

## 2026-05-18 Readiness Scout - Next Lane 1 Candidate After Accepted `CF-W1-DQ-02A` And `CF-W1-MD-01`

### Recommended Next Market Data / Data Quality Item

Prepare `CF-W1-DQ-02` next as the next Lane 1 follow-up packet.

Recommendation to Team 00:

- prepare `CF-W1-DQ-02` follow-up next;
- do not promote a new Lane 1 application-code pull yet;
- keep `CF-W1-MD-02` behind `CF-W1-DQ-02` because `MD-02` still runs into durable storage / provenance / schema boundaries.

### Classification

`CF-W1-DQ-02` is **architecture/QA-prep-only**, not implementation-ready as a full parent and not the next Ready promotion.

### Exact Reason And Evidence

Why `CF-W1-DQ-02` is the best next Lane 1 candidate:

1. The active execution queue already places `CF-W1-DQ-02` ahead of `CF-W1-MD-02` for future prep after the accepted child commits.
2. Current source still shows a split between Market Data session truth and Data Quality stale gating:
   - Data Quality still uses `STALE_PRICE_DAYS = 7` plus `Date.now() - latestDate` in `data-quality-engine.service.ts`.
   - Market Data already exposes `latestCompletedTradingDateForRegion(...)` and uses expected latest trading dates in its own readiness/signoff flows.
3. That means the next bounded value remains downstream alignment of Data Quality with existing Market Data session evidence, not another Market Data storage packet first.
4. `CF-W1-MD-02` is still heavier and less promotable because Market Data persistence is still centered on `symbol + timestamp`, while the audit and docs keep calling out missing contract-grade provenance and durable readiness evidence.

Primary evidence inspected:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

Concrete source evidence:

- DQ still hard-codes calendar-age stale logic in `backend/src/modules/data-quality-engine/data-quality-engine.service.ts:20` and `:210`.
- DQ docs still admit the limitation in `backend/src/modules/data-quality-engine/data-quality-engine.md:150`.
- Market Data already exposes latest-completed-session logic in `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts:185`.
- Market Data already uses expected-latest-trading-date and signoff/downstream gating in `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:668`, `:5113`, and `:6766`.
- Market Data signoff currently enforces minimum review-ready count and `>=10%` review-ready share, but not a separate hard `95%` price-ready / `90%` metadata-ready gate:
  - coverage is computed in `backend/src/modules/market-data-foundation/market-data-foundation.service.ts:772-774`;
  - signoff gating is built in `:6664-6666` and `:6739-6766`;
  - the stronger numbers remain documentary expectations rather than a new bounded next slice.
- Market Data storage still uses symbol/date identity rather than the broader durable-evidence model in:
  - `backend/src/modules/market-data-foundation/market-data-foundation.md:19`
  - `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts:1301-1398`
  - `backend/tests/modules/market-data-foundation/market-data-storage-readiness.invariants.test.ts:129-178`

### Why Not `CF-W1-MD-02` Next

`CF-W1-MD-02` is still the right future foundation item, but not the next Team 00 prep/promotion candidate for Lane 1.

Reason:

- the execution docs still classify `MD-02` as ADR/split-packet prep only;
- the current repository persists daily OHLC rows via `symbol_timestamp` identity and does not yet carry the broader durable evidence/provenance fields the audit calls for;
- promoting it prematurely would reopen schema/storage/contract scope instead of advancing a bounded currentness follow-up.

### Safe File Reservations If Team 00 Later Promotes `CF-W1-DQ-02`

Safe first follow-up reservation set:

- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`

Safe forbidden set to preserve the bounded slice:

- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.router.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.validation.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend/frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend source/tests

### True Consent Blockers

No Product Owner consent blocker is needed for docs-only prep of `CF-W1-DQ-02`.

True blocker for any broader Lane 1 promotion:

- the broader `CF-W1-DQ-02` parent remains split/blocked because persisted `DataQualityEvaluation` rows do not durably store session-aware currentness fields, so list/summary/diagnostics-wide exposure would require an explicitly widened DQE read-side/public-contract packet;
- `CF-W1-MD-02` remains blocked behind explicit ADR/storage approval before any schema/source implementation path.

### Scout Result

- Recommended next Market Data/DQ item: `CF-W1-DQ-02`
- Status: architecture/QA-prep-only
- Promotion advice: no new Lane 1 Ready pull yet
- Blocker boundary: do not widen into DQE repository/read-side or Market Data storage/schema work without explicit Team 00 / Architect approval

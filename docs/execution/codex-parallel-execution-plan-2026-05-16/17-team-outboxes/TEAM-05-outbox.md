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

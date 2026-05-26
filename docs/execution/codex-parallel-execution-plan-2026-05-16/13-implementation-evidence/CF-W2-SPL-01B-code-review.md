# CF-W2-SPL-01B Code Review

Date: 2026-05-26
Owner: Team 10 - Code Review / Release Validation
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-01B`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-01B`
Base checkpoint: `ccf5d06`

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

## Verdict

REJECT for the current backend-only child.

The worktree stays inside the reserved file boundary and the focused backend tests/build pass locally, but two blocking review findings remain:

1. the read model can overstate **current** data-quality status when no latest DQ record exists;
2. the module reaches into another module's private type file instead of consuming a public export.

## Authority And Evidence Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-01B-work-packet.md`
- `backend/src/modules/signal-position-ledger/**`
- `backend/tests/modules/signal-position-ledger/**`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`

## Changed File Boundary Check

Reviewed delta remained inside the approved module/test/doc surface:

- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`
- execution docs only

No route-registry, frontend, schema, generated-file, package, provider, startup, or shared-file widening was found.

## Findings

### 1. Blocking - `currentDataQualityStatus` can present stale signal-snapshot DQ as current DQ

Files:

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:94-124`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:83-216`

Evidence:

- The row builder loads the latest persisted DQ snapshot through `latestDataQualityByInstrumentId(...)` at line 96.
- If that lookup returns `null`, the DTO still falls back to `triggerContract.data_quality_status` at line 121.
- The contract for this child requires **current** DQ/trust projection from current public/persisted DQ evidence, or explicit unavailable semantics when that evidence is missing.

Why this is blocking:

- When latest DQ evidence is missing, `currentReturnProjection(...)` already downgrades trust to `SOURCE_PROVEN_DQ_UNAVAILABLE`, but the row can still report `currentDataQualityStatus: 'READY'` from the older signal snapshot.
- That creates an internally inconsistent row: trust says current DQ is unavailable while the status field says current DQ is ready.
- This is exactly the kind of silent trust upgrade the contract forbids.

Test gap:

- The service tests cover usable DQ, stale price, and unsupported trigger exclusion, but they do not cover the missing-latest-DQ case or assert the returned `currentDataQualityStatus` field.

### 2. Blocking - the module bypasses the signal-generation-engine public export boundary

Files:

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:1-3`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts:1-2`
- `backend/src/modules/signal-generation-engine/index.ts:1-33`

Evidence:

- `signal-position-ledger` imports `SignalTriggerContractDto` from `../signal-generation-engine/signal-generation-engine.types`.
- The root AGENTS rule for backend modules says cross-module usage must go through public exports (`backend/src/modules/{module-name}/index.ts`).
- `backend/src/modules/signal-generation-engine/index.ts` does not export `SignalTriggerContractDto`.

Why this is blocking:

- The implementation currently depends on a private file path in another module.
- Any internal file move or type split inside `signal-generation-engine` will break this module without a public-contract change.
- That is a direct module-boundary violation in the review gate, even though the code compiles today.

### 3. Non-blocking - coverage is still thin on key contract edges

Files:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:83-216`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts:5-94`

Observed gaps:

- no test for `REDUCE_RISK -> RISK_WARNING` compatibility mapping;
- no test proving unsupported decision values stay `null`;
- no test for missing latest DQ evidence and its DTO/status behavior;
- no test asserting pagination after filtering across more than one source page;
- repository tests do not assert the actual scope filters passed into Prisma calls.

This is not the reason for rejection by itself, but it explains why Finding 1 was able to pass the current suite.

## Validation

Ran locally:

1. `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand`
2. `cd backend && npm.cmd run build`

Inspected:

3. forbidden-language `rg` guard over `backend/src/modules/signal-position-ledger` and `backend/tests/modules/signal-position-ledger` returned no implementation-term matches
4. worktree status / changed-file scope

Skipped:

- additional regression suites were not re-run in this review pass because the blocking findings were established by direct code inspection in the changed slice
- memory-utilization pre-check could not be captured because `Get-CimInstance Win32_OperatingSystem` returned access denied in this environment

## Structural Changes Reviewed

- Modules created: `backend/src/modules/signal-position-ledger`
- Files added: module source files, focused backend tests, execution docs
- Files moved: none
- Files removed: none

## Code Review Summary

- Imports updated: yes, including a blocking deep import into `signal-generation-engine` internals
- APIs preserved/changed: additive module-local router/controller/service/repository surface only; no global route mounting
- Logic added/refactored: active-row candidate collection, current-return projection, DQ/trust projection, compatibility-only health mapping
- Contracts changed: new module-local active-row DTO/read-model contract only; no shared route/schema/generated contract widening

## Risks / Follow-Up

- unresolved risk: current DQ field can mislead downstream consumers until Finding 1 is fixed
- unresolved risk: deep import leaves this module coupled to another module's private file layout until Finding 2 is fixed
- follow-up tests should be added for missing DQ, `REDUCE_RISK`, unsupported decisions, and filtered pagination behavior

## Product Owner Review Needed

- release approval needed only after the blocking review findings are fixed and QA/code review are re-run

## Next Gate

Return to Team 06 for bounded backend-module fixes, then:

1. Team 04 QA re-run on the focused backend slice
2. Team 10 code review re-check
3. Team 00 integration decision

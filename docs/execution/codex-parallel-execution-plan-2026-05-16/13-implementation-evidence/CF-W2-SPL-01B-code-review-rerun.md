# CF-W2-SPL-01B Code Review Rerun

Date: 2026-05-26
Owner: Team 10 - Code Review / Release Validation
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-01B`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-01B`
Base checkpoint: `ccf5d06`

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

## Verdict

ACCEPT for the bounded backend-only rerun scope.

## Findings

1. No blocking findings remain from the prior Team 10 rejection.
2. Prior rejection 1 is resolved: `currentDataQualityStatus` now comes only from the latest persisted/public DQ lookup, and the missing-latest-DQ path now emits `currentDataQualityStatus: null` with `trustEvidenceStatus: SOURCE_PROVEN_DQ_UNAVAILABLE`.
3. Prior rejection 2 is resolved: SPL now imports `SignalResultDto` only from the Signal Generation public module export and no longer depends on private `signal-generation-engine.types` paths or `SignalTriggerContractDto`.
4. Prior rejection 3 is resolved enough for this gate: focused service tests now cover missing latest DQ, `REDUCE_RISK -> RISK_WARNING`, unsupported decision values, and filtered multi-page pagination behavior.
5. Scope stayed bounded to SPL source/tests plus execution docs. No route registry mounting, frontend, Prisma/schema/migration, generated, package, shared utility/UI, Today Review, Trade Plan, Portfolio, Backtesting, provider/live/startup/backfill, or target/R:R/advice widening was found.

## Authority And Evidence Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-qa-rerun.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`
- `backend/src/modules/signal-position-ledger/**`
- `backend/tests/modules/signal-position-ledger/**`
- `backend/src/modules/signal-generation-engine/index.ts`

## Re-check Evidence

### Prior rejection 1: stale signal snapshot DQ emitted as current DQ

Resolved by direct code inspection and focused test coverage:

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:94-124`
  - current latest DQ is loaded from `latestDataQualityByInstrumentId(...)`
  - `currentDataQualityStatus` is now `quality?.signalReadinessStatus ?? null`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:157-162`
  - missing latest DQ downgrades trust to `SOURCE_PROVEN_DQ_UNAVAILABLE`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:184-217`
  - asserts `currentDataQualityStatus: null`
  - asserts null return with `UNAVAILABLE` status and `SOURCE_PROVEN_DQ_UNAVAILABLE`

### Prior rejection 2: private import of signal generation trigger internals

Resolved by direct code inspection and private-import guard:

- public import only:
  - `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:1-2`
  - `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts:10`
  - `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts:1`
- public export present:
  - `backend/src/modules/signal-generation-engine/index.ts:16-27`
- private-import guard:
  - `rg -n "SignalTriggerContractDto|signal-generation-engine\.types|\.\./signal-generation-engine/" backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger`
  - result: no matches

### Prior rejection 3: missing edge coverage

Resolved enough for this gate:

- missing latest DQ:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:184-217`
- `REDUCE_RISK -> RISK_WARNING`:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:219-259`
- unsupported decision ignored:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:261-301`
- multi-page filtering/pagination:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:337-401`
- query normalization/clamping:
  - `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts:4-21`

## Validation

Memory pre-check:

- `Get-Counter '\Memory\% Committed Bytes In Use'`
- Result: `71.13%`

Passed:

1. `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand`
2. `cd backend && npm.cmd run build`

Inspected:

3. forbidden-language guard:
   - `cd backend && rg -n -i "active trade|open trade|closed trade|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|account gain|portfolio profit|financial advice|must buy|must sell|guaranteed return|guaranteed" src/modules/signal-position-ledger tests/modules/signal-position-ledger`
   - result: no matches (`rg` exit code `1`)
4. private-import guard:
   - `rg -n "SignalTriggerContractDto|signal-generation-engine\.types|\.\./signal-generation-engine/" backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger`
   - result: no matches (`rg` exit code `1`)
5. route/frontend widening guard:
   - `rg -n "signal-position-ledger" backend/src/api/routes.ts`
   - `rg -n "signal-position-ledger" frontend/src`
   - result: no matches (`rg` exit code `1`)
6. scope guard:
   - `git status --short`

## Changed File Boundary Check

Observed changed/untracked scope remained within:

- `backend/src/modules/signal-position-ledger/**`
- `backend/tests/modules/signal-position-ledger/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**` for requirement execution evidence only

No out-of-bound product-code files were present in `git status --short`.

## Files Inspected

- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-qa-rerun.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`

## Residual Risks

- Repository tests still do not assert the exact Prisma `where` object passed into `signalResult.findMany`. For this rerun, that remains non-blocking because scope-aware behavior is still covered at the service/repository output level and the bounded validation passed.
- The module remains intentionally unmounted from `backend/src/api/routes.ts`; route exposure is a later shared-file gate, not part of this acceptance.

## Structural Changes Reviewed

- Modules created: `backend/src/modules/signal-position-ledger`
- Files added: SPL module source files, focused backend tests, execution evidence docs
- Files moved: none
- Files removed: none

## Code Review Summary

- Imports updated: yes; cross-module type usage now goes through the Signal Generation public export only
- APIs preserved/changed: additive module-local backend surface only; no global route mounting
- Logic added/refactored: active row collection, trusted return projection, current DQ trust gating, compatibility-only health mapping
- Contracts changed: module-local active-row read-model contract only; no Prisma/schema/generated/shared contract widening found in this rerun

## Product Owner Review Needed

- release approval needed after Team 03 Architect Signoff and normal downstream acceptance

## Next Gate

Team 03 Architect Signoff.

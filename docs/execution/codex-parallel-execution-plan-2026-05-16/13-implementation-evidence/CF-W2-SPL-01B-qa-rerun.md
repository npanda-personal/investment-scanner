# CF-W2-SPL-01B QA Rerun

Date: 2026-05-26
Owner: Team 04 - QA Factory
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-01B`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-01B`

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

## QA Rerun Verdict

ACCEPT for the bounded backend-only rerun scope.

The two blocking Team 10 review findings were resolved in the bounded SPL slice, the new edge coverage is present, the requested backend validations passed, and the changed-file scope remains restricted to the SPL module/tests plus active execution reporting docs.

## Authority And Evidence Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`
- `backend/src/modules/signal-position-ledger/**`
- `backend/tests/modules/signal-position-ledger/**`

## Findings

1. Review finding 1 resolved: no stale trigger-snapshot DQ is emitted as current DQ when latest DQ is missing.
   - `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:121` now sets `currentDataQualityStatus` from latest persisted/public DQ only.
   - `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:157` downgrades missing latest DQ to `SOURCE_PROVEN_DQ_UNAVAILABLE`.
   - `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:184` covers the missing-latest-DQ path and asserts `currentDataQualityStatus: null`.

2. Review finding 2 resolved: SPL no longer imports private Signal Generation trigger types/files.
   - SPL source imports `SignalResultDto` only from the Signal Generation public module export:
     - `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts:2`
     - `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts:10`
     - `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts:1`
   - `backend/src/modules/signal-generation-engine/index.ts` publicly exports `SignalResultDto`.
   - Bounded `rg` inspection found no `SignalTriggerContractDto`, no `signal-generation-engine.types`, and no private deep-import path under SPL source/tests.

3. Rejected-edge coverage is present in the focused test slice.
   - Missing latest DQ: `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:184`
   - `REDUCE_RISK -> RISK_WARNING`: `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:219`
   - Unsupported decision values ignored: `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:261`
   - Filtered multi-page source pagination: `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts:337`
   - Repository pagination/read tests still pass:
     - `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts:5`
     - `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts:50`

4. Scope guard passed.
   - `git status --short` shows the bounded SPL module/tests plus active execution docs only.
   - No route registry mounting, frontend, Prisma/schema/migrations, generated files, package files, shared utility/UI, Today Review, Trade Plan, Portfolio, Backtesting, or provider/live/startup/backfill widening was found in this worktree status check.

## Commands Run

Passed:

1. `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand`
2. `cd backend && npm.cmd run build`

Inspected:

3. forbidden-language scan over SPL source/tests:
   - `cd backend && rg -n -i "active trade|open trade|closed trade|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|account gain|portfolio profit|financial advice|must buy|must sell|guaranteed return|guaranteed" src\modules\signal-position-ledger tests\modules\signal-position-ledger`
   - Result: no matches (`rg` exit code `1`)
4. private-import guard over SPL source/tests:
   - `rg -n "signal-generation-engine\.types|SignalTriggerContractDto|\.\./signal-generation-engine/" backend\src\modules\signal-position-ledger backend\tests\modules\signal-position-ledger`
   - Result: no private trigger-type import matches; only public module import usage remained
5. scope guard:
   - `git status --short`

## Files Inspected

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`

## Remaining Risks

- Pre-run memory utilization could not be captured in this environment because local OS memory queries were blocked/unsupported.
- The bounded repository tests verify pagination/read behavior, but they still do not assert the exact Prisma scope filters passed into `signalResult.findMany`. That is non-blocking for this rerun because the requested acceptance criteria and focused validations passed.

## Next Gate

Team 10 code review re-check.

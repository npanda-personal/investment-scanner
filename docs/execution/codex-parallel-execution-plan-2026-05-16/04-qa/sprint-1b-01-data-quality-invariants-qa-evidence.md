# Sprint 1B-01 Data Quality Invariants QA Evidence

Date: 2026-05-17

Status: QA review evidence for Sprint 1B-01 only.

## QA Scope

Approved scope:
- Review only `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`.
- Use the active Sprint 1B go/no-go decision, readiness contract, QA validation plan, and work packet as source of truth.
- Run only `cd backend` then `npm test -- data-quality-engine.invariants.test.ts`.
- Create or update only this QA evidence file.

Out of scope:
- Application source changes.
- Existing test changes.
- Prisma, route registry, shared utility, shared UI, package, frontend, startup, provider, or old-plan changes.
- Angel One, live provider, provider-heavy, broker, paid API, startup scheduler, backfill, UI, or external service validation.

## Files Inspected

- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/sprint-1b-final-go-no-go-decision.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/market-data-dq-validation-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/s1b-market-data-dq-implementation-decision-work-packet.md`

## Files Changed By QA

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/sprint-1b-01-data-quality-invariants-qa-evidence.md`

QA did not modify the implementation test file.

## Dirty Scope Verification

Pre-QA `git status --short` showed only:

```text
?? backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts
```

After the QA test run and before this evidence file was written, `git status --short` still showed only:

```text
?? backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts
```

This confirms the Sprint 1B-01 implementation work created only the approved test file before QA evidence recording.

## Test Command Run

Command run from `backend`:

```text
npm.cmd test -- data-quality-engine.invariants.test.ts
```

This is the Windows equivalent of the approved command:

```text
cd backend
npm test -- data-quality-engine.invariants.test.ts
```

## Test Result

Result: pass.

```text
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Snapshots:   0 total
Time:        2.244 s, estimated 7 s
Ran all test suites matching data-quality-engine.invariants.test.ts.
```

The QA rerun did not require escalation. During the implementation step, the first attempt hit Jest worker `spawn EPERM` in the sandbox and was rerun with the same approved bounded command. That earlier failure is classified as an environment/sandbox worker-spawn issue, not a test failure.

## Invariant Coverage Table

| Approved invariant | QA finding | Coverage |
| --- | --- | --- |
| `READY` / trustworthy eligibility | Uses `DataQualityEngineService.evaluateInstrument` with IN/STOCK-like identity, complete trusted-baseline fields, current prices, fundamentals, corporate actions, and signal history. Asserts `GOOD`, `READY`, `LIQUID`, signal/backtest/calibration eligibility, and ready use-case tiers. | Covered |
| `LIMITED` warning or blocking behavior | Uses `filterEligibleInstruments` with a persisted-style `LIMITED` evaluation. Asserts it remains visible in `evaluationsByInstrumentId` but excluded from default downstream eligibility. | Covered |
| `NOT_READY` / blocked / unusable / not trustworthy blocking | Uses `filterEligibleInstruments` to exclude `NOT_READY`, `UNUSABLE`, stale, illiquid, and missing evaluations. `NOT_TRUSTWORTHY` is not a current Data Quality Engine status and is only negatively checked through parser vocabulary. | Partially covered |
| Stale data handling | Uses `evaluateInstrument` with stale latest price. Asserts stale gaps/blockers and blocked daily review, signal, backtest, and automation tiers. | Covered |
| Missing evaluation handling | Uses `filterEligibleInstruments` with `missingQualityBehavior: 'SKIP'`. Asserts missing item is excluded, counted, and warned. | Covered |
| Unsupported instrument handling | Uses module-local trusted-baseline status evidence with `UNSUPPORTED_OR_INACTIVE_EXCLUDED`. Asserts visible but not downstream-ready behavior. | Covered at Data Quality tier level |
| Manual-required visibility with downstream blocking | Uses module-local trusted-baseline status evidence with `CATALOG_IDENTITY_REPAIR_REQUIRED`. Asserts visible but not downstream-ready behavior. | Covered at Data Quality tier level |
| Retry-cooldown visibility without false fallback classification | Uses module-local trusted-baseline status evidence with `RETRY_BLOCKED_PROVIDER_VALIDATION`. Asserts non-ready behavior and no false fallback-required warning. | Covered at Data Quality tier level |
| Approved readiness status vocabulary | Uses public `parseDataQualityQuery` to verify current coverage, readiness, and liquidity status values; rejects unrelated values. | Covered |
| No Angel One / no live provider / no startup / no UI dependency | Test imports only Data Quality Engine public exports and types. One test injects forbidden provider/startup mocks and asserts they are not called by `filterEligibleInstruments`. | Covered |

## Invariants Not Fully Provable Without Source Changes

- Actual downstream enforcement inside `signal-generation-engine`, `strategy-decision-engine`, `backtesting-strategy-lab`, `trade-plan-risk-engine`, `portfolio-intelligence`, `watchlist-management`, `alerts-monitoring`, and `ai-investment-copilot` is not proven by this test file. The file proves Data Quality gate behavior only.
- `NOT_TRUSTWORTHY` is a universe trust status in the active contract, not a current Data Quality Engine query/status type. This test verifies it is not accepted as a Data Quality coverage status, but full universe-level blocking requires Market Data / universe readiness implementation or tests.
- Manual-required, unsupported, and retry-cooldown cases are tested through current trusted-baseline status evidence handled by `evaluateInstrument`. More specific provider/catalog evidence fields would require future source or repository-level tests.
- Duplicate candle, invalid OHLC, and zero/suspicious-volume handling are outside this approved Sprint 1B-01 Data Quality invariant test scope unless future source surfaces expose direct module-local public behavior.

## External Scope Confirmations

- Angel One remains excluded: yes.
- Live providers remain excluded: yes.
- Provider-heavy tests remain excluded: yes.
- Broker credentials remain excluded: yes.
- Paid APIs remain excluded: yes.
- Startup scheduler/backfill remains excluded: yes.
- UI remains excluded: yes.
- Frontend files remain untouched: yes.
- Application source remains untouched: yes.
- Prisma schema and migrations remain untouched: yes.
- Route registries remain untouched: yes.
- Shared utilities and shared UI remain untouched: yes.
- Package manifests remain untouched: yes.
- `docs/codex-agent-team-plan/**` remains untouched: yes.

## Self-Fulfilling Test Review

The tests are not limited to locally invented helpers. They exercise existing public Data Quality Engine behavior:
- `DataQualityEngineService.evaluateInstrument`
- `DataQualityEngineService.filterEligibleInstruments`
- `parseDataQualityQuery`

Local helpers create input instruments, prices, and DTO-like evaluations, but assertions are against the service/parser behavior. The helper data does not bypass the public methods under test.

## Risks

- The tests intentionally do not prove downstream module enforcement. Treating this QA pass as unblocking downstream modules would violate the active contract.
- Some contract terms, especially `NOT_TRUSTWORTHY`, duplicate candles, invalid OHLC, and provider cooldown metadata, are broader than the current Data Quality Engine test surface.
- The test file creates `new DataQualityEngineService()` in direct `evaluateInstrument` tests. This does not call providers because the direct method uses provided input only, but future edits should preserve that boundary.
- The focused test command loads `.env` through existing Jest setup/dotenv behavior, but no provider, service, or external call is executed.

## QA Recommendation

Recommendation: accept.

Sprint 1B-01 is ready for code review.

Acceptance rationale:
- Only the approved test file was created before QA evidence recording.
- The approved focused test command passed.
- The test file uses existing Data Quality Engine public behavior.
- The test file does not call Angel One, live providers, broker APIs, paid APIs, startup schedulers, UI code, or external services.
- Downstream enforcement limits are explicitly documented and not overclaimed.

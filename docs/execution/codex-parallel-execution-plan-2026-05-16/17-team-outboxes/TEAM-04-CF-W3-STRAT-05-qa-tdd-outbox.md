# Team 04 CF-W3-STRAT-05 QA TDD Outbox

Date: 2026-05-29

## Work Item

`CF-W3-STRAT-05` Strategy Framework review findings, QA-owned test-first gate.

## State / Mode

Completed - tests and QA docs only. Production source was not modified.

## Verdict

QA TDD RED-BAR READY

The review findings now have focused failing regression tests where practical, plus QA follow-up requirements for UI/static/domain-design findings that need implementation or contract clarification before executable tests can be meaningful.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 2
- Modules: `strategy-framework`, `backtesting-strategy-lab`, `signal-generation-engine`

## Files Changed

- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W3-STRAT-05-review-findings-tdd-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W3-STRAT-05-qa-tdd-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/98-orchestrator/test-first-qa-gate-policy.md`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- changed test files listed above

## Tests Run

From `backend`:

```powershell
npm.cmd test -- --runTestsByPath tests/modules/strategy-framework/strategy-framework.repository.test.ts tests/modules/strategy-framework/strategy-framework.evaluator.test.ts tests/modules/strategy-framework/strategy-framework.service.test.ts tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts --runInBand
```

Result: failed as intended for TDD.

- 5 suites failed, 5 total.
- 8 tests failed, 75 passed, 83 total.

## Failure Evidence

- Repository: `invalidationRules` missing from `upsertDefinitions()` create/update payloads.
- Repository: persisted `invalidationRules` map back to `[]`.
- Evaluator: `TREND_MOMENTUM` with `marketGate: UNKNOWN` still returns `ENTRY_CANDIDATE`.
- Evaluator: `TREND_MOMENTUM` with `liquidityStatus: UNKNOWN` still returns `ENTRY_CANDIDATE`.
- Strategy Framework service: rankings return stale `strategyVersion: 1.0.0` for active `TREND_MOMENTUM` version `1.1.0`.
- Backtesting: registered `TREND_MOMENTUM` does not enter despite complete price/DQ fixture because sector/smart-money context is absent.
- Backtesting: operational `STOP_LOSS` trade receives registered exit evidence `PRICE_BELOW_SMA50`.
- Signal Generation: `BREAKOUT_CONFIRMATION` is promoted despite unavailable market gate context.

## Tests Skipped

- Backend build skipped because this is a red-bar TDD packet and source fixes are intentionally absent.
- Frontend UI smoke skipped because no frontend files were changed and frontend invalidation-rule stale typing is recorded as a QA follow-up requirement.
- Live DB/provider checks skipped because the packet is unit/service regression coverage only.

## Risks / Assumptions

- The new tests intentionally contradict some current permissive behavior; implementation must update behavior or explicitly revise the product/architecture contract before weakening assertions.
- Some domain weaknesses still need Product Owner/Architect specificity before QA can write non-brittle executable tests.
- Memory percentage could not be read because `Get-CimInstance Win32_OperatingSystem` was access denied; `Get-Counter '\Memory\Available MBytes'` reported about 3165 MB free before the Jest run.

## Next Gate

Team 00 / implementation owner should fix production source under a reserved implementation packet, then rerun the focused command and preserve the QA-authored assertions.

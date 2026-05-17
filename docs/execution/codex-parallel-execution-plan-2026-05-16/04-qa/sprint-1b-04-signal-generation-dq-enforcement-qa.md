# Sprint 1B-04 Signal Generation DQ Enforcement QA Evidence

Date: 2026-05-17

Status: QA accepted.

## 1. QA Scope

Reviewed only the approved Wave 3 implementation file:
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Used active execution docs as source of truth:
- `06-contracts/market-data-dq-readiness-contract.md`
- `04-qa/market-data-dq-validation-plan.md`
- `08-work-packets/s1b-market-data-dq-implementation-decision-work-packet.md`
- `09-summaries/sprint-1b-final-go-no-go-decision.md`

## 2. Files Inspected

- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- Active execution docs listed above

## 3. Files Changed By QA

QA created this evidence file only:
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/sprint-1b-04-signal-generation-dq-enforcement-qa.md`

QA did not modify application source, existing tests, frontend files, Prisma, route registries, shared utilities, shared UI, package manifests, provider files, startup files, root `AGENTS.md`, deleted `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**`.

## 4. Test Command Run

Developer focused command:

```text
cd backend
npm test -- signal-generation-dq-enforcement.invariants.test.ts
```

Initial sandbox result:
- Failed with Jest worker `spawn EPERM`.
- Classified as sandbox/process-spawn failure, not a test assertion failure.

Developer rerun outside sandbox:

```text
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
```

QA rerun outside sandbox with the same focused command:

```text
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
```

No broader tests were run.

## 5. Invariant Coverage Table

| Invariant | QA result |
| --- | --- |
| `READY` / trustworthy state allows signal generation | Covered by strict filtered run generating only `ready`. |
| `LIMITED` state warning-gated or blocked | Covered as excluded by strict filter and warning evidence. |
| `NOT_READY` / blocked / unusable state blocks trusted generation | Covered as excluded by strict filter and not passed to generation. |
| Missing DQ evaluation safe blocked/not-ready behavior | Covered as excluded by strict filter and counted in missing evaluation count. |
| Unsupported/manual-required instruments do not silently generate trusted signals | Covered as excluded by strict filter and not passed to generation. |
| Stale or incomplete evidence does not produce trusted signals | Covered as excluded by strict filter and warning evidence. |
| Signal output preserves DQ eligibility evidence | Covered for generated ready signal. |
| No arbitrary target prices | Covered by serialized signal check for target-price fields and advice-like target language. |
| No Angel One / live provider / broker / paid API / startup / UI dependency | Covered by mocked service harness and forbidden-scope inspection. |
| No downstream enforcement overclaim | Covered with explicit limitations. |

## 6. Not Fully Provable Without Source Changes

Not proven by this test-only slice:
- Data Quality filtering is required by default.
- Missing Data Quality fails closed by default.
- Data Quality filter errors fail closed.
- Stored/latest signal read paths block old or untrusted signals.
- Signal quality, calibration, strategy decision, backtesting, trade-plan, portfolio, watchlist, alerts, or copilot modules enforce DQ gates.

## 7. Exclusion Confirmations

- Angel One remains excluded: yes.
- Live providers remain excluded: yes.
- Provider-heavy tests remain excluded: yes.
- Broker credentials remain excluded: yes.
- Startup/backfill remains excluded: yes.
- UI remains excluded: yes.
- Application source changed: no.

## 8. Risks

- Strict signal generation can enforce DQ only when the caller enables `useDataQualityFilter`.
- Default and failure behavior remain softer than the active readiness contract.
- This test does not prove full downstream enforcement.

## 9. QA Recommendation

QA decision: accept.

Sprint 1B-04 is ready for code review.


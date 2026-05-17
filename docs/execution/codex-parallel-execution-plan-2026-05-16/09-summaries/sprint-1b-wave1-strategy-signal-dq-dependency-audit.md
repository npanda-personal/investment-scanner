# Sprint 1B Wave 1 Strategy / Signal / Risk DQ Dependency Audit

Date: 2026-05-17

Status: Workstream C read-only audit evidence.

## 1. Scope Inspected

Read-only scope:
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-quality-lab/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

No files were modified, staged, reverted, created, or deleted during the read-only audit. No tests, local servers, live providers, startup checks, UI checks, staging, or commits were run.

## 2. Data Quality Consumption Observed

| Module | Data Quality consumption observed |
| --- | --- |
| `signal-generation-engine` | Uses `DataQualityEngineService.filterEligibleInstruments()` only when `useDataQualityFilter=true`; stores per-signal `dataQualityEligibility`. |
| `signal-quality-lab` | Uses Data Quality evaluations for optional filters and data-quality grouping. Missing evaluations are not excluded unless strict filters are requested. |
| `signal-calibration-engine` | Loads latest Data Quality evaluations and applies penalties for poor, unusable, not-ready, or illiquid states, but does not hard-block calibration. |
| `strategy-decision-engine` | Loads persisted Data Quality into decision context and passes Data Quality fields to Strategy Framework context; legacy entry evaluators block when `eligibleForSignals` is false. |
| `backtesting-strategy-lab` | Has optional Data Quality universe filtering and records Data Quality exclusion metadata. |
| `trade-plan-risk-engine` | Calls Data Quality diagnostics, blocks `UNUSABLE` coverage and `ILLIQUID`, persists `dataQualitySnapshot`, and includes Data Quality in paper-readiness proof. |

## 3. Bypass Or Soft-Gate Risks

Observed risks:
- `signal-generation-engine`: backend parser defaults `useDataQualityFilter` to false, and missing Data Quality defaults to warning/process behavior.
- `signal-generation-engine`: strategy context can synthesize Data Quality from `data_status` instead of requiring Data Quality Engine output.
- `signal-quality-lab`: default dashboards/outcomes can measure signals without Data Quality readiness filters.
- `signal-calibration-engine`: Data Quality issues become penalties/data gaps, not a calibration stop.
- `strategy-decision-engine`: framework-backed Data Quality enforcement is unclear in this audit scope; defensive exit fallback does not clearly enforce Data Quality.
- `backtesting-strategy-lab`: Data Quality filter is disabled by default, allows missing Data Quality unless configured, and uses signal-readiness filtering rather than a Data Quality Engine `backtest` use-case tier.
- `trade-plan-risk-engine`: `NOT_READY` signal readiness warns or flags watch state, but is not clearly a paper-readiness blocker.

## 4. Missing Or Unclear Enforcement

The active readiness contract says only `READY` use-case tiers may feed downstream automated logic.

Missing or unclear enforcement:
- Fail-closed default for missing Data Quality evaluations is not proven across downstream modules.
- `LIMITED` and `NOT_READY` handling is optional or context-specific.
- Signal generation can run without enabling Data Quality filtering.
- Backtesting can run with Data Quality filtering disabled.
- Calibration can continue with Data Quality penalties rather than blocking.
- Trade-plan risk proof does not clearly block every non-ready signal-readiness state.
- Downstream signal and strategy outputs do not have accepted evidence proving they preserve Data Quality blocker/reason details.

## 5. Blocked Modules

The following modules remain blocked from treating Market Data / DQ as trusted input:
- `signal-generation-engine`
- `signal-quality-lab`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `backtesting-strategy-lab`
- `trade-plan-risk-engine`

They require separate source-level enforcement or characterization tests, QA, review, Architect signoff, and Product Owner acceptance before any trusted downstream use is claimed.

## 6. Exclusion Confirmation

This audit did not use or approve:
- Angel One.
- Live providers.
- Broker credentials.
- Provider-heavy tests.
- Startup scheduler behavior.
- Startup backfill behavior.
- UI changes.
- Prisma schema changes.
- Route registry changes.
- Shared files.

## 7. Recommended Next Contract / Test Slice

Recommended first Lane 2 test slice:
- Backend-only downstream Data Quality enforcement tests for `signal-generation-engine`.

Test goals:
- Default trusted/full-scope signal generation cannot process non-`READY` instruments.
- Missing Data Quality uses fail-closed behavior for downstream trusted runs.
- `LIMITED`, `NOT_READY`, `UNUSABLE`, stale, and `ILLIQUID` states are excluded.
- Generated signal DTO or run audit preserves Data Quality status and reason evidence.

Recommended sequence after that:
1. `signal-generation-engine`
2. `backtesting-strategy-lab`
3. `strategy-decision-engine`
4. `trade-plan-risk-engine`
5. `signal-quality-lab`
6. `signal-calibration-engine`

Each slice should begin as test-only or contract-only unless a failing test proves the need for Product Owner and Architect-approved source changes.

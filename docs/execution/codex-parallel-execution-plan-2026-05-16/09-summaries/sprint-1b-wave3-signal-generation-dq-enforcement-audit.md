# Sprint 1B Wave 3 Signal Generation DQ Enforcement Audit

Date: 2026-05-17

Status: Workstream B read-only audit evidence.

## 1. Scope Inspected

Read-only scope:
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/**`

No application source, existing tests, Prisma schema, route registries, shared utilities, shared UI, package manifests, provider files, startup files, frontend files, root `AGENTS.md`, deleted `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**` files were modified.

## 2. Public / Module-Local Behavior Observed

`SignalGenerationEngineService.run()` is the meaningful public/module-local boundary for this characterization.

Observed behavior:
- It resolves the run universe through Market Data Foundation.
- It calls `DataQualityEngineService.filterEligibleInstruments()` only when `useDataQualityFilter` is true.
- It forwards Data Quality filter options such as `minSignalReadinessScore`, `includeLimited`, `skipUnusable`, and `missingQualityBehavior`.
- It reduces the generation universe to `eligibleInstrumentIds` when the Data Quality filter returns a result.
- It stores run-level Data Quality counts in the response and run audit.
- It creates `dataQualityEligibility` snapshots for generated signals when the filter is applied.

## 3. Data Quality Consumption Assessment

Signal generation consumes Data Quality directly only for filtered runs.

Strict filtered runs can prevent non-ready instruments from reaching `generateForInstrument()` when `filterEligibleInstruments()` excludes them. This is the behavior covered by the Wave 3 test.

Bypass and soft-gate risks remain:
- `useDataQualityFilter` is optional.
- The request parser defaults `useDataQualityFilter` to false.
- Missing Data Quality defaults to `WARN_AND_PROCESS` unless the caller sets `missingQualityBehavior: 'SKIP'`.
- If the Data Quality filter throws, the service records a warning and continues instead of failing closed.

## 4. Blocked / Untrusted Instrument Risk

Blocked or untrusted instruments can still produce outputs when a caller does not enable strict Data Quality filtering.

The Wave 3 characterization test does not approve that default. It proves only that a strict filtered run excludes `LIMITED`, `NOT_READY`, `UNUSABLE`, manual-required, stale, and missing-evaluation instruments when the Data Quality Engine returns them as excluded.

## 5. Output Evidence Assessment

When strict filtering is enabled and a signal is generated, the signal output preserves:
- `dataQualityEligibility.filterApplied`
- `dataQualityEligibility.eligible`
- `coverageStatus`
- `signalReadinessStatus`
- `liquidityStatus`
- run-level excluded and missing-evaluation counts

The tested signal output did not require arbitrary target prices and did not include advice-like phrases such as buy-now, sell-now, guaranteed, price target, or profit target.

## 6. Wave 3 Test Coverage

The new test file covers:
- `READY` / trustworthy Data Quality state allows generation.
- `LIMITED` is excluded by a strict run.
- `NOT_READY` is excluded by a strict run.
- `UNUSABLE` is excluded by a strict run.
- Missing Data Quality evaluation is counted and excluded by a strict run.
- Manual-required and unsupported-style evidence is excluded by a strict run.
- Stale evidence is excluded by a strict run.
- Generated signal output preserves Data Quality eligibility evidence.
- The test uses mocked/local services only.
- The test does not require Angel One, live providers, broker credentials, paid APIs, startup behavior, or UI.

## 7. Untestable Without Source Changes

The following cannot be proven as accepted behavior without future source changes or broader approved tests:
- Data Quality filtering is required by default for trusted signal generation.
- Missing Data Quality fails closed by default.
- Data Quality filter failure fails closed instead of warning and continuing.
- Existing latest/top signal read APIs block or label non-ready historical signals.
- Downstream signal quality, calibration, strategy decision, backtesting, trade-plan, portfolio, watchlist, alert, and copilot modules enforce the signal Data Quality state.

## 8. Recommendation

Wave 3 is acceptable as a characterization slice because it proves the strict filtered signal-generation path can honor Data Quality readiness without source changes.

The next implementation wave should not move to alerts, portfolio, watchlist, copilot, strategy decisions, backtesting, or trade plans yet. The next safest wave is an explicitly approved source-changing or contract-first signal-generation gate hardening slice that decides whether trusted signal generation must default to fail-closed Data Quality behavior.


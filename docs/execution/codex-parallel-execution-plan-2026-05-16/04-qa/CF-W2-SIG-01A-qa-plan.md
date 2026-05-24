# CF-W2-SIG-01A QA Plan

Date: 2026-05-24

## Work Item

`CF-W2-SIG-01A` - Signal Generation run-path Data Quality fail-closed behavior.

## QA Readiness State

QA plan prepared.

Team 00 can evaluate this slice for Ready after confirming exact file reservations, no shared-file conflict, and no newer Signal Generation writer. This QA plan does not itself authorize implementation.

## Scope

Backend-only Signal Generation validation and service run-path verification.

Allowed implementation/test scope remains limited to:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

No frontend, route, schema, repository, controller, router, module, generated, shared utility, shared UI, package, provider/live, startup, backfill, Market Data, or Data Quality Engine source/test files are in scope.

## Source And Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SIG-01A-signal-generation-run-path-dq-fail-closed-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SIG-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SIG-01A-signal-generation-run-path-dq-fail-closed-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SIG-01A-work-packet.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Current evidence shows `parseRunRequest()` already normalizes omitted `useDataQualityFilter` to `true`, the service defensively treats anything except explicit `false` as filtered mode, and existing focused tests already cover several DQ filtering and fail-closed behaviors. Implementation QA must verify these remain true after any Team 06 changes.

## Acceptance Coverage

Team 04 must accept only if all checks below pass:

- Omitted `useDataQualityFilter` defaults to `true` in validation.
- Direct service calls with omitted `useDataQualityFilter` still run with DQ filtering enabled.
- Explicit `useDataQualityFilter: false` is preserved and produces output marked outside trusted DQ enforcement, such as `dataQuality.filterApplied: false` or per-signal DQ eligibility showing `filterApplied: false`.
- Default missing DQ behavior is `SKIP` when the request omits `missingQualityBehavior`.
- Strict DQ-filtered runs pass only DQ-ready/eligible instruments to `generateForInstrument()`.
- Missing DQ, blocked DQ, stale hard-blocked DQ, unsupported DQ, `NOT_READY`, and `UNUSABLE` cases are excluded from generation when represented by the DQE filter result.
- If `DataQualityEngineService.filterEligibleInstruments()` throws, the run fails closed with zero generated signals, zero attempted generation, DQ exclusion counts for the resolved universe, and no generation failure overcount.
- DQ-excluded and missing-evaluation instruments count as skipped/excluded by DQ, not as generation failures.
- Generated eligible signal output preserves available DQ eligibility evidence: `filterApplied`, `eligible`, readiness/coverage/liquidity where available, and exclusion reason semantics for non-eligible snapshots passed through options.
- No target price, profit target, R:R, synthetic target, direct buy/sell advice, guaranteed outcome, or Trade Plan-first wording is introduced.
- Full `CF-W1-SIG-01`, persisted trust classification, read-path filtering, Today Review, Signal Quality, Strategy Decision, Backtesting, Portfolio, Watchlist, Alerts, Copilot, and Research Hub enforcement are not overclaimed.

## Required Test Commands

Run from the Team 06 implementation worktree after developer handoff:

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

Run a changed-file language guard from the repository root or implementation worktree:

```text
rg -n "targetPrice|profitTarget|priceTarget|rewardRiskRatio|R:R|buy now|sell now|guaranteed|financial advice" backend/src/modules/signal-generation-engine backend/tests/modules/signal-generation-engine
```

Expected language-scan handling:

- Any new visible trusted-run wording with those terms is a QA rejection.
- Existing test assertions that prohibit target/R:R/advice wording may remain.
- Existing repository or documentation references outside the allowed implementation scope do not justify widening this slice.

## Minimum Test Assertions

Validation tests must prove:

- `{}` or an omitted field parses to `useDataQualityFilter: true`.
- `{ useDataQualityFilter: false }` parses to `false`.
- Unsupported `missingQualityBehavior` does not bypass the service default of `SKIP`.

Service tests must prove:

- omitted DQ filter calls `filterEligibleInstruments()` with `missingQualityBehavior: 'SKIP'`;
- only `eligibleInstrumentIds` are sent into generation;
- missing/blocked/stale/unsupported/`NOT_READY`/`UNUSABLE` DQ cases represented as excluded by the DQE result are not generated;
- `filterEligibleInstruments()` rejection results in zero attempted generation and appropriate DQ counts;
- explicit `useDataQualityFilter: false` does not call DQE filtering and is not marked as trusted DQ enforcement;
- generated eligible signals preserve available DQ eligibility evidence.

## QA Rejection Conditions

Reject the developer handoff if:

- any required focused test or backend build fails;
- implementation touches files outside Team 00's Ready reservation;
- the fix requires Data Quality Engine, Market Data, Prisma, route, shared utility, package, generated, frontend, provider/live, startup/backfill, paid/cloud, broker, or credential scope;
- the run path proceeds as trusted after missing DQ evidence or DQ filter failure;
- blocked/stale/unsupported/`NOT_READY`/`UNUSABLE` DQ evidence can still reach generation under default filtered mode;
- explicit `useDataQualityFilter: false` is described or surfaced as trusted;
- generated output introduces target/R:R/advice/guarantee wording;
- the implementation expands into read-path filtering or downstream modules.

## Stop Conditions For Team 04

Stop and return to Team 00 if:

- Team 06 asks to widen source scope beyond the reserved Signal Generation files;
- the tests cannot express the required states without a new DQE public contract;
- response type changes are needed;
- another active team owns any allowed Signal Generation file;
- executable validation is blocked by laptop safety/resource limits.

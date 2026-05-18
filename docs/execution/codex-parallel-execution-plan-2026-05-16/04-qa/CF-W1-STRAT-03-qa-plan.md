# CF-W1-STRAT-03 QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: Strategy Decision review provenance QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded backend-only `strategy-decision-engine` child. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend files.

## Scope

Validation plan for additive Strategy Decision provenance and top-level `reasonSummary` exposure in `CF-W1-STRAT-03`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.md`
- `backend/tests/modules/strategy-decision-engine/strategy-decision-engine.service.test.ts`

Out of scope for this first child:

- Prisma, migrations, generated files, persistence key changes, or durable stored provenance
- `strategy-decision-engine` repository, controller, router, validation, module, public export, or repository-test changes
- backend or frontend route registry changes, query-parameter changes, or route-path changes
- frontend `strategy-decision-engine` files, shared UI, or downstream consumer adoption in Research Hub, Today Review, Trade Plan, watchlist UI, or portfolio UI
- Strategy Framework, Signal Generation, Signal Calibration, Data Quality Engine, Smart Money, Market Context, Research Hub, or Trade Plan source/test changes
- decision math, thresholds, scoring, evaluator behavior, candidate-date behavior, or batch behavior rewrites
- shared utilities, shared DTOs, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-STRAT-03-architecture-review.md`
- `06-contracts/CF-W1-STRAT-03-strategy-decision-review-provenance-contract.md`
- `08-work-packets/CF-W1-STRAT-03-work-packet.md`
- `10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`

Current Strategy Decision source surfaces already expose the bounded behavior this child needs:

- `strategy-decision-engine.service.ts` keeps proof-safe candidate filtering in the repository path, delegates `watchlist()` and `portfolio()` to `latestForInstrument()`, and still evaluates and persists on a lookup miss in `latestForInstrument()`.
- `strategy-decision-engine.service.ts` returns persisted rows directly from `candidates()` and `history()`, so later list/history reads can only label persisted-state provenance honestly.
- `strategy-decision-engine.types.ts` already exposes `reasons`, `blockers`, `warnings`, `dataGaps`, `riskPlan`, `strategyVersion`, `frameworkBacked`, `frameworkDecision`, `frameworkAction`, and readiness metadata, but does not yet expose top-level provenance or top-level `reasonSummary`.
- `strategy-decision-engine.md` already documents proof-safe default legacy exclusion and research-support language, so this slice should remain additive and backend-local.
- `strategy-decision-engine.service.test.ts` already covers `latestForInstrument()` and framework-backed behavior, so focused service-test expansion is a realistic QA surface without widening into repository or route tests.

## Required QA Assertions

- Provenance metadata is additive. Existing DTO fields remain present and unrenamed while the service adds a stable equivalent of:
  - `provenance.status`
  - `provenance.persistenceMode`
  - `provenance.legacyIncludedByRequest`
  - top-level `reasonSummary`
- Persisted framework-backed rows map to `FRAMEWORK_BACKED` with persisted-row provenance semantics.
- Persisted non-framework-backed rows map to `LEGACY_FALLBACK` only when they are actually returned, and `legacyIncludedByRequest=true` is set only when both conditions are true:
  - the caller explicitly requested `includeLegacy=true`
  - the returned row is non-framework-backed
- Default proof-safe reads still exclude legacy non-framework-backed rows unless `includeLegacy=true`. This first child must not weaken current default candidate or funnel behavior.
- `READ_PATH_CREATED` is request-local only. It appears on the response that creates a row through `latestForInstrument()` and on any `watchlist()` or `portfolio()` item returned from that same miss path.
- Later history/list reads must not fabricate durable `READ_PATH_CREATED` provenance once the row is simply being read back from persistence.
- `reasonSummary` follows the architecture precedence rule exactly:
  1. first blocker
  2. else first warning
  3. else first data gap
  4. else first reason
  5. else existing `riskPlan.reasonSummary`
  6. else neutral research-support fallback
- `reasonSummary` must remain concise and research-support oriented. No `buy now`, `sell now`, `must buy`, `must sell`, `price target`, `profit target`, `guaranteed`, broker, or automation wording is introduced.
- Current `reasons`, `blockers`, `warnings`, `dataGaps`, `riskPlan`, `frameworkBacked`, `frameworkDecision`, `frameworkAction`, rule arrays, readiness labels, and other current Strategy Decision fields remain backward-compatible.
- Current decision math, query behavior, route/query surfaces, persistence keys, and current latest-generated-date proof-safe behavior remain unchanged.
- QA must reject the packet if implementation touches forbidden files or widens into repository, schema, query/route, persistence, frontend, shared, package, provider, startup/backfill, or cross-module source work.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Persisted framework-backed candidate row | Returned row exposes additive provenance equivalent to `FRAMEWORK_BACKED` plus persisted-row mode, and `legacyIncludedByRequest=false`. |
| Persisted framework-backed history row | Later history/list read still maps to `FRAMEWORK_BACKED` from persisted evidence only and does not claim request-local creation. |
| Explicit legacy include | A non-framework-backed row returned because `includeLegacy=true` maps to `LEGACY_FALLBACK` and sets `legacyIncludedByRequest=true`. |
| Default legacy exclusion | Candidate or funnel-style proof-safe reads without `includeLegacy=true` still exclude non-framework-backed rows entirely. |
| Direct lookup miss path | `latestForInstrument()` miss evaluates, creates, and returns the row with request-local `READ_PATH_CREATED` provenance on that response only. |
| Watchlist delegated miss path | `watchlist()` item returned through `latestForInstrument()` miss carries request-local `READ_PATH_CREATED` provenance for that response only. |
| Portfolio delegated miss path | `portfolio()` item returned through `latestForInstrument()` miss carries request-local `READ_PATH_CREATED` provenance for that response only. |
| Later persisted replay of a previously read-path-created row | Later `history()` or list-style persisted reads do not expose `READ_PATH_CREATED`; they map only from durable persisted fields such as `frameworkBacked`. |
| Blocker-first summary | When `blockers[]` exists, top-level `reasonSummary` equals the first blocker and does not fall through to warning, gap, reason, or risk-plan text. |
| Warning-first summary | When blockers are absent and `warnings[]` exists, top-level `reasonSummary` equals the first warning. |
| Data-gap-first summary | When blockers and warnings are absent and `dataGaps[]` exists, top-level `reasonSummary` equals the first data gap. |
| Reason-first summary | When blockers, warnings, and data gaps are absent but `reasons[]` exists, top-level `reasonSummary` equals the first reason. |
| Risk-plan fallback summary | When the arrays above are empty and `riskPlan.reasonSummary` exists, top-level `reasonSummary` reuses that existing risk-plan summary. |
| Neutral fallback summary | When none of the owned evidence inputs exist, the service returns a neutral research-support fallback rather than advice-like copy. |
| Scope drift attempt | Any decision-math rewrite, query/route change, persistence/schema change, repository touch, frontend/shared change, or cross-module edit is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

No frontend build or UI smoke is planned for this first child because frontend files are explicitly out of scope.

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend builds
- local servers, services, providers, and live data
- frontend builds and UI smoke because frontend scope is explicitly excluded from this child

Forbidden by default for this slice:

- repository/controller/router/validation/module/export widening
- repository-test or route-test widening
- query-parameter or route-path changes
- frontend `strategy-decision-engine` changes or shared UI/shared DTO changes
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `strategy-decision-engine` service/types/doc/test files
- implementation touches repository, controller, router, validation, module, public export, repository tests, backend/frontend route registries, or query/route contracts
- implementation requires Prisma/schema/generated changes, persistence-key changes, or durable stored read-path provenance
- implementation changes decision math, thresholds, evaluator behavior, candidate-date defaults, or batch behavior
- implementation widens into frontend Strategy Decision files, shared UI, shared DTOs, or downstream consumer adoption
- implementation edits Strategy Framework, Signal Generation, Calibration, DQE, Smart Money, Market Context, Research Hub, or Trade Plan source/tests

## Evidence Required Later

- Exact implementation handoff limited to the reserved `strategy-decision-engine` backend files
- Scenario evidence for framework-backed mapping, explicit legacy include behavior, default legacy exclusion, request-local read-path-created behavior, and no fabricated durable read-path provenance on later reads
- Focused service-test output only after approval
- Backend build output only after approval
- Explicit proof that top-level `reasonSummary` follows the blocker/warning/data-gap/reason/risk-plan/fallback precedence rule
- Explicit note that no decision math, query parameter, route, persistence key, schema, repository, frontend, shared-file, package, provider, live-data, or startup/backfill widening occurred

# CF-W1-BT-02 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backtesting outcome review traceability QA plan prepared. QA-ready for Team 00 Ready evaluation as one bounded no-schema `backtesting-strategy-lab` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend and feature-local frontend files.

## Scope

Validation plan for additive backtesting review-outcome and trade-traceability evidence in `CF-W1-BT-02`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Out of scope for this first slice:

- Prisma, migrations, generated files, repository identity, or saved-run persistence-shape changes
- `backtesting-strategy-lab` repository, controller, router, validation, module, public export, API client, hooks, feature routes, or backend/frontend route registry changes
- `strategy-framework` source changes, `trade-plan-risk-engine` source changes, or any cross-module shared contract widening
- simulation math, benchmark math, action semantics, evaluator semantics, or any source change made only to manufacture a better review outcome
- shared UI, shared utilities, package manifests, providers, startup/backfill, live-provider, paid/cloud, telemetry, broker, or historical-doc edits

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-BT-02-architecture-review.md`
- `06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `08-work-packets/CF-W1-BT-02-work-packet.md`
- `10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`

Current backtesting source surfaces show:

- `backtesting-strategy-lab.md` already documents availability states, benchmark comparison, exit diagnostics, realism warnings, legacy-invalid aggregate withholding, and current trade reason fields.
- `backtesting-strategy-lab.service.test.ts` already covers legacy invalid normalization, benchmark unavailable, stop loss, trailing stop, take profit, max hold, registered strategy execution, scoped saved-run filtering, and insufficient-history behavior.
- `frontend/src/features/backtesting-strategy-lab/types.ts` already exposes additive-friendly `metrics` and `trades` structures, so new traceability fields can stay backward-compatible.
- `BacktestingStrategyLabPage.tsx` already renders benchmark, availability, calculation audit, exit diagnostics, realism warnings, and trade log rows, which means the first UI slice should surface visible review evidence without route or shared UI changes.
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts` already proves active-entry-only registered strategy selection, scoped registered-run submission, and legacy-invalid evidence rendering, so focused smoke can stay feature-local.

## Required QA Assertions

- Run-level review outcome is additive. Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataQualityMetadata`, and `calculationAudit` remain present and unrenamed.
- Trade-level traceability is additive. Existing `entryReason`, `entryReasons`, `exitReason`, and `exitReasons` remain present while structured trace fields are added alongside them.
- Review outcomes explicitly cover `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`, or stable equivalents with the same semantics.
- Registered strategy runs expose structured traceability from current source evidence only:
  - `strategyCode`, `strategyVersion`, and `ruleVersion` do not require `strategy-framework` edits
  - `entryRuleIds` derive from evaluator `entryRulesPassed`
  - `exitRuleIds` derive from evaluator `exitRulesTriggered` when a registered exit fires
- Custom-rule runs expose structured traceability from module-owned config only:
  - `entryRuleIds` derive from `config.entryRule.type`
  - `exitRuleIds` derive from `config.exitRule.type` when applicable
  - forced risk exits surface structured invalidation/risk IDs for `STOP_LOSS`, `TRAILING_STOP`, `TAKE_PROFIT`, and `MAX_HOLDING_PERIOD`
- End-of-test closures remain visible as weak traceability:
  - `exitDecisionSource = END_OF_TEST` or equivalent
  - no fabricated exit rule ID
  - weak-exit dominance can force a diagnostic-only outcome
- Legacy normalization is explicit:
  - repaired rows surface traceability that a repair changed row interpretation
  - `LEGACY_INVALID` aggregate proof remains withheld instead of being reclassified as trusted
- Partial review remains distinct from diagnostic-only:
  - limited availability or limited coverage may still preserve bounded review value
  - benchmark unavailable, insufficient history, low sample, weak end-of-test exits, or low/unknown data-quality confidence remain diagnostic-only
- No-schema, no-route, no-shared-file enforcement is preserved:
  - no repository/controller/router/validation/module/export changes
  - no frontend API/hook/routes/shared component changes
  - no route-registry or shared-file widening
- Simulation math, benchmark math, Strategy Framework semantics, and Trade Plan Risk semantics remain unchanged.
- Research-support wording remains intact. No direct advice, buy/sell-now phrasing, guaranteed outcomes, target-price wording, broker framing, or automation framing is introduced.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Trusted review outcome | Completed run with usable aggregate proof, structured trade traceability, traced exits/invalidation evidence, and no diagnostic blockers maps to `TRUSTED_REVIEW`. |
| Partial review outcome | Availability or coverage is `PARTIAL`, aggregate proof remains usable, reasons show bounded evidence gaps, and the run is not collapsed into diagnostic-only or trusted. |
| Diagnostic-only benchmark gap | Benchmark data is unavailable or fallback-limited and the review outcome surfaces visible caution reasons instead of failing silently. |
| Diagnostic-only weak exits | End-of-test exit dominance is visible in review evidence and does not pretend a strategy exit fired. |
| Diagnostic-only insufficient history | `INSUFFICIENT_HISTORY` remains explicit and maps to diagnostic-only review evidence. |
| Diagnostic-only low sample | Small or no-trade sample evidence maps to diagnostic-only review framing with visible reasons. |
| Diagnostic-only unknown or limited DQ confidence | Missing or non-ready DQ review evidence does not become trusted and remains visible as cautionary review evidence. |
| Legacy-repaired outcome | Trade rows show repair-applied traceability, aggregate proof remains usable, and the review outcome becomes `LEGACY_REPAIRED` rather than trusted. |
| Withheld outcome | `calculationAudit.aggregateStatus = LEGACY_INVALID`, failed run evidence, or unreconciled aggregate proof maps to `WITHHELD`, keeps warnings visible, and does not show withheld proof as trusted review output. |
| Registered strategy trade traceability | Returned trade rows surface strategy code/version, rule version, entry rule IDs, registered exit rule IDs when fired, and reason evidence without editing `strategy-framework` source. |
| Custom-rule trade traceability | Returned trade rows surface config-derived rule IDs plus structured risk/invalidation trace IDs for forced exits. |
| End-of-test closure traceability | Trade rows show `END_OF_TEST` or equivalent decision source, do not fabricate exit IDs, and contribute to diagnostic-only reasoning when overused. |
| Existing payload consumer compatibility | Current metrics and trade consumers still read legacy fields without rename/removal; new review fields are additive only. |
| UI visible review evidence | The current Backtesting Strategy Lab page shows review-outcome label, reason summary, legacy-repair or withheld evidence, and trade-level structured trace fields without route or shared UI changes. |
| Scope drift attempt | Any repository/controller/router/validation/schema/shared-route/shared-UI widening is a QA reject and returns the packet to Team 00 / Architect. |

## Feature-Local UI Smoke Expectations

- `backtesting-strategy-lab.spec.ts` should remain the only UI smoke surface for this slice.
- Smoke must prove one visible review-outcome state on the page, not just that the page loads:
  - trusted, partial, diagnostic-only, legacy-repaired, or withheld label
  - visible reason summary tied to benchmark, availability, audit, exit, sample, or data-quality evidence
- Smoke must prove trade-row review evidence is visible for at least one registered-run case and one custom/legacy-repaired case when those rows are mocked.
- Smoke must verify research-support wording remains intact:
  - keep "Historical daily-close simulations. Results are not predictions."
  - do not introduce `buy now`, `sell now`, `price target`, `profit target`, `guaranteed`, or broker/automation phrasing
- Smoke must continue to prove legacy-invalid evidence stays visible when aggregate proof is withheld.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Approval-gated feature-local UI smoke after bounded UI work, one Playwright worker, and a local startup/resource plan:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- repository/controller/router/validation/module/export widening
- `strategy-framework` or `trade-plan-risk-engine` source/test edits as a backdoor for traceability
- frontend API client, hooks, route, or shared component changes
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `backtesting-strategy-lab` service/types/doc/test and feature-local types/page/UI spec files
- implementation touches repository, controller, router, validation, module, public export, API client, hooks, feature routes, backend/frontend route registries, or shared UI/shared utilities
- implementation requires Prisma/schema/generated changes or saved-run persistence identity changes
- implementation changes simulation math, benchmark math, Strategy Framework semantics, or Trade Plan Risk semantics
- implementation fabricates traceability IDs where current source evidence is absent
- implementation hides or replaces current calculation-audit, benchmark, availability, exit-diagnostic, or realism-warning evidence instead of adding review framing

## Evidence Required Later

- Exact implementation handoff limited to the reserved `backtesting-strategy-lab` backend and feature-local frontend files
- Scenario evidence for trusted, partial, diagnostic-only, legacy-repaired, and withheld outcomes
- Scenario evidence for registered strategy and custom-rule trade traceability mappings
- Focused service-test output and feature-local UI smoke output only after approval
- Build output only after approval
- Confirmation that current metrics/trades payload consumers remained additive/backward-compatible
- Explicit note that no schema, route, shared-file, Strategy Framework source, or Trade Plan Risk source widening occurred

# TEAM-04 Current Assignment

Date: 2026-05-18

Team: TEAM-04 - QA Factory

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-04-qa-factory.md`

## Assignment

Stand by for QA rerun on `CF-W1-L3-PORT-01A` after Team 07 completes the Team 10 rework.

The first focused QA command passed, but Team 10 later rejected release acceptance because the readiness mapper can treat automation-only Data Quality blockers as portfolio display hard blockers. QA must rerun after Team 07 revises the implementation. QA may inspect and run focused validation in that worktree, but must not edit application source or tests.

## Source Handoff

- Requirement: `CF-W1-L3-PORT-01A`
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`
- Handoff path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- Team 00 routing note: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-review-routing.md`
- First-pass QA evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-qa-verification.md`
- Team 10 rejection: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-team10-review-release.md`

## Files To Verify

Changed files reported by Team 07:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Forbidden scope to confirm untouched:

- Prisma schema or migrations
- route registries
- shared backend utilities or shared DTOs
- shared UI
- package manifests
- generated files
- Data Quality Engine source/public exports
- watchlist-management
- alerts-monitoring
- portfolio-intelligence
- frontend files
- providers, startup/backfill, live provider, paid/cloud, broker, telemetry

## Required QA Checks

Verify the QA plan scenarios for portfolio-only readiness DTOs:

- READY evidence maps to trusted display/action eligibility according to contract.
- LIMITED evidence remains passive display only and action-blocked.
- missing DQ is blocked/untrusted and does not inherit trust from non-null price or signal.
- NOT_READY, UNUSABLE, stale, unsupported, scope mismatch, or blocked-tier evidence is blocked/untrusted.
- mixed holdings produce accurate summary counts.
- automation-only Data Quality blocker evidence does not block otherwise portfolio-eligible display/action readiness when daily-review and signal tiers are `READY`.
- existing portfolio fields, `dataStatus`, valuation, price, and signal compatibility are preserved.
- Data Quality is consumed through public service/type outputs only.
- no direct advice, target-price, buy/sell, guarantee, or trade-instruction wording is introduced.

## Focused Commands

Run in the Team 07 worktree if environment is available:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A\backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
npm.cmd run build
```

If `node_modules` is unavailable, do not install packages without Team 00 approval. Record the exact blocker and whether Team 07's reported local junction/no-install validation is acceptable QA evidence.

## Output

Write QA result to:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Include:

- pass/reject decision;
- commands run and results;
- scenario evidence;
- changed-file scope confirmation;
- skipped checks and reasons;
- risks/blockers;
- whether Code Review / Architect Signoff can proceed.

## Other QA Work

Continue docs-only QA prep only after this review:

- `CF-W1-TP-01B`
- `CF-W1-NOTIF-02`
- `CF-W1-L3-ALERT-01`
- `CF-W1-MD-01`
- `CF-W1-UX-02`
- `CF-W1-UX-05`
- `CF-W1-AUTH-01`
- `CF-W1-SUB-01`

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-SQLAB-01` in the dedicated Team 06 worktree. This supersedes the stale `CF-W1-L3-PORT-01A` standby text above for the next Team 04 spawned agent.

## Source Handoff

- Requirement: `CF-W1-SQLAB-01`
- Branch: `codex/team06-strategy-signal/CF-W1-SQLAB-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SQLAB-01`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-developer-handoff.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-01-qa-plan.md`

## Files To Verify

Allowed implementation files:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

Allowed evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-developer-handoff.md`

Forbidden scope to confirm untouched:

- Prisma schema or migrations
- `signal-quality-lab` repository, controller, router, or validation source
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, Trade Plan source/tests
- backend/frontend route registries
- shared backend utilities, shared DTOs, shared UI
- package manifests, generated files, frontend source/tests
- providers, startup/backfill, live-provider, paid/cloud, broker, telemetry, or automation flows

## Required QA Checks

- Confirm additive `outcomeConfidence` exists on SQLAB summary payloads without removing or renaming existing fields.
- Verify `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, and `UNTRUSTED` state coverage.
- Verify missing optional DQ evidence does not become trusted.
- Verify no selected-horizon evidence maps to untrusted.
- Verify DQ lookup failure maps to untrusted and surfaces a reason.
- Confirm current DQ filter/query behavior is unchanged.
- Confirm wording remains research-support only with no target-price, direct advice, broker, or automation framing.

## Focused Commands

Run in the Team 06 worktree if environment is available:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SQLAB-01\backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
npm.cmd run build
```

## Output

Write QA result to the Team 06 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SQLAB-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-STRAT-02A`, the no-schema Strategy Framework rule metadata and DQ gate exposure child split out by Team 03.

Do not QA or implement durable rule-revision history. The durable parent remains blocked because it needs Prisma/schema/repository/generated approval.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-02-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- versioned and legacy undeclared rule metadata
- DQ gate policy exposure in service/catalog/detail/proof surfaces
- unchanged strategy math, backtest action rules, evaluator behavior, and route contracts
- additive frontend proof/detail trust fields, without shared UI or route changes
- payload regression guard for current strategy catalog/detail consumers
- explicit blocker that durable revision history remains out of scope

## Output

State whether `CF-W1-STRAT-02A` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-BT-02` - Backtesting outcome review traceability.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- trusted, partial, diagnostic-only, legacy-repaired, and withheld review outcomes
- registered and custom backtest trade traceability
- no-schema/no-route/no-shared-file scope enforcement
- additive review trace fields without changing simulation math, strategy framework source, or trade-plan risk source
- feature-local UI smoke expectations for visible review evidence and research-support language

## Output

State whether `CF-W1-BT-02` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-CAL-01` after Team 06 developer handoff.

This final override supersedes all older Team 04 tails above. Team 06 reports implementation and developer validation passed in the dedicated CAL worktree. Verify executable behavior before Team 10 review.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## Evidence To Review

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`

## Allowed Writes

Only in the Team 06 CAL worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Do not edit application source/tests unless Team 00 explicitly reassigns QA to fix its own test harness. Do not commit.

## Required Commands

Run in the Team 06 CAL worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01\backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

Route-level tests are not required unless Team 06 added route-level assertions. Do not run providers, services, Prisma commands, UI smoke, live data, or package installs.

## Output

Return `ACCEPT` or `REJECT`, commands run/results, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Run QA rerun for `CF-W1-BT-02` after Team 06 bounded rework.

This latest override supersedes older QA-planning tails above. Team 06 reports the QA-rejection rework is complete and developer validation passed. Verify executable behavior in the same Team 06 worktree before Team 10 review.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`

## Evidence To Review

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`
- Prior QA evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`

## QA Focus

Verify the two rejected behaviors are fixed:

1. trusted-review fixture returns `TRUSTED_REVIEW`, not `DIAGNOSTIC_ONLY`, and does not add false `NO_TRADES_GENERATED` from missing in-memory rows when persisted aggregate evidence exists;
2. legacy-invalid saved-run UI renders `Review Disposition` evidence for `WITHHELD` fields in list and detail surfaces.

Also confirm existing acceptance coverage still holds for `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, `WITHHELD`, list/detail reason-summary consistency, research-support language, and no forbidden scope.

## Allowed Writes

Only in the Team 06 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-rerun-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Do not edit application source/tests unless Team 00 explicitly reassigns QA to fix its own test harness. Do not commit.

## Required Commands

Run in the Team 06 worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

Run because frontend files changed:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

Use a source-synchronized frontend target. Do not rely on an unrelated long-running `5173` server if it is stale. If sandbox restrictions block Playwright, record the exact blocker and command.

## Output

Return `ACCEPT` or `REJECT`, commands run/results, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-CAL-01` after Team 06 developer handoff.

This latest override supersedes older Team 04 tails above. Team 06 reports implementation and developer validation passed in the dedicated CAL worktree. Verify executable behavior before Team 10 review.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## Evidence To Review

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`

## QA Focus

Verify the accepted CAL behavior:

- `TRUSTED`;
- `LIMITED` low-sample;
- `LIMITED` context-gap;
- `DIAGNOSTIC_ONLY` missing DQ;
- `UNAVAILABLE` no selected-horizon evidence;
- fail-closed `eligibleForCalibration=false`;
- fail-closed `eligibleForSignals=false`;
- fail-closed `NOT_READY`;
- fail-closed `UNUSABLE`;
- fail-closed `ILLIQUID`;
- score-math preservation;
- current-field preservation;
- no forbidden scope.

## Allowed Writes

Only in the Team 06 CAL worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Do not edit application source/tests unless Team 00 explicitly reassigns QA to fix its own test harness. Do not commit.

## Required Commands

Run in the Team 06 CAL worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01\backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

Route-level tests are not required unless Team 06 added route-level assertions. Do not run providers, services, Prisma commands, UI smoke, live data, or package installs.

## Output

Return `ACCEPT` or `REJECT`, commands run/results, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-HCTX-01` in the dedicated Team 05 worktree.

This is independent from the active `CF-W1-BT-02` QA gate because it uses a separate worktree and a separate backend module. Do not edit application source/tests. Do not install packages or alter manifests.

## Source Handoff

- Requirement: `CF-W1-HCTX-01`
- Branch: `codex/team05-market-data/CF-W1-HCTX-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-01`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`
- Team 05 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-HCTX-01-qa-plan.md`

## Files To Verify

Allowed implementation files:

- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.service.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.types.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/tests/modules/historical-context-snapshots/historical-context-snapshots.service.test.ts`

Allowed evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-05-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-developer-handoff.md`

Forbidden scope to confirm untouched:

- Prisma schema or migrations
- generated files
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.repository.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.controller.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.router.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.validation.ts`
- `backend/src/modules/historical-context-snapshots/index.ts`
- backend or frontend route registries
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/smart-money-intelligence/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/signal-calibration-engine/**`
- shared backend utilities, shared DTOs, shared frontend components
- frontend source or tests
- package manifests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

## Required QA Checks

- Confirm additive `lookupExplainability` exists without removing or renaming current lookup fields.
- Verify exact-date, nearest-prior, metadata-gap, missing-within-lookback, and not-requested evidence.
- Verify top-level requested date, lookback, region, asset type, selected nearest snapshot date, max lag, partial flag, and summary are derived from current lookup evidence.
- Confirm no second repository search was added.
- Confirm current `market`, `sector`, `country`, `smartMoney`, `dataQuality`, `dataStatus`, and `gaps[]` behavior remains backward-compatible.
- Confirm research-support wording only, with no advice, direct trading instruction, target-price, guarantee, broker, or automation framing.

## Focused Commands

Run in the Team 05 worktree if environment is available:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-01\backend
npm.cmd test -- historical-context-snapshots.service.test.ts --runInBand
npm.cmd run build
```

If dependency binaries are missing, record the exact blocker and whether QA can accept static source/test inspection only. Do not install packages.

## Output

Write QA evidence in the Team 05 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-HCTX-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Return pass/reject decision, commands run, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Rerun QA Verification for `CF-W1-BT-02` in the Team 06 worktree after Team 00 removed the local toolchain blocker by adding dependency junctions.

Do not edit application source/tests. Do not install packages or alter manifests.

## Environment Unblock

Team 00 created these local junctions:

- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend\node_modules` -> `C:\work\repo\investment-scanner\backend\node_modules`
- `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend\node_modules` -> `C:\work\repo\investment-scanner\frontend\node_modules`

## Source Handoff

- Requirement: `CF-W1-BT-02`
- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`
- Prior QA rejection: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`

## Required Commands

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

## Required QA Checks

Retain the previous static scope and scenario checks, then update the QA decision based on executable validation.

Write updated QA evidence in the Team 06 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Return pass/reject decision and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-MCTX-01` - Market Context regime evidence and partial-context framing.

This is docs-only QA planning in the shared `dev` workspace. Do not edit application source/tests. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data. This work is independent from the active `BT-02` and `HCTX-01` QA verification agents, which write evidence in separate worktrees.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MCTX-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MCTX-01-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MCTX-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- persisted versus fresh summary provenance;
- exact live denominators for fresh auto-generated summaries;
- persisted summaries with derived denominators render `PARTIAL`, not `TRUSTWORTHY`;
- trustworthy, low-evidence, missing-evidence, and explicitly missing macro states;
- additive backend fields preserve existing Market Context response compatibility;
- Market Context page and Market Regime widget both show provenance/evidence framing;
- research-support wording only, no direct advice, no target-price, no guarantee, no broker or automation wording;
- explicit rejection if implementation touches Prisma/schema, routes, repository/controller/router/validation/index, Market Data/DQE source, Historical Context source, Signal Calibration/Generation source, shared utilities/UI, package manifests, generated files, provider/live data, or broad UX/navigation scope.

## Output

State whether `CF-W1-MCTX-01` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Stand by for QA Verification on the next active implementation handoff.

Do not run QA before a developer handoff exists. Do not start a new docs-only QA plan ahead of direct investor/trader value work unless Team 00 assigns it.

## Expected Next QA Targets

1. `CF-W1-BT-02` after Team 06 submits developer handoff from `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`.
2. `CF-W1-HCTX-01` after Team 05 submits developer handoff from `C:\work\repo\investment-scanner-worktrees\team05-CF-W1-HCTX-01`.

## Priority Rule

Prioritize direct investor/trader value: market data, Data Quality, signals, strategy trust, backtests, calibration, historical context, market context, Trade Plan research support, and research evidence.

Admin/settings/auth/subscription/notifications and alert convenience work stay lowest priority unless they block correctness, privacy, user-data safety, or an already accepted branch gate.

## Output Location

When Team 00 launches the next QA agent, write QA evidence to the relevant implementation worktree under:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-BT-02` in the dedicated Team 06 worktree.

Team 06 implementation is complete in reserved scope. Developer validation attempted the focused backend test, backend build, frontend UI smoke, and frontend build, but the worktree lacked local tool binaries (`jest`, `tsc`, and `playwright`). QA should rerun validation in the worktree if dependency access is available. Do not install packages without Team 00 approval.

## Source Handoff

- Requirement: `CF-W1-BT-02`
- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`

## Files To Verify

Allowed implementation files:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Allowed evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`

Forbidden scope to confirm untouched:

- Prisma schema or migrations
- generated files
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- backend or frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- shared backend utilities, shared DTOs, shared frontend components
- package manifests
- providers, startup/backfill, live-provider, paid/cloud, broker, telemetry, or automation flows

## Required QA Checks

- Confirm additive review-disposition fields exist and preserve existing payload compatibility.
- Verify backend service coverage for `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`.
- Verify diagnostic-only reasons for insufficient history, no trades, benchmark unavailable, weak end-of-test exit dominance, and low sample size.
- Verify withheld outcome for `LEGACY_INVALID` aggregate proof.
- Verify saved-run list and selected-run detail show the same disposition label and reason summary for the same run.
- Confirm existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence remains visible.
- Confirm frontend copy remains research-support only, with no direct advice, target-price, guarantee, broker, or automation wording.

## Focused Commands

Run in the Team 06 worktree if environment is available:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

Because frontend files changed, also run if environment is available:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02\frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

If dependency binaries are missing, record the exact blocker and whether QA can accept static source/test inspection only. Do not install packages or alter package manifests.

## Output

Write QA evidence in the Team 06 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Return pass/reject decision, commands run, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 review can proceed.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-DQ-02A`, the bounded Data Quality Engine currentness-evidence first child.

Do not QA or implement the full DQ-02 parent. The parent remains split-required because persisted evaluations do not store session-aware currentness evidence and broader read-side/public-contract or schema work may be needed later.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-dq-currentness-evidence-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- current after latest completed session
- current during open/grace window
- stale lag
- missing latest price
- session-evidence unavailable
- provider-gap blocked
- fail-closed blocker/tier propagation
- exact rejection if implementation edits Market Data Foundation, DQE repository/controller/router/validation/index, schema, generated files, routes, shared utilities/UI, package manifests, frontend, or provider/startup/live flows

## Output

State whether `CF-W1-DQ-02A` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-L3-INTEL-03` - Portfolio Intelligence concentration review.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-INTEL-03-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-03-portfolio-intelligence-concentration-review-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-INTEL-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- deterministic concentration ranking and stable tie-breaks
- portfolio-level versus holding-level concentration drivers
- bounded reason summaries and research-support wording
- no optimizer, rebalance, direct advice, schema, route, shared UI, or portfolio-management source expansion
- feature-local UI smoke expectations for visible concentration review evidence
- one-writer sequencing against `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`

## Output

State whether `CF-W1-L3-INTEL-03` is QA-plan ready for Team 00 Ready evaluation and list sequencing blockers.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-BT-02` - Backtesting outcome review traceability.

This final override supersedes older Team 04 tails above. Team 03 refreshed `CF-W1-BT-02` as a Ready candidate for one narrow, no-schema, no-shared first child: canonical run-level review disposition plus a shared list/detail reason summary.

Do not implement application code. Do not run tests. Do not widen the packet into trade-level structured rule IDs, Prisma/schema, routes, shared UI, API hooks, Strategy Framework source, or Trade Plan source.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- backend service coverage for `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD`;
- diagnostic-only reasons for insufficient history, no trades, benchmark unavailable, weak end-of-test exit dominance, and low sample size;
- withheld outcome for `LEGACY_INVALID` aggregate proof;
- list/detail normalization proving the same run shows the same disposition label and reason summary in both surfaces;
- regression coverage that existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence remains visible;
- feature-local UI smoke coverage for visible review evidence and research-support language;
- explicit rejection if implementation touches forbidden files or changes simulation math, benchmark math, route contracts, shared UI, or cross-module source.

## Output

State whether `CF-W1-BT-02` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

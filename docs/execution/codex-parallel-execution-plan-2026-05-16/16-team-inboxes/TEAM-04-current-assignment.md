# TEAM-04 Current Assignment

Date: 2026-05-20

## Latest Assignment Override - 2026-05-25 CAL-02A QA Planning

Prepare docs-only QA planning for `CF-W2-CAL-02A` Signal Calibration scoped evidence-basis projection.

Team 03 verdict: `Ready candidate after QA`.

This is QA planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data. Do not move the item to Ready.

Source inputs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-CAL-02-signal-calibration-evidence-freshness-and-scope-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-CAL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-CAL-02-signal-calibration-evidence-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-CAL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-CAL-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-CAL-02-qa-outbox.md`

Required QA coverage:

- scoped summary uses selected `region`, `assetType`, and `horizon`;
- row `generatedAt` remains distinct from evidence-through date;
- horizon-limited evidence exposes `nextEvaluableDate`;
- missing Signal Quality evidence fails closed;
- mixed-row page states do not use first-row readiness, influence, warning, or blocker proxies;
- compare/list parity for row evidence-basis fields;
- page summary no longer relies on unscoped `/signals/calibration/health`;
- no calibration repository/controller/router/validation/module/index, route registry, Signal Quality source/test, Prisma/schema/generated/package/shared utility/shared UI/provider/startup/backfill scope.

Required focused validation commands to recommend, not run:

- `npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`
- `npm.cmd run build`
- `npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1`

Output:

- Create the QA plan and item-specific outbox.
- State whether the packet is QA-plan ready for Team 00 Ready evaluation.
- List exact reject conditions and any remaining blocker.

## Latest Assignment Override - 2026-05-25 DQ-02 Read-Side Currentness QA Planning

Prepare docs-only QA planning for `CF-W1-DQ-02-RS1` Data Quality Engine read-side/public-contract currentness reconstruction.

Team 03 verdict: `Ready candidate after QA`.

This is QA planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data. Do not move the item to Ready.

Source inputs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-DQ-02-residual-read-side-currentness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02-read-side-currentness-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02-read-side-currentness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02-read-side-currentness-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02-read-side-currentness-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-DQ-02-read-side-currentness-qa-outbox.md`

Required QA coverage:

- one truthful currentness story across `summary`, `list`, `diagnostics`, `getLatestEvaluationForInstrument`, and `getEvaluationsForInstruments`;
- current completed session;
- current finalization pending;
- stale missed completed session;
- missing latest price;
- session evidence unavailable;
- provider-gap blocked;
- contradictory evidence;
- fail-closed propagation;
- summary counts derived from the same reconstructed per-row basis as row/detail/latest-helper reads;
- no controller/router/route-registry/schema/generated/package/shared-utility/Market Data/frontend/provider/startup/backfill scope.

Required focused validation commands to recommend, not run:

- `npm.cmd test -- data-quality-engine.repository.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand`
- `npm.cmd run build`

Output:

- Create the QA plan and item-specific outbox.
- State whether the packet is QA-plan ready for Team 00 Ready evaluation.
- List exact reject conditions and any remaining blocker.

## Latest Assignment Override - 2026-05-25 TSC-05A QA Standby

Stand by for QA Verification on `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` after Team 07 submits a developer handoff from the stacked Today Review worktree.

Team 04 has already accepted the planning artifact:

- `04-qa/CF-W2-TSC-05A-today-review-ranking-eligibility-qa-plan.md`

Expected worktree:

- `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A`
- Required base check: `git merge-base --is-ancestor 68f0a19 HEAD`

Do not run QA before a Team 07 handoff exists. When the handoff exists, verify the reserved Today Review file set, no upstream/schema/route/shared/package drift, backend focused tests/build, frontend build, worktree-targeted Today Review Playwright smoke, phrase scans, and compatibility-only raw-key review from the accepted QA plan.

Secondary standby:

- After Team 03 completes the `CF-W1-DQ-02` read-side/public-contract architecture packet, prepare the DQ QA plan only if Team 00 routes it. Do not infer Ready from the requirement alone.

## Latest Assignment Override - 2026-05-24 Trusted Signal Candidate Dependency

Prepare docs-only QA planning for `CF-W1-SIG-TRIGGER-ENTRY-01` after Team 02/03 refine the requirement and architecture packet.

This is planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data. Do not move the item to Ready.

Required QA coverage:

- source-proven rule-triggered entry price is required before any `Highly Trusted` candidate classification;
- trigger timestamp and rule provenance must be source-proven, not inferred from reference zones or Trade Plan geometry;
- missing trigger price must block or downgrade trusted candidate classification;
- no R:R, arbitrary target, synthetic profit target, buy/sell advice, guaranteed outcome, or trade-instruction wording;
- strict Data Quality readiness remains required for high-trust candidates;
- exit/invalidation status remains rule-based only.

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/**`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Output:

- QA plan or queue note for `CF-W1-SIG-TRIGGER-ENTRY-01`.
- Explicit reject conditions and focused validation command recommendations, without running them.

## Latest Assignment Override

Date: 2026-05-20

Assignment: prepare docs-only QA planning for `CF-W1-STRAT-04` and `CF-W1-SQLAB-03`.

This is planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data. Do not move either item to Ready.

Source inputs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-04-strategy-evidence-freshness-and-stale-summary-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-04-strategy-evidence-freshness-and-stale-summary-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-04-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-03-signal-quality-review-loop-actionability-for-noisy-and-limited-outcomes-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-03-signal-quality-review-loop-actionability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-03-work-packet.md`

Allowed writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-04-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Required QA plan coverage:

- For `CF-W1-STRAT-04`: stale/generated/persisted evidence freshness labels, no arbitrary target/advice wording, feature-local Strategy Framework UI proof, additive DTO compatibility, and no strategy math or route/schema/shared-file changes.
- For `CF-W1-SQLAB-03`: visible review-loop actionability for noisy/limited outcomes, deterministic research-support wording, feature-local Signal Quality Lab UI proof, additive DTO compatibility, and no journal persistence or route/schema/shared-file changes.
- Explicitly record that `CF-W1-SQLAB-03` implementation must wait until `CF-W1-SQLAB-02A` is accepted/committed because the writer set overlaps.

Output:

- State whether each item is QA-plan ready for Team 00 Ready evaluation.
- List file-reservation, sequencing, and validation blockers separately.

---

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

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-STRAT-03` - Strategy Decision review provenance.

This override supersedes the `CF-W1-BT-01A` verification assignment, which completed with QA rejection and has been routed back to Team 06.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-STRAT-03-strategy-decision-review-provenance-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-STRAT-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-STRAT-03-strategy-decision-review-provenance-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-STRAT-03-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-STRAT-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- `FRAMEWORK_BACKED` mapping on persisted framework-backed rows.
- `LEGACY_FALLBACK` mapping for non-framework-backed rows only when `includeLegacy=true`.
- `legacyIncludedByRequest=true` only when legacy rows are explicitly included by request.
- Default proof-safe reads still exclude legacy rows unless `includeLegacy=true`.
- `READ_PATH_CREATED` is request-local on the response that creates a row through `latestForInstrument()` and any watchlist/portfolio path that delegates to it.
- Later history/list reads must not fabricate durable read-path-created provenance.
- `reasonSummary` follows the architecture precedence rule and remains research-support language.
- No decision math, query parameter, route, persistence key, schema, repository, frontend, shared UI, package, provider, live-data, startup/backfill, paid/cloud, broker, or telemetry changes.

## Output

State whether `CF-W1-STRAT-03` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-BT-03` - Backtesting proof-basis / overfit guardrail.

This override supersedes the prior `CF-W1-STRAT-03` QA-planning assignment, which completed with no blocker and was promoted by Team 00.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-03-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- `REVIEW_ONLY` run that still states single-window-only and no broader validation evidence.
- `WEAK_EVIDENCE` runs for:
  - low trade count;
  - benchmark unavailable;
  - weak end-of-test exit distribution;
  - low data coverage.
- `DO_NOT_USE_FOR_RELIABILITY` runs for:
  - no trades;
  - insufficient history;
  - legacy invalid aggregate proof.
- saved-run list and selected-run detail show the same proof-basis label and summary for the same run.
- existing benchmark, availability, coverage, warning, and calculation-audit evidence remain visible.
- no walk-forward, holdout, parameter-sensitivity, direct-advice, or validated-certainty language is fabricated.
- explicit rejection if implementation widens into walk-forward/holdout engines, parameter sweeps, schema, route, shared UI, simulation rewrite, cross-module source, package, provider/live/startup/backfill, paid/cloud, broker, or telemetry.

## Sequencing Note

This future implementation writer set overlaps backtesting files used by `CF-W1-BT-02` and `CF-W1-BT-01A`. Team 04 should call out that Team 00 must sequence or stack the implementation under one backtesting writer after current BT gates clear.

## Output

State whether `CF-W1-BT-03` is QA-plan ready for Team 00 Ready evaluation and list sequencing blockers.

---

# Latest Assignment Override

Date: 2026-05-18

## Assignment

Verify `CF-W1-BT-01A` - Backtesting DQ fail-closed characterization in the Team 06 stacked worktree.

This override supersedes older Team 04 tails. This is QA verification, not implementation and not QA-plan drafting.

## Worktree / Branch

- Branch: `codex/team06-strategy-signal/CF-W1-BT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-01A`
- Base: accepted parked `CF-W1-BT-02` branch at `bb49ce2`

## Source Input

- Main workspace Ready handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- Worktree developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-01A-developer-handoff.md`

## Allowed Writes

In the Team 06 worktree only:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required Verification

- Confirm implementation stayed inside reserved files:
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- Confirm no backtesting source, Prisma/schema, generated, route registry, frontend, shared utility/UI, package, provider/live/startup/backfill, paid/cloud, broker, telemetry, or unrelated accepted-branch files changed.
- Confirm characterization covers:
  - no DQ filter call when disabled;
  - `WARN_AND_PROCESS` versus `SKIP` missing-quality behavior;
  - enabled DQ filter failure persists a failed run;
  - one-instrument history fetch failure completes with coverage diagnostics.
- Run memory check before heavy commands.
- Run in the Team 06 worktree:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
npm.cmd run build
```

## Output

Return `ACCEPT` or `REJECT`, with exact commands, evidence, inspected files, skipped checks, residual risks, and next gate.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Review `CF-W1-MD-02A` as a docs-only ADR/schema-proposal QA gate.

This final override supersedes older Team 04 tails above. Do not treat `MD-02A` as an implementation QA plan. It is a proposal-only completeness review for the future additive companion durable readiness evidence storage packet.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-02A-additive-companion-evidence-schema-packet-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02A-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-02A-additive-companion-evidence-schema-packet-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-02A-work-packet.md`
- Parent ADR: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-02-durable-readiness-evidence-adr.md`
- Parent QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02-qa-plan.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-02A-qa-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Review Coverage

- additive-only posture;
- complete natural-key basis for future companion evidence;
- minimum durable evidence field coverage;
- explicit durable-versus-derived claim boundary;
- exact split between `MD-02A`, `MD-02B`, `MD-02C`, and `MD-02D`;
- clear rejection of implementation work in this pass.

## Forbidden Scope

Do not edit or approve edits to Prisma/schema, migrations, generated artifacts, Market Data source/tests, DQE source/tests, route registries, shared utilities/UI, package manifests, provider/live-data, startup/backfill, frontend/UI, paid/cloud, broker, telemetry, or downstream consumer implementation.

## Output

Return whether `CF-W1-MD-02A` is accepted as a proposal QA packet, rejected for missing proposal content, or blocked by a true consent item. No tests, builds, services, Prisma commands, UI smoke, providers, or live data are authorized.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-MD-03` - Market Data signoff threshold contract enforcement.

This assignment supersedes older Team 04 tails. Team 03 returned `CF-W1-MD-03` as a Ready candidate only after QA planning. Do not implement application code and do not run tests.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-03-market-data-signoff-threshold-contract-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-03-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-03-market-data-signoff-threshold-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-03-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-MD-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- passing universe signoff when price-ready share is at least `95%` and metadata-ready share is at least `90%`;
- price-threshold failure below `95%` with explicit blocker reasoning;
- metadata-threshold failure below `90%` with explicit blocker reasoning;
- dual-threshold failure with both blocker reasons preserved;
- `universeHealth()` and `repairPlan()` signoff parity;
- preservation of existing review-ready counts and shares;
- research-support wording and no direct advice;
- explicit rejection if implementation widens into schema, repository/provider/startup/backfill, DQE source, routes/controllers, shared utilities/UI, frontend, packages, generated files, durable storage, provider/live-data, paid/cloud, broker, or telemetry.

## Expected Output

State whether `CF-W1-MD-03` is QA-plan ready for Team 00 Ready evaluation and list any blocker. No executable validation is authorized in this planning pass.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-RH-01` - Research Hub actionability evidence wiring.

This is main-workspace QA planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data.

Team 03 completed the architecture packet in commit `76a2c32`. The next gate is a focused QA plan so Team 00 can evaluate Ready promotion for one bounded Research Hub backend writer pass.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- Today Review public latest-run mapping for `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA`.
- Trade Plan public paper-readiness mapping for `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA`.
- Signal Quality summary replaces placeholder insufficiency when public summary exists, but does not overstate trust on current `dev`.
- Calibration persisted-read mapping replaces placeholder insufficiency when public rows exist, but does not overstate trust on current `dev`.
- Missing upstream public evidence fails closed.
- `canReviewActionableSetups` stays conservative and research-support only.
- No frontend Research Hub changes, upstream source edits, route changes, schema/generated changes, shared utility/UI, provider/live-data, startup/backfill, package, paid/cloud, broker, or telemetry scope.

## Output

State whether `CF-W1-RH-01` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Parallel Worktree QA Assignment

Date: 2026-05-18

## Assignment

Run QA Verification for `CF-W1-SMI-01` in the dedicated Team 06 worktree.

This is parallel-safe with the active `CF-W1-RH-01` main-workspace QA-planning agent because this assignment writes QA evidence only inside the SMI worktree. Do not edit main-workspace Team 04 QA files for this verification.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SMI-01`

## Evidence To Review

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SMI-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SMI-01-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SMI-01-qa-plan.md`

## Files To Verify

Allowed implementation files:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Allowed worktree QA evidence writes:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-SMI-01-qa-outbox.md`

## Forbidden Scope To Confirm Untouched

- Smart Money repository/controller/router/validation/module/index files
- Prisma schema or migrations
- generated files
- backend/frontend route registries
- Market Data source, Data Quality source, Historical Context source, Market Context source, Signal Calibration/Generation source, Research Hub source
- shared backend utilities, shared DTOs, shared frontend components
- frontend source/tests
- package manifests
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

## Required QA Checks

- Additive `evidence` metadata exists without removing or renaming current Smart Money fields.
- Persisted reads are framed as `PERSISTED_SNAPSHOT` and downstream-safe only when evidence is usable.
- On-demand fallback is framed as `ON_DEMAND_DERIVED` and non-downstream-safe.
- Stale persisted snapshot maps to stale/limited rather than silently trusted.
- Missing persisted snapshot remains a downstream-safe data gap on persisted-only reads and does not auto-generate.
- Ownership placeholder evidence is partial trust, not complete confirmation.
- Insufficient-history fallback maps to unavailable evidence.
- `top()` and `distribution()` preserve ranking/order while adding evidence metadata.
- Research-support wording only; no direct advice, target-price, guarantee, broker, automation, or trade-command language.

## Required Commands

Run in the worktree backend:

```powershell
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

## Output

Return `ACCEPT` or `REJECT`, with commands run, scenario evidence, changed-file scope confirmation, skipped checks and reasons, residual risks, and whether Team 10 Review can proceed.

---

# Current Main-Workspace QA Assignment

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-L3-TREV-02` - Today Review candidate snapshot provenance.

This is main-workspace QA planning only. Do not implement application code. Do not run tests, builds, services, providers, Prisma commands, UI smoke, or live data.

This assignment is independent from the parallel `CF-W1-SMI-01` worktree QA verification because the SMI agent writes only worktree evidence files.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-TREV-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-TREV-02-work-packet.md`
- Team 03 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-TREV-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- Candidate-level provenance labels and evidence dates for stored snapshot detail.
- Compatibility-only labels for partial or legacy snapshot shapes.
- Explicit unavailable/unknown provenance fallback when stored evidence cannot prove source timing.
- Repository compatibility normalization without schema, migration, generated, or route changes.
- Candidate detail rendering only; no broad Today Review page redesign.
- Preserve read-only research-support wording and avoid target-like, direct-advice, broker, or automation wording.
- Reject implementation if it touches Prisma/schema, route registries, shared utilities/UI, package manifests, provider/live-data, startup/backfill, upstream module source, Trade Plan geometry, Strategy Decision rewrite, paid/cloud, broker, telemetry, or broad UI scope.
- Explicit sequencing note: do not implement in parallel with `CF-W1-L3-TREV-01` because both reserve Today Review writer files.

## Output

State whether `CF-W1-L3-TREV-02` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Perform Team 04 QA Verification for `CF-W1-TP-02` after Team 06 developer handoff.

This is an implementation verification gate in the dedicated Team 06 worktree. Do not modify application source. Do not widen scope beyond the approved backend-only Trade Plan slice.

## Worktree / Branch

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-02`
- Branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Base: accepted `CF-W1-TP-01B` commit `8ff22fd`

## Source Input

Read from the main `dev` workspace if a planning file is absent from the worktree:

- QA plan: `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\04-qa\CF-W1-TP-02-qa-plan.md`
- Ready promotion: `C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\09-summaries\team-00-CF-W1-TP-02-ready-promotion.md`

Read from the implementation worktree:

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-developer-handoff.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- Changed Trade Plan source/tests/docs listed in the developer handoff.

## Allowed Writes In The Worktree

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Coverage

- Confirm `CF-W1-TP-02` preserves accepted `CF-W1-TP-01B` Data Quality hard-block behavior.
- Verify additive `exitConditions[]` and `invalidationConditions[]` semantics and stable module-owned IDs/rule versions.
- Verify legacy `target` and `invalidationRules` remain compatibility outputs only.
- Verify trusted readiness does not depend on target-shaped fields.
- Verify invalid `targetRewardRisk` values are rejected when non-finite or outside inclusive `0.5` to `5.0`.
- Verify research-support wording avoids arbitrary target-price, direct advice, guarantee, broker, or action-command language.
- Confirm no forbidden files were modified.

## Required Validation

Check memory before heavy commands. If memory is safe, run from the worktree backend:

```powershell
npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand
npm.cmd run build
```

## Output

Return `ACCEPT` or `REJECT`, with evidence path, commands run, results, files inspected, forbidden-scope check, risks, and next gate recommendation.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-SMI-01` - Smart Money evidence freshness and partial-trust framing.

This assignment is independent from active `CF-W1-TP-02` QA, which is running in the Team 06 TP-02 worktree. Write this SMI QA plan only in the main `dev` docs workspace.

Do not implement application code. Do not run tests. Do not modify Smart Money source, tests, route registries, Prisma/schema, shared utilities/UI, frontend files, providers, packages, or generated files.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SMI-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SMI-01-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SMI-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- persisted daily snapshot evidence is framed as `PERSISTED_SNAPSHOT`;
- on-demand detail fallback is framed as `ON_DEMAND_DERIVED` and not downstream-safe;
- missing persisted snapshot remains a downstream-safe data gap on persisted-only reads;
- ownership placeholder evidence is `LIMITED` / partial trust, not complete confirmation;
- stale persisted snapshots are stale/limited rather than silently trusted;
- insufficient-history fallback maps to unavailable evidence;
- `top()` and `distribution()` preserve ranking/order while adding evidence metadata;
- no frontend trust surfacing, repository, schema, route, shared utility/UI, provider, package, or generated-file work is required.

## Output

State whether `CF-W1-SMI-01` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Prepare docs-only QA planning for `CF-W1-SIG-TRIGGER-02A` - Signal Generation trigger audit surfacing and provenance labeling.

This final override supersedes older Team 04 assignment tails above. Do not implement application code. Do not run tests. Prepare the focused QA plan only for the bounded first child, not the full durable parent.

## Source Input

- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-requirement.md`
- Related completed context: `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W1-SIG-TRIGGER-01-po-acceptance-packet.md`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/next-validation-plans.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

## Required QA Plan Coverage

- persisted `created_at` and `updated_at` exposure for current `SignalResult` rows;
- additive run audit metadata when `generationRunId` resolves to a generation run;
- explicit `trigger_timestamp` semantics distinguishing source-price-date from source-data-date;
- persisted-versus-compatibility-only provenance labeling for transient `strategyMatches[]` fields;
- continued unavailability for `trigger_price`, rule ids, timeframe, and any unproven lifecycle state;
- legacy row handling and incomplete-field signaling;
- no regression to strict DQ trusted read/run/latest behavior;
- rejection if implementation touches Prisma/schema/migrations, generated files, routes/controllers/routers/validation, frontend, shared utilities/UI, package manifests, downstream modules, providers/live data, paid/cloud, broker, or telemetry.

## Suggested Focused Command For Future Implementation QA

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

## Output

State whether `CF-W1-SIG-TRIGGER-02A` is QA-plan ready for Team 00 Ready evaluation and list any blocker.

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

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Run QA Rerun Verification for `CF-W1-CAL-01` after Team 06 bounded rework.

This final override supersedes all older Team 04 tails above. Team 04 previously rejected the CAL implementation because context-gap evidence could still return `TRUSTED`. Team 06 reports the bounded fix is complete and backend developer validation passed.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## Evidence To Review

- Prior QA reject: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-verification.md`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-CAL-01-qa-plan.md`

## QA Rerun Focus

- Context-gap regression: sufficient-sample, non-blocking-DQ, missing regime / sector leadership / smart-money context must return `LIMITED`, not `TRUSTED`.
- Existing hard blockers remain fail-closed: `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`.
- Score math and existing response fields remain preserved by focused regression coverage.
- No forbidden source, route, schema, shared, package, provider, live-data, startup/backfill, frontend, or generated scope was touched.

## Allowed Writes

Only in the Team 06 CAL worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-rerun-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

Do not edit application source/tests. Do not commit.

## Required Commands

Run in the Team 06 CAL worktree:

```powershell
cd C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01\backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
npm.cmd run build
```

Do not run providers, services, Prisma commands, UI smoke, live data, or package installs.

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

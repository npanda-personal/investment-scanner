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

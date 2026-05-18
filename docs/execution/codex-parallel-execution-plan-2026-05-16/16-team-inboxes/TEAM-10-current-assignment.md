# TEAM-10 Current Assignment

Date: 2026-05-18

Team: TEAM-10 - Review / Release

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-10-review-release.md`

## Assignment

Perform Code Review / Release Readiness precheck for `CF-W1-TP-01B` in parallel with the `CF-W1-L3-PORT-01A` QA rerun.

Team 10 still remains queued for `CF-W1-L3-PORT-01A` re-review after Team 04 QA rerun, but `CF-W1-TP-01B` is independent and must not wait on the portfolio workstream.

Review is read-only unless Team 00 later asks for a release evidence doc update. Do not stage, commit, push, or edit application source/tests.

## Source Handoff - `CF-W1-TP-01B`

- Requirement: `CF-W1-TP-01B`
- Branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-01B`
- Handoff path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-01B-team06-implementation-handoff.md`
- Evidence path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-TP-01B-team06-implementation-evidence-2026-05-18.md`
- Team 00 routing note: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-01B-review-routing.md`

## Review Scope - `CF-W1-TP-01B`

Review only the approved Team 06 changed files:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Verify:

- implementation stays within Team 00 / Team 03 reserved file list;
- conditional geometry file usage is justified by legacy target-framed wording asserted by focused tests;
- missing target-shaped fields no longer block paper readiness by themselves;
- target-shaped fields remain compatibility/modelled review geometry only;
- missing DQ, `NOT_READY`, `LIMITED`, `eligibleForSignals=false`, stale blockers, provider/scope blockers, unsupported blockers, and blocked use-case tier evidence prevent trusted paper readiness;
- repository, Prisma, routes, frontend, Today Review, shared utilities/UI, packages, generated files, providers, startup/backfill, paid/cloud, live-provider, broker, and telemetry were not touched;
- product-language scan meaningfully rejects target/advice wording.

Team 06 reported:

- `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand`: passed, 2 suites / 46 tests.
- `npm.cmd run build`: passed.
- product-language scan: no matches.

## Queued Source Handoff - `CF-W1-L3-PORT-01A`

- Requirement: `CF-W1-L3-PORT-01A`
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`
- Handoff path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`
- Team 00 routing note: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-review-routing.md`
- First-pass rejection evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-team10-review-release.md`
- QA gate: Team 04 must rerun QA after Team 07 rework; final acceptance waits for the rerun result.

## Review Scope - `CF-W1-L3-PORT-01A`

Review only the approved Team 07 changed files:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

Verify:

- implementation stays within Team 00 reserved file list;
- DTO additions are additive and preserve existing response compatibility;
- `READY`, `LIMITED`, missing, blocked, stale, unsupported, and scope-mismatch mappings follow the accepted contract;
- `LIMITED` cannot become action-ready;
- `dataStatus = COMPLETE` does not imply Data Quality trust;
- automation-only Data Quality blockers do not block portfolio display/action readiness when daily-review and signal tiers remain `READY`;
- Data Quality Engine is consumed through public service/type outputs only;
- no DQE scoring, stale threshold, liquidity scoring, or coverage scoring is duplicated;
- no forbidden product language or financial-advice wording was introduced;
- tests are meaningful and cover the QA matrix;
- local/free/no-provider constraints are preserved.

## Commands / Evidence

Team 10 may inspect diffs from the worktree. Do not run broad suites unless Team 00 asks. If reviewing command evidence, use Team 07's reported:

- `npm.cmd test -- portfolio-management.service.test.ts --runInBand`: passed, 7 tests.
- `npm.cmd run build`: passed.

Team 04 owns QA rerun/verification.

## Output

Write review result to:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-outbox.md`

Include:

- pass/reject decision;
- findings with file/line references;
- changed-file scope confirmation;
- whether QA evidence is sufficient or pending;
- release risk;
- rollback note;
- whether Architect Signoff can proceed after QA.

## Blockers

No Product Owner decision is open.

Commit/release remains blocked until:

- Team 07 completes the bounded rework;
- Team 04 QA passes;
- Team 10 re-review passes;
- Architect signoff is recorded;
- delegated Product Owner acceptance packet is recorded;
- Team 00 verifies exact staged scope in the Team 07 worktree.

---

# Current Active Assignment Override

Date: 2026-05-18

## Assignment

Review `CF-W1-CAL-01` after Team 04 QA rerun `ACCEPT`.

This final override supersedes older Team 10 queue text above. The CAL workstream is backend-only and uses a dedicated Team 06 worktree. Do not review unrelated Team 07, Trade Plan, or alert work in this pass.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-CAL-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-CAL-01`

## Evidence To Review

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-developer-handoff.md`
- Initial QA reject: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-verification.md`
- QA rerun accept: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-qa-rerun-verification.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- Team 04 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`
- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-CAL-01-signal-calibration-reliability-drift-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-CAL-01-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-CAL-01-work-packet.md`

## Review Scope

Review only the approved Team 06 changed files:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Verify:

- implementation stays within Team 00 / Team 03 reserved file list;
- context-gap evidence downgrades sufficient-sample, non-blocking-DQ calibration readiness to `LIMITED`, not `TRUSTED`;
- hard blockers remain fail-closed: `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`;
- score math and existing response fields are preserved;
- product language remains research-support and avoids direct advice, targets, guarantees, broker behavior, or automation instructions;
- Prisma, routes, frontend, shared utilities/UI, packages, generated files, providers, startup/backfill, paid/cloud, live-provider, broker, and telemetry were not touched.

## Commands / Evidence

Team 10 may inspect diffs from the worktree. Do not run broad suites unless needed. If reviewing command evidence, use Team 04's accepted rerun:

- `npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand`: passed, `29/29`.
- `npm.cmd run build`: passed.

## Allowed Writes

Only in the Team 06 CAL worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-CAL-01-team10-review-release.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-review-release.md`

Do not edit application source/tests. Do not commit.

## Output

Return pass/reject decision, findings with file/line references, changed-file scope confirmation, whether QA evidence is sufficient, release risk, rollback note, and whether Architect Signoff can proceed.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Review `CF-W1-SMI-01` after Team 04 QA `ACCEPT`.

This assignment supersedes older Team 10 tails above. The workstream is backend-only Smart Money Intelligence in a dedicated Team 06 worktree. Do not review unrelated Calibration, Trade Plan, Today Review, Research Hub, or Market Data work in this pass.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-SMI-01`

## Evidence To Review

From the worktree:

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`
- QA evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-qa-verification.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- Team 04 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-SMI-01-qa-outbox.md`

## Review Scope

Review only the approved Team 06 changed files:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Verify:

- additive evidence metadata does not remove or silently redefine existing Smart Money outputs;
- persisted snapshot evidence maps to trusted persisted evidence only when current source proves it;
- on-demand derived evidence remains limited / downstream-unsafe;
- stale, missing, unavailable, and placeholder evidence is represented as limited or unavailable instead of trusted;
- existing ordering and distribution behavior is preserved;
- product language remains research-support and avoids direct advice, target-price, guarantee, broker/action instructions, or automation claims;
- Prisma, routes, frontend, shared utilities/UI, packages, generated files, providers, startup/backfill, paid/cloud, live-provider, broker, and telemetry were not touched.

## Commands / Evidence

Team 10 may inspect diffs from the worktree. Do not run broad suites unless needed. If reviewing command evidence, use Team 04's accepted QA evidence unless you need to rerun:

- `npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand`: passed, `14/14`.
- `npm.cmd run build`: passed.

## Allowed Writes

Only in the Team 06 SMI worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-team10-review-release.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-CF-W1-SMI-01-review-outbox.md`

Do not edit application source/tests. Do not commit.

## Output

Return pass/reject decision, findings with file/line references, changed-file scope confirmation, whether QA evidence is sufficient, release risk, rollback note, and whether Architect Signoff can proceed.

---

# Current Dispatcher Assignment

Date: 2026-05-18

## Assignment

Review `CF-W1-TP-02` after Team 04 QA `ACCEPT`.

This assignment supersedes older Team 10 tails above. The workstream is backend-only Trade Plan Risk Engine in a dedicated Team 06 worktree. Do not review unrelated Calibration, alerts, Today Review, or platform work in this pass.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-TP-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-02`
- Base reference: accepted `CF-W1-TP-01B` commit `8ff22fd`

## Evidence To Review

From the worktree:

- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-developer-handoff.md`
- QA evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-verification.md`
- Team 06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-outbox.md`
- Team 04 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`

From main `dev` workspace if absent in the dependent branch:

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TP-02-trade-plan-exit-invalidation-semantics-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TP-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TP-02-qa-plan.md`

## Review Scope

Review only the approved Team 06 changed files:

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.validation.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

Verify:

- TP-01B Data Quality hard-block behavior is preserved;
- additive `exitConditions[]` and `invalidationConditions[]` semantics are stable and rule-versioned;
- legacy `target` and `invalidationRules` are compatibility outputs only;
- trusted readiness no longer depends on target-shaped fields;
- `targetRewardRisk` validation rejects non-finite and out-of-range values outside inclusive `0.5` to `5.0`;
- product language remains research-support and avoids direct advice, arbitrary target-price, guarantee, broker/action instructions, or automation claims;
- repository, Prisma/schema/migrations, route registries, frontend, Today Review, Strategy Decision, backtesting, shared utilities/UI, package manifests, generated files, provider/live-data, startup/backfill, paid/cloud, broker integration, and telemetry were not touched.

## Commands / Evidence

Team 10 may inspect diffs from the worktree. Do not run broad suites unless needed. If reviewing command evidence, use Team 04's accepted QA evidence:

- `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand`: passed, `2` suites / `51` tests.
- `npm.cmd run build`: passed.

## Allowed Writes

Only in the Team 06 TP-02 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-02-team10-review-release.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-review-release.md`

Do not edit application source/tests. Do not commit.

## Output

Return pass/reject decision, findings with file/line references, changed-file scope confirmation, whether QA evidence is sufficient, release risk, rollback note, and whether Architect Signoff can proceed.

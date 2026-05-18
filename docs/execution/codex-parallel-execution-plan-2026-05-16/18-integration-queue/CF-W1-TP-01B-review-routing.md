# CF-W1-TP-01B Review Routing

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## State

Rejected / Rework after Team 10 Code Review / Release Readiness precheck.

Do not merge, push, or release this work yet.

## Source Worktree

- Requirement: `CF-W1-TP-01B`
- Implementation owner: Team 06 - Strategy / Signal / Risk
- Branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-01B`
- Handoff path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-TP-01B-team06-implementation-handoff.md`
- Evidence path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W1-TP-01B-team06-implementation-evidence-2026-05-18.md`

## Changed Files Reported

- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.geometry.ts`
- `backend/tests/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.test.ts`
- `backend/tests/trade-plan-risk-engine.paper-readiness.test.ts`

The geometry file is allowed only as an optional architecture reservation. Team 10 must confirm its use is justified by legacy target-framed wording asserted by focused tests and does not expand behavior outside modeled review geometry.

## Developer-Reported Validation

- `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand`: passed, 2 suites / 46 tests.
- `npm.cmd run build`: passed.
- Product-language scan for target/profit/recommendation wording: no matches.
- `git diff --check`: passed with line-ending warnings only.

## Review Result

Team 10 rejected release acceptance because the first Team 06 implementation treats any Data Quality blocker containing `blocked` as a hard paper-readiness blocker. Data Quality can include a phase-0 automation blocker in `readinessBlockers` even when otherwise relevant evidence remains usable for non-automation workflows.

Release-blocking issue:

- `AUTOMATION_BLOCKED: PHASE0_AUTOMATION_NOT_AUTHORIZED` can hard-block otherwise trusted Trade Plan paper readiness.
- Team 06 must revise the Trade Plan mapper/classifier so automation-only blockers do not hard-block paper readiness by themselves.
- Team 06 must add a focused regression test with DQE-like automation-only blocker evidence proving it does not alone block `READY_FOR_PAPER_REVIEW` when other required Trade Plan evidence is ready.

Review evidence:

- `18-integration-queue/CF-W1-TP-01B-team10-review-release.md`

## Team 06 Rework Assignment

Team 06 is assigned bounded rework in the existing worktree:

- Agent: `019e3a61-6c87-7e70-b4cd-59cb3883909d`
- Branch: `codex/team06-strategy-signal/CF-W1-TP-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-TP-01B`

## Team 10 Assignment

Team 10 re-review should run only after Team 06 rework and Team 04 QA rerun.

- `16-team-inboxes/TEAM-10-current-assignment.md`

Expected output:

- `17-team-outboxes/TEAM-10-outbox.md`
- optional review evidence under `18-integration-queue/`

## Current Blockers

- Team 06 rework pending.
- Team 04 QA rerun pending.
- Team 10 re-review pending.
- Architect Signoff pending.
- Delegated Product Owner acceptance pending.
- Local commit pending.

No human Product Owner action is required unless review/QA/architecture finds a true consent blocker.

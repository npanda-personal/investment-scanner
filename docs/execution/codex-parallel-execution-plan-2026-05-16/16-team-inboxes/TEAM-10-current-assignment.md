# TEAM-10 Current Assignment

Date: 2026-05-18

Team: TEAM-10 - Review / Release

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-10-review-release.md`

## Assignment

Stand by for Code Review / Release Readiness re-review of `CF-W1-L3-PORT-01A` after Team 07 rework and Team 04 QA rerun.

Team 10 rejected the first handoff because the readiness mapper can treat automation-only Data Quality blockers as portfolio display hard blockers. Review is read-only unless Team 00 later asks for a release evidence doc update. Do not stage, commit, push, or edit application source/tests.

## Source Handoff

- Requirement: `CF-W1-L3-PORT-01A`
- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-PORT-01A`
- Handoff path in worktree: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-developer-handoff.md`
- Team 00 routing note: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-review-routing.md`
- First-pass rejection evidence: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-PORT-01A-team10-review-release.md`
- QA gate: Team 04 must rerun QA after Team 07 rework; final acceptance waits for the rerun result.

## Review Scope

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

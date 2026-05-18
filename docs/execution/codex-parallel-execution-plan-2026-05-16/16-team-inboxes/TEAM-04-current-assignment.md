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

# TEAM-03 Architect Signoff Assignment - CF-W1-BT-02

Date: 2026-05-18

Team: TEAM-03 - Architecture Factory / Architect Signoff

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-03-architecture-factory.md`

## Assignment

Perform Architect Signoff for `CF-W1-BT-02` in the Team 06 worktree after Team 04 QA rerun ACCEPT and Team 10 review ACCEPT.

This is a signoff/review gate, not implementation. Do not edit application source/tests. Do not run providers, services, Prisma commands, live data, package installs, startup/backfill, or broad UI smoke.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-BT-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-02`

## Evidence To Review

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-02-backtesting-outcome-review-traceability-requirement.md`
- Architecture review: `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- Contract: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- Work packet: `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- QA plan: `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`
- Developer handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-developer-handoff.md`
- QA rerun verification: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-qa-rerun-verification.md`
- Team 10 review: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-team10-review-release.md`

Inspect source/tests/docs read-only as needed:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Allowed Writes

Only in the Team 06 worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-02-architect-signoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architect-signoff.md`

## Forbidden Scope

Do not edit application source/tests, Prisma schema or migrations, generated files, route registries, shared backend utilities, shared UI, package manifests, backtesting repository/controller/router/validation/module/index files, Strategy Framework source, Trade Plan source, frontend API/hooks/routes, providers, startup/backfill, live-provider, broker, paid/cloud, telemetry, or credentials.

## Signoff Checks

- Contract and work-packet boundaries were honored.
- Implementation is additive and preserves existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence.
- Review disposition and reason summary are consistent across saved-run list and selected-run detail for the same run.
- `TRUSTED_REVIEW`, `PARTIAL_REVIEW`, `DIAGNOSTIC_ONLY`, `LEGACY_REPAIRED`, and `WITHHELD` semantics remain research-support oriented and do not create advice, target-price, guarantee, broker, or automation wording.
- No simulation math, benchmark math, route contract, shared UI, schema, generated, or cross-module source drift occurred.
- QA rerun evidence covers the prior rejected trusted-review and legacy-invalid UI cases.

## Required Output

Return `ACCEPT` or `REJECT`.

If accepted, Team 00 may proceed to delegated PO acceptance and scoped local branch commit after whitespace/staged-scope verification.

If rejected, include exact blocking findings, file/line references where possible, and whether the fix stays within the existing Team 06 reservation.

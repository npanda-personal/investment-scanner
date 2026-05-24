# TEAM-04 QA Outbox - CF-W2-BT-05 QA Plan

Date: 2026-05-24

Team: Team 04 QA Factory

Mode: docs-only QA planning in main workspace

## Assignment

Prepare the QA plan for `CF-W2-BT-05` as docs-only planning, based on Team 03 architecture prep.

This planning packet is separate from active `TSC-03A` QA verification. No application source, tests, schema, route registries, package manifests, generated files, or non-execution docs were edited.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-BT-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-BT-05-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-BT-05-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-04-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-BT-04-qa-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SIG-01A-qa-plan.md`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-BT-05-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-BT-05-qa-plan-outbox.md`

## QA Verdict

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Team 04 accepts `CF-W2-BT-05` QA planning as complete for Team 00 Ready evaluation.

Conditions carried forward:

- implementation must remain backend-only and no-schema first;
- implementation must stack on accepted `CF-W1-BT-04` commit `2bd794f`;
- implementation must stay inside the four reserved `backtesting-strategy-lab` files;
- implementation must remain separate from active `TSC-03A` QA verification and any other `backtesting-strategy-lab` writer.

## Planned Acceptance Coverage

The QA plan requires future executable validation for:

- registered run with explicit documented exit rule codes;
- registered legacy run with missing rule-code evidence;
- custom-rule run marked unsupported;
- comparable-run freshness using existing saved-run timestamps;
- `TAKE_PROFIT` isolated as simulation assumption only;
- no inferred invalidation from stop loss, trailing stop, max hold, take profit, or free-text reason summaries;
- no target/profit-target/R:R/advice wording in evidence fields, docs, or focused tests.

## Planned Test Commands

Commands documented for future executable QA after implementation exists:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
rg -n "target price|price target|profit target|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|target evidence" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab
```

```powershell
git diff --name-only 2bd794f --
```

## Validation

No builds, tests, servers, Prisma commands, frontend smoke runs, or live-data checks were run.

Validation for this handoff was documentation review and QA planning only.

## Blockers

No Team 04 planning blocker remains.

Future executable QA must stop and return to Team 00 / Architect if:

- Team 06 implementation widens beyond the four reserved backend files;
- the slice cannot be implemented truthfully without repository/persistence/controller/router/frontend changes;
- the worktree is not based on accepted `CF-W1-BT-04` commit `2bd794f`;
- another active writer owns any reserved `backtesting-strategy-lab` file.

## Next Gate

- Next owner: `Team 00 Orchestrator` for Ready evaluation
- Recommended future implementation owner after promotion: `Team 06 Strategy / Signal / Risk`
- Team 04 status after this handoff: ready to pick up new QA planning or verification work that does not overlap active reserved files

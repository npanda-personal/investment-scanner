# Team 04 CF-W1-BT-01A QA Outbox

Date: 2026-05-18

## Work Item

`CF-W1-BT-01A` backtesting DQ fail-closed characterization.

## State / Mode

Completed - docs-only QA planning.

## Verdict

QA-PLAN READY

The QA plan is ready for Team 00 Ready evaluation as a bounded characterization-only packet. Execution is not blocked by QA planning, but any future implementation must be sequenced behind the accepted parked `CF-W1-BT-02` branch state because both children touch the same `backtesting-strategy-lab` test/doc files.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 2
- Module: `backtesting-strategy-lab`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-BT-01A-qa-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-BT-01A-architecture-outbox.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-04-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-STRAT-02B-proposal-review-outbox.md`
- `git status --short`

## Exact Evidence

- Current source still bypasses DQ filtering entirely when `useDataQualityFilter` is false or absent (`backtesting-strategy-lab.service.ts:534`).
- Current enabled DQ defaults remain descriptive, not fail-closed: `includeLimited: !config.excludeNotReady`, `excludeNotReady: config.excludeNotReady ?? true`, `excludeMissingQuality: config.excludeMissingQuality ?? false`, and `missingQualityBehavior: config.excludeMissingQuality ? 'SKIP' : 'WARN_AND_PROCESS'` (`backtesting-strategy-lab.service.ts:547-551`).
- Current registered-history outcome mapping is already explicit: `INSUFFICIENT_HISTORY` when no instrument has enough history and `PARTIAL` when mixed sufficient and insufficient/missing history exists (`backtesting-strategy-lab.service.ts:494-495`).
- Current warning strings already use research-support framing for data-coverage and realism warnings rather than direct trading instructions (`backtesting-strategy-lab.service.ts:177-179`, `687-692`).
- Module docs already state that the DQ filter is disabled by default and document the relevant DQ metadata fields and availability states (`backtesting-strategy-lab.md:126-140`, `180`).
- Existing service tests currently cover one enabled DQ metadata path and one insufficient-history path, but they do not yet characterize the fail-open baseline, the default `WARN_AND_PROCESS` missing-quality path, caller-allowed limited readiness, or mixed-history `PARTIAL` (`backtesting-strategy-lab.service.test.ts:332`, `485`).
- Team 03 architecture and work-packet docs both record that accepted parked `CF-W1-BT-02` work already exists outside `dev` and must be sequenced ahead of this child because both touch the same backtesting test/doc files (`CF-W1-BT-01A-architecture-review.md:111-114`, `CF-W1-BT-01A-work-packet.md:94`, `126`).
- `git status --short` showed one unrelated existing modification in `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`; it was not edited.

## Behavior / Contract Assessment

- Confirmed the packet remains characterization-only and does not authorize a source-behavior fail-closed change.
- Confirmed the QA plan stays within the exact future writer set already reserved by Team 03:
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- Confirmed the acceptance focus is limited to:
  - fail-open baseline when DQ filtering is disabled
  - default `WARN_AND_PROCESS` missing-quality behavior
  - caller-allowed limited readiness
  - registered `INSUFFICIENT_HISTORY` and mixed-history `PARTIAL`
  - research-support warning wording
- Confirmed the QA plan explicitly rejects widening into simulation rewrite, route/schema/frontend/shared-file work, BT-02 review-disposition work, or any source-level fail-closed policy change.

## Tests Run

None.

## Tests Skipped

- All executable checks were skipped because this assignment was docs-only QA planning and did not authorize tests, builds, services, UI smoke, Prisma commands, or provider/live-data validation.

## Risks / Assumptions

- Sequencing risk: `CF-W1-BT-02` already has accepted parked work outside `dev`; Team 00 must preserve a single writer for the shared backtesting test/doc files.
- Assumption: the current `dev` service/test/module-doc lines inspected remain the authoritative baseline for future characterization assertions.
- Risk: a future implementer may try to convert characterization into a service policy change. The QA plan now names that as an immediate reject condition.

## Blockers

No blocker to QA-plan readiness.

Execution constraint only: future implementation must be sequenced behind accepted parked `CF-W1-BT-02` or stacked into one dedicated backtesting writer worktree.

## Next Gate

Team 00 Ready evaluation and sequencing decision.

## Evidence Notes

Primary evidence is recorded in `04-qa/CF-W1-BT-01A-qa-plan.md`.

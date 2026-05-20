# CF-W1-L3-DQ-01A QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Work Item

`CF-W1-L3-DQ-01A` - Lane 3 passive readiness DTO contract gate.

## QA Status

QA-READY for Team 00 contract acknowledgement and downstream routing.

This is a docs-only contract gate. It validates the accepted passive readiness semantics from `CF-W1-L3-PORT-01A` and `CF-W1-L3-PORT-01B`. It does not authorize application-code edits, executable QA, route changes, Prisma/schema changes, shared-file changes, frontend work, or package changes.

## Contract Gate Summary

`CF-W1-L3-DQ-01A` freezes the passive display contract that Lane 3 consumers must honor before any downstream reliability or traceability work is promoted.

The contract must keep these distinctions intact:

- `displayStatus = READY | LIMITED | BLOCKED`
- `actionStatus = READY | BLOCKED`
- `LIMITED` is visible passive context only
- missing, stale, unsupported, scope-mismatched, `NOT_READY`, `UNUSABLE`, and other hard-block states fail closed
- `lastEvaluatedAt` remains the acceptable freshness evidence in this child
- no new `latestTrustedDataDate` field is introduced here

The child remains contract-only. It does not reopen passive DTO implementation files, create shared DTO abstractions, or duplicate Data Quality Engine scoring and threshold logic.

## Evidence Read

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01A-lane-3-passive-readiness-dto-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01A-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01B-portfolio-intelligence-reliability-gate-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-INTEL-02-portfolio-intelligence-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-INTEL-02-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-WATCH-01-qa-plan.md`

## Contract-Level Validation Expectations

When Team 00 later promotes a real implementation handoff, validation must prove the frozen passive contract still matches the accepted portfolio and watchlist baselines:

1. `LIMITED` is present only as passive display context.
2. `LIMITED` never becomes trusted or action-ready.
3. Missing DQ evaluation, stale evidence, unsupported scope, scope mismatch, `NOT_READY`, and `UNUSABLE` states fail closed.
4. Summary roll-up precedence remains `BLOCKED` first, then `LIMITED`, then `READY`.
5. `lastEvaluatedAt` is the freshness evidence used by this child; no new trusted-date field is invented here.
6. Existing passive response fields remain backward-compatible.
7. No shared DTO file, repository import, or duplicated DQE scoring path is introduced.
8. No alert, watchlist-actionability, or portfolio-intelligence reliability label logic is reopened in this child.

## Evidence Required From Later Executable QA

If a future implementation packet touches the passive DTO surfaces, Team 00 should require:

- ancestry or base confirmation for accepted `f1432e6` and `a2edfb6` before any executable validation;
- exact changed-file list proving the writer set stayed inside the reserved module files;
- focused backend tests for the touched passive contract file set;
- backend build result;
- boundary scan proving no `DataQualityEngineRepository`, shared DTO, route registry, Prisma/schema, frontend, package, provider, live-data, or telemetry changes;
- scenario evidence for ready, limited, missing, stale, unsupported, scope-mismatched, and blocked display states;
- explicit proof that `LIMITED` remains passive-only and that `lastEvaluatedAt` is the only accepted passive freshness evidence in this child.

## Downstream Tests Team 00 Should Require

For `CF-W1-L3-DQ-01B`, Team 00 should require a backend-only `portfolio-intelligence` validation set that proves:

- trusted, limited, diagnostic-only, and blocked review states;
- readiness evidence is consumed through the public `PortfolioManagementService` boundary only;
- missing readiness fails closed;
- `LIMITED` downgrades or blocks reliability claims;
- no DQE repository import or duplicate scoring logic;
- existing `portfolio-intelligence` response fields remain backward-compatible;
- no watchlist dependency is introduced.

Recommended commands for that child after implementation handoff:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
npm.cmd run build
```

For `CF-W1-L3-INTEL-02`, Team 00 should require a dedicated QA refresh that proves:

- reliable, limited, diagnostic-only, and blocked review traceability states;
- source-module and blocker propagation where available;
- no trust is inferred from `dataStatus = COMPLETE` alone;
- existing review response fields remain backward-compatible;
- no DQE repository import, no watchlist dependency, and no route/shared/schema widening.

Recommended commands for that child after implementation handoff:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Do not require route tests for either child unless Team 00 explicitly widens the packet into controller or router work. That would be a new scope decision, not this contract.

## Blockers

- This plan is docs-only and does not authorize executable QA.
- `CF-W1-L3-DQ-01A` must remain a contract gate, not a fresh implementation packet.
- Any attempt to reopen passive DTO implementation files under this child should return to Team 00 / Architecture.
- `CF-W1-L3-INTEL-02` remains behind active `CF-W1-L3-WATCH-01` in Team 00 sequencing and still needs its own QA refresh before Ready evaluation.
- `CF-W1-L3-DQ-01B` can be routed to Team 03 architecture only as a backend-only portfolio-intelligence reliability-gate child after this contract is acknowledged.

## Routing Decision

Yes, `CF-W1-L3-DQ-01B` can be routed to Team 03 architecture.

Route it as a backend-only, module-local `portfolio-intelligence` reliability-gate packet that consumes accepted passive readiness semantics and does not reopen portfolio-management display contracts or watchlist behavior.

`CF-W1-L3-INTEL-02` should remain queued behind the active Lane 3 ordering and should not be treated as a fresh implementation packet until Team 00 resolves its own QA refresh and one-writer sequencing.

## Next Gate

Team 00 contract acknowledgement, then Team 03 architecture routing for `CF-W1-L3-DQ-01B`.

## Tests Run

None.

This is a docs-only QA planning pass. No application code, tests, builds, browser checks, providers, Prisma commands, or live data validation were run.

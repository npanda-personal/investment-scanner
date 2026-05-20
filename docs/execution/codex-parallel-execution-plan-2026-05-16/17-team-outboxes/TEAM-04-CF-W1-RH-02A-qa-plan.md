# Team 04 Outbox - CF-W1-RH-02A QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

## Assignment

Prepare QA plan for `CF-W1-RH-02A` after Team 03 READY-CANDIDATE architecture refresh, without implementing code.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-RH-02A-qa-plan.md`

No application code, tests, routes, schema, packages, providers, startup/backfill, or shared UI/utilities were changed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-02A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-02A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-architecture-factory.md`
- accepted `CF-W1-RH-01` commit `fd88c62`
- `fd88c62` QA evidence and delegated PO acceptance packet
- current Research Hub backend service/types/docs/tests
- current Research Hub frontend API/page/UI smoke

## QA Plan Result

QA-READY.

Required QA coverage is now recorded for:

- unavailable comparison basis;
- empty `newTradeCandidates` and `downgradedCandidates`, plus `marketGateChange = null`, when basis is unavailable;
- no Today Review surrogate comparison basis;
- no current `tradeCandidates` self-comparison basis;
- removal of unavailable-basis `since the last evaluation` copy;
- research-support language;
- focused backend Research Hub service tests;
- existing Research Hub UI smoke.

## Required Commands / Evidence After Implementation

```powershell
cd backend
npm.cmd test -- --runInBand --runTestsByPath tests/modules/research-hub/research-hub.service.test.ts
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
rg -n "since the last evaluation|buy now|sell now|must buy|must sell|price target|profit target|guaranteed|execute|order|broker" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

Later QA evidence must include exact changed files, command results, UI smoke evidence that unavailable-basis copy is visible, proof the old temporal copy is gone, and explicit confirmation that `RH-01` behavior from `fd88c62` remains preserved.

## Blockers

- Implementation must stack on accepted `CF-W1-RH-01` commit `fd88c62` or on a `dev` head containing it.
- Current `dev` does not contain `fd88c62`; QA planning verified `fd88c62 is NOT ancestor of HEAD`.
- Do not run in parallel with another Research Hub writer.
- Reject any implementation touching routes, schema, shared UI/utilities, packages, providers/live/startup/backfill, upstream module source/tests, durable history/storage, or broad UI redesign.

## Ready-Promotion Recommendation

Recommend Team 00 promote `CF-W1-RH-02A` only after recording:

- stacked base on `fd88c62` or a `dev` head containing it;
- exact allowed Research Hub backend/frontend/test/doc file reservations;
- no active parallel Research Hub writer;
- no forbidden scope.

Do not commit or push from this QA-planning task.

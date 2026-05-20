# Team 04 Outbox - CF-W1-RH-03 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

## Assignment

Prepare QA plan for `CF-W1-RH-03` after Team 03 architecture/contract/work-packet handoff, without implementing code.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-03-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-RH-03-qa-plan.md`

No application code, tests, routes, schema, packages, providers, startup/backfill, or shared UI/utilities were changed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-03-research-hub-explainability-trust-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-03-research-hub-explainability-trust-labels-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-02A-qa-plan.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## QA Plan Result

QA-READY.

Required QA coverage is now recorded for:

- explicit next-action provenance without route-substring inference;
- raw signal counts present while trust labels remain conservative;
- honest local-availability versus trusted-readiness wording for `dataReadiness`;
- unavailable-basis What Changed copy with removal of `since the last evaluation`;
- research-support language only;
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
rg -n "since the last evaluation|buy now|sell now|must buy|must sell|price target|profit target|guaranteed|execute|order|broker" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

Later QA evidence must include exact changed files, command results, UI smoke evidence that unavailable-basis copy is visible, proof that the stale temporal copy is gone, and explicit confirmation that `RH-02A` and `RH-01` behavior remain preserved.

## Blockers

- Implementation must stack on accepted `CF-W1-RH-02A` commit `f391a6d`, which already contains accepted `CF-W1-RH-01` commit `fd88c62`.
- Do not run in parallel with another Research Hub writer.
- Reject any implementation touching routes, schema, shared UI/utilities, packages, providers/live/startup/backfill, upstream module source/tests, durable history/storage, or broad UI redesign.

These are implementation blockers only. They do not block Team 00 from evaluating `RH-03` for Ready promotion.

## Ready-Promotion Recommendation

Recommend Team 00 evaluate `CF-W1-RH-03` for Ready promotion now, using:

- stacked base `f391a6d`
- exact allowed Research Hub backend/frontend/test/doc file reservations
- one writer for the shared Research Hub file set
- no durable storage widening

Do not commit or push from this QA-planning task.

# Team 04 Outbox - CF-W1-RH-01A QA Plan

Date: 2026-05-26

Owner: Team 04 QA Factory

## Assignment

Prepare a docs-only QA plan for `CF-W1-RH-01A Research Hub evidence-date/actionability gap`, using root `AGENTS.md` as authoritative and keeping scope inside the active execution folder only.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-RH-01A-qa-plan-outbox.md`

No application code, tests, routes, schema, packages, shared UI, shared backend utilities, or provider/live-data files were changed.

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01A-research-hub-evidence-date-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01A-research-hub-actionability-evidence-date-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-RH-01-qa-plan.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/tests/ui/research-hub.spec.ts`

## QA Plan Result

`QA-PLAN READY`

Recorded QA coverage includes:

- per-dimension truthful evidence-date mapping only from allowed public reads
- strict null preservation for `dataReadiness`, `strategyProof`, and `calibrationReadiness`
- visible UI rendering when a date exists and no fallback rendering when it does not
- conservative status preservation when a date exists
- exact rejection conditions for timestamp fabrication, scope widening, and language drift
- focused backend/frontend command set for later execution

## Required Commands Later

```powershell
cd backend
npm.cmd run build
```

```powershell
cd backend
npm.cmd test -- research-hub --runInBand
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Optional wording scan after implementation:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|reward/risk|risk:reward|R:R|guaranteed|broker|order|execute|automation" backend/src/modules/research-hub backend/tests/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts
```

## Team 00 Recommendation

Team 00 can promote `CF-W1-RH-01A` after this QA-planning pass, provided it records:

- the exact five-file implementation/test reservation from the work packet
- no parallel Research Hub writer on overlapping `RH-*` files
- no widening into routes, shared UI, schema, package, upstream-module, or calibration-basis scope

## Tests Run

- none

## Tests Skipped

- backend build
- backend Research Hub tests
- frontend build
- frontend Research Hub UI smoke

## Skipped-Test Reason

Docs-only QA planning task with no implementation handoff and no permission to modify app code or run release-gate verification.

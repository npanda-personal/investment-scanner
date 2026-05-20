# TEAM-07 Assignment - CF-W1-L3-TREV-02

Date: 2026-05-20

Owner: Team 07 - Portfolio / Watchlist / Alerts

Assigned by: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W1-L3-TREV-02` - Today Review candidate snapshot provenance.

## State

Ready for bounded implementation.

## Branch / Worktree

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team07-CF-W1-L3-TREV-02`
- Base commit: `e0673c3 feat: add today review publication evidence`

Team 00 sequencing decision:

- `TREV-02` must stack on accepted `CF-W1-L3-TREV-01` commit `e0673c3`.
- Do not implement from plain `dev` because `dev` does not contain the accepted Today Review publication-evidence base yet.
- Do not run in parallel with any other Today Review writer.

## Required Inputs

- Requirement: `10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-TREV-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-TREV-02-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-TREV-02-qa-plan.md`

If these docs are not present in the branch worktree, read them from the main control workspace:

`C:\work\repo\investment-scanner\docs\execution\codex-parallel-execution-plan-2026-05-16\`

## Allowed Implementation Files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- exact new focused compatibility-read test only if needed: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Allowed Branch-Local Evidence Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-07-CF-W1-L3-TREV-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-L3-TREV-02-developer-handoff.md`

## Required Behavior

- Normalize stored candidate provenance on the Today Review read path without recomputing upstream modules.
- Expose additive provenance rows for data quality, market context, strategy proof, trade plan, raw signal, signal calibration, smart money, and Today Review Lite setup when current stored snapshots can support them.
- Show source module, status, timestamp, timing-source label, candidate publication timestamp, and compatibility label where applicable.
- Make partial, legacy-shaped, unavailable, or unknown-timing evidence explicit.
- Keep blockers, watch reasons, and promotion reasons consistent with the same stored provenance chain.
- Replace coarse candidate-detail support booleans with provenance rows on `TodayReviewCandidateDetailPage`.
- Preserve read-only research-support language.

## Forbidden Scope

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/src/features/today-trade-review/routes.tsx`
- `frontend/src/features/today-trade-review/index.ts`
- upstream Market Data, Data Quality, Market Context, Strategy Decision, Trade Plan, Signal Generation, Calibration, and Smart Money source/test files
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data/startup/backfill files
- paid/cloud/broker/telemetry files
- broad Today Review UI redesign
- Trade Plan target/geometry wording cleanup
- Strategy Decision semantics rewrite

## Required Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

If no repository test is added, run the focused service suite and document why repository compatibility is covered without a new file.

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Also run a copy scan for changed provenance/detail wording to reject target-like, direct-advice, broker, execution, automation, or guaranteed-outcome language.

## Handoff Required

Write:

- `17-team-outboxes/TEAM-07-CF-W1-L3-TREV-02-outbox.md`
- `18-integration-queue/CF-W1-L3-TREV-02-developer-handoff.md`

Include:

- exact files changed
- exact files inspected
- behavior changed
- tests run and output summary
- UI smoke result or blocker
- copy scan result
- confirmation that `TREV-01` publication-evidence behavior remains preserved
- skipped checks and reasons
- next gate: Team 04 QA verification

## Product Owner Action

Not required.

No open Decision Inbox item blocks this bounded child.

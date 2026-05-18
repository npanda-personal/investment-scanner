# TEAM-07 Current Assignment

Date: 2026-05-18

Team: TEAM-07 - Portfolio / Watchlist / Alerts

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-07-portfolio-watchlist-alerts.md`

## Assignment

Pull `CF-W1-L3-TREV-01` for bounded implementation.

State: Ready for Implementation after Team 00 promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace and accepted implementation branches are still parked in separate worktrees. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-TREV-01`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-TREV-01`
- Base: current local `dev` after the Team 00 Ready-promotion docs update.

Record the branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-07-outbox.md`.

## Work Item

`CF-W1-L3-TREV-01` - Today Review publication evidence and readiness-coherence normalization.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-TREV-01-qa-plan.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Optional only if repository legacy-read-path synthesis is added:

- `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- backend or frontend route registries
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- providers, startup/backfill, live-provider, Angel One, broker, paid/cloud, telemetry, or automation flows

Do not run providers, startup/backfill flows, live provider calls, Prisma migrations, package installs, broad services, or unrelated UI smoke tests for this slice.

## Implementation Requirements

- Add stable additive `publicationEvidence` metadata to the Today Review run `sourceSnapshot`.
- Persist that metadata for new runs without schema, route, controller, router, validation, or provider changes.
- Synthesize equivalent publication evidence on read for legacy runs that lack the field.
- Make the Today Review page prefer normalized publication evidence while preserving existing additive snapshot fields.
- Keep `NO_REVIEW`, `LIMITED_REVIEW`, `FULL_REVIEW`, and configured-partial behavior explicitly distinguishable.
- Map `NO_REVIEW` and membership-load failure to suppression evidence.
- Map `LIMITED_REVIEW` and configured partial scans to limited-publication evidence with research-support wording.
- Preserve outside-trusted-universe Strategy Decision exclusion from all candidate sections.
- Keep candidate detail as read-only research support and do not add a candidate-detail run-evidence contract in this slice.
- Preserve existing Today Review routes and response compatibility.
- Do not recalculate Market Data readiness, trusted-universe health, strategy math, Data Quality scoring, or Trade Plan semantics inside Today Review.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

If repository legacy-read-path synthesis is implemented, also run:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

If frontend files are edited, also run:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
npm.cmd run build
```

Run backend build after backend changes:

```powershell
cd backend
npm.cmd run build
```

If any focused command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- Prisma or migration changes
- route, controller, router, or validation changes
- Market Data Foundation, Data Quality Engine, Strategy Decision Engine, or Trade Plan source/test changes
- shared DTO/helper files or shared frontend components
- package, generated-file, provider, startup/backfill, live-provider, paid/cloud, telemetry, or broker scope
- candidate-detail run-evidence expansion
- publishing Strategy Decision entries outside the trusted snapshot
- advice-like labels, target-price framing, automation authorization, or trade-instruction wording
- editing a file outside the allowed list

## Expected Outbox

Update `17-team-outboxes/TEAM-07-outbox.md` with:

- exact branch/worktree used
- starting commit
- exact files changed
- exact files inspected
- behavior changed
- tests run and results
- tests skipped and reasons
- forbidden files confirmed untouched
- assumptions, risks, blockers
- next gate: Developer Validation, Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, or Team 00 blocker routing

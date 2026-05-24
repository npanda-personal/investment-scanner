# CF-W1-TSC-01 - Trusted Signal Candidate Workflow Work Packet

Date: 2026-05-24

Owner: Team 00 - Orchestrator / Integration

Status: Work Packet Draft - First Child Ready For Architecture And QA Prep

## Objective

Prepare a bounded first implementation slice that evolves `/today-review` toward Trusted Signal Candidates without adding Trade Plan, R:R, or arbitrary target-price behavior.

## First Slice Direction

Preferred first child:

`CF-W1-TSC-01A - Today Review trusted signal candidate adoption`

Expected behavior:

- add Trusted Candidate grouping to Today Review;
- show candidate counts for highly trusted, needs review, watch only, and blocked;
- show entry trigger price and reason summary;
- show evidence-backed health state;
- show exit/invalidation rule status only when source-proven;
- downgrade or block candidates with missing required evidence;
- hide or avoid R:R, arbitrary target, and Trade Plan-first wording.

## Future File Reservation Candidate

Do not treat this as an active reservation until Team 00 promotes a child.

Candidate source/test files:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Scope

- Prisma schema or migrations.
- Route registry changes.
- Shared backend utility changes.
- Shared UI changes.
- Package manifest changes.
- Generated/common fixture changes.
- Provider/live calls.
- Startup/backfill changes.
- Trade Plan source edits unless a separate approved child reframes them.
- Target-price, R:R, synthetic target, or advice-like behavior.

## Readiness Gaps Before Implementation

- `CF-W1-SIG-TRIGGER-ENTRY-01` is accepted and locally committed as `649e645`, so the upstream Signal Generation trigger-evidence gap is no longer the blocker.
- Today Review still needs an architecture-approved adoption path for source-proven trigger evidence before it can classify `HIGHLY_TRUSTED` candidates.
- Team 00 must not promote a `HIGHLY_TRUSTED` candidate workflow until Team 03 confirms the Today Review adoption path and exact file reservations.
- Team 00 must sequence against accepted `CF-W1-L3-TREV-02` branch commit `f1de1d5`.
- Team 00 must decide whether this child stacks on `CF-W1-L3-TREV-02` or waits for branch integration.

## Next Gate

Team 00 should route `CF-W1-TSC-01A` to Team 03 architecture/file-reservation prep and Team 04 QA planning. Implementation remains blocked until those gates pass and Team 00 promotes the child to Ready.

# CF-W1-L3-TREV-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Today Review publication-evidence architecture packet prepared. Not Ready for Implementation.

This slice is source-supported as a module-local Today Review vertical packet. It can stay inside the `today-trade-review` backend module, the `today-trade-review` frontend feature, module docs, and focused module/UI tests without Prisma, route, provider, shared utility, shared UI, package, or generated-file approval.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/refinement-queue.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`
- `03-architecture/module-ownership-map.md`
- `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`

## Current Source Findings

- `today-trade-review.service.ts` already snapshots `reviewReadiness`, `reviewUniverse`, and `scanFunnel`, treats `review-readiness-summary` as authoritative when present, records membership-load failures, and excludes Strategy Decision candidates outside the trusted snapshot.
- `today-trade-review.service.test.ts` already covers core `FULL_REVIEW`, `LIMITED_REVIEW`, `NO_REVIEW`, configured-partial, membership-failure, and outside-trusted-universe exclusion paths.
- `TodayReviewPage.tsx` already renders missing-readiness and mode-mismatch alerts, target/required/stored data-through values, trusted membership load status, scan completeness, and outside-trusted-universe exclusions.
- `today-trade-review.repository.ts` currently synthesizes legacy run explainability on read, but it does not synthesize or normalize a single publication-evidence object for legacy or mismatched runs.
- `TodayReviewCandidateDetailPage.tsx` already keeps the candidate surface research-support only and explicitly treats Data Quality tiers as read-only context. It does not currently show run-level publication evidence.

## Module Boundary Review

`today-trade-review` owns this requirement.

Reasons:

- publication/suppression evidence is derived from Today Review's own run snapshot and trusted-universe filtering behavior;
- Market Data Foundation remains the upstream evidence producer through public `reviewReadinessSummary`, `trustedReviewUniverseHealth`, and trusted-universe instrument-list contracts;
- no other module should duplicate Today Review publication reasoning or reconstruct trusted-membership exclusion logic.

This first slice is safe as a module-local vertical packet:

- backend owner: `backend/src/modules/today-trade-review`
- frontend owner: `frontend/src/features/today-trade-review`
- focused UI verification: `frontend/tests/ui/today-trade-review.spec.ts`

No shared DTO, Prisma schema, route registry, provider, package, generated-file, or shared UI change is required for the first slice.

## Architecture Decision

Prepare `CF-W1-L3-TREV-01` as a bounded Today Review publication-evidence packet that formalizes one additive `publicationEvidence` object on the run `sourceSnapshot`, persists it on new runs, and synthesizes it for legacy runs on read.

Recommended additive shape:

```ts
type TodayReviewPublicationOutcome =
  | 'PUBLISHED'
  | 'LIMITED_PUBLICATION'
  | 'SUPPRESSED';

type TodayReviewReviewModeSource =
  | 'MARKET_DATA_SUMMARY'
  | 'TRUSTED_REVIEW_UNIVERSE'
  | 'CONSERVATIVE_FALLBACK';

type TodayReviewReadinessSnapshotState =
  | 'PRESENT'
  | 'MISSING'
  | 'MISMATCH';

interface TodayReviewPublicationEvidence {
  reviewMode: TodayReviewUniverseMode;
  reviewModeSource: TodayReviewReviewModeSource;
  publicationOutcome: TodayReviewPublicationOutcome;
  outcomeReason: string;
  readinessSnapshotState: TodayReviewReadinessSnapshotState;
  readinessReason: string | null;
  requiredDataThroughDate: string | null;
  storedDataThroughDate: string | null;
  trustedUniverseAvailable: boolean;
  scanComplete: boolean;
  trustedLoadStatus: TodayReviewTrustedLoadStatus;
  membershipLoadFailureReason: string | null;
  outsideTrustedUniverseExcluded: number;
}
```

The exact type names may differ, but the semantics must stay stable.

Required mapping rules for the first slice:

- `MARKET_DATA_SUMMARY` wins when `reviewReadiness.reviewMode` exists.
- `TRUSTED_REVIEW_UNIVERSE` is used only when the Market Data summary snapshot is absent.
- `CONSERVATIVE_FALLBACK` is used only when neither authoritative source is available, and the run must be explained conservatively.
- `SUPPRESSED` is required when `NO_REVIEW` or membership-load failure prevents candidate publication.
- `LIMITED_PUBLICATION` is required for `LIMITED_REVIEW` and configured-partial scans.
- `PUBLISHED` is allowed only for `FULL_REVIEW` or a clearly explained `LIMITED_REVIEW` run that still published candidates under bounded research-support conditions.
- legacy rows that lack `publicationEvidence` must be explained on read without Prisma backfill or schema change.

## Candidate Detail Constraint

Do not widen the first slice into run-level candidate-detail publication evidence.

Reason:

- the candidate endpoint currently returns only candidate-row snapshots;
- adding run-level publication evidence to the candidate API would widen the first slice into additional repository/detail-response shaping that is not required to satisfy the run/publication-evidence gap;
- the requirement that candidate detail remain read-only research support can be enforced as a regression expectation in the existing UI spec.

If Team 00 later wants a dedicated candidate-detail review-evidence panel, that should be a separate child packet.

## Exact Future File Reservations

- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- optional new focused legacy-read-path test only if repository synthesis is added: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
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
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider, live-market, paid/cloud, telemetry, broker, or automation flows

## Dependency And Conflict Notes

- This packet depends only on already exposed Market Data Foundation public Today Review readiness contracts.
- The first slice must not recalculate Market Data readiness or trusted-universe health inside Today Review.
- The first slice must not alter candidate ranking, strategy math, Data Quality scoring, Trade Plan geometry, or route behavior.
- The packet conflicts with any concurrent writer on `today-trade-review.service.ts`, `today-trade-review.repository.ts`, `today-trade-review.types.ts`, `TodayReviewPage.tsx`, or `today-trade-review.spec.ts`.

## Required QA Scenarios

Focused QA planning should cover:

- full-review run publishes candidates and records `publicationEvidence` as trusted publication;
- limited-review run records downgrade/limited-publication evidence without advice-like wording;
- no-review run records suppression evidence and membership failure reason;
- configured-partial run records partial-scan evidence without treating it as load failure;
- legacy or mocked mismatch run shows explicit mismatch evidence on the Today Review page;
- legacy or mocked missing-readiness run shows conservative fallback evidence on the Today Review page;
- outside-trusted-universe Strategy Decision entries remain excluded from all candidate sections;
- candidate detail remains read-only research support and does not drift into advice or automation wording.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

This slice is bounded and module-local, but it still needs a Team 04 QA plan and Team 00 Ready evaluation. Team 03 does not move it to Ready.

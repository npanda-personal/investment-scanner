# CF-W1-L3-TREV-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Today Review candidate snapshot provenance packet prepared.

Readiness result: `Ready candidate`.

This is readiness for Team 04 QA planning and Team 00 Ready evaluation only. It is not implementation approval.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-TREV-01-today-review-publication-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-TREV-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current Source Findings

- `today-trade-review.types.ts` already stores the owned candidate snapshots, `createdAt`, `updatedAt`, and reason-level `sourceModule` plus optional `evidenceDate`.
- `today-trade-review.service.ts` already emits richer provenance for fresh candidates than the detail page currently shows. It fills `generatedAt`, `lastEvaluatedAt`, `latestPriceDate`, and reason `evidenceDate` where current upstream snapshots already expose them.
- The same service also persists partial or legacy-shaped candidate snapshots today:
  - lite `strategyProofSnapshot` has no timestamp;
  - lite `sourceSignalSnapshot` only has setup metadata;
  - calibration and smart-money support inside `sourceSignalSnapshot` have no stored timestamp;
  - market-context and data-quality timestamps come from different field names.
- `today-trade-review.repository.ts` rebuilds candidate explainability on read, but the compatibility path flattens provenance: `evidenceDate` becomes `null`, source mapping becomes heuristic, and the detail endpoint has no normalized snapshot-provenance object.
- `TodayReviewCandidateDetailPage.tsx` still renders broad support-field booleans such as `Readiness evidence`, `Strategy proof evidence`, and `Trade-plan proof-chain` as `Available / Unavailable`, which hides module ownership, timing source, and compatibility fallbacks.
- `frontend/tests/ui/today-trade-review.spec.ts` covers candidate detail panels and reason categories, but it does not yet prove source-dated provenance rows, compatibility-only labels, or publication-time fallback labeling.

## Module Boundary Review

`today-trade-review` owns this child.

Reasons:

- the candidate detail surface is a read of Today Review persisted candidate snapshots, not a live recomputation of upstream services;
- the provenance gap exists in Today Review's own read model and detail presentation;
- upstream modules should remain evidence producers only through the snapshot fields already stored by Today Review.

No Prisma, route, provider, shared utility, shared UI, package, or generated-file change is required for the first child.

## Smallest Bounded First Child

The smallest bounded first child is the full `CF-W1-L3-TREV-02` packet:

- normalize candidate-level snapshot provenance on the Today Review read path;
- expose additive provenance metadata on the candidate DTO/explainability shape;
- replace detail-page `Available / Unavailable` support flags with explicit source-module, timing, and compatibility labels;
- keep run/list surfaces, broad UI redesign, and target-language cleanup out of scope.

This child stays inside the Today Review module and feature. It does not require a further `02A/02B` split unless Team 00 later asks for durable storage redesign or broader cross-module adoption.

## Architecture Decision

Add one additive candidate-detail provenance surface, preferably under `TodayReviewCandidateExplainability`, with equivalent semantics to:

```ts
type TodayReviewCandidateEvidenceKey =
  | 'dataQuality'
  | 'marketContext'
  | 'strategyProof'
  | 'tradePlan'
  | 'rawSignal'
  | 'signalCalibration'
  | 'smartMoney'
  | 'todayReviewLiteSetup';

type TodayReviewCandidateEvidenceStatus =
  | 'PRESENT'
  | 'PARTIAL'
  | 'LEGACY_SHAPE'
  | 'UNAVAILABLE';

type TodayReviewCandidateEvidenceTimeSource =
  | 'UNDERLYING_EVIDENCE'
  | 'SNAPSHOT_GENERATED_AT'
  | 'CANDIDATE_CREATED_AT'
  | 'CANDIDATE_UPDATED_AT'
  | 'UNKNOWN';

interface TodayReviewCandidateEvidenceProvenance {
  key: TodayReviewCandidateEvidenceKey;
  label: string;
  sourceModule: string;
  status: TodayReviewCandidateEvidenceStatus;
  evidenceTimestamp: string | null;
  timeSource: TodayReviewCandidateEvidenceTimeSource;
  candidatePublishedAt: string | null;
  compatibilityLabel: string | null;
}
```

The exact names may differ, but the semantics must stay stable.

Recommended normalization rules:

- `dataQuality`:
  - source module `Data Quality Engine`;
  - prefer `lastEvaluatedAt`;
  - if only `latestPriceDate` or lite-only fields exist, mark `LEGACY_SHAPE` and explain the fallback.
- `marketContext`:
  - source module `Market Context Intelligence`;
  - prefer `updatedAt`;
  - if only compatibility fields exist, fall back conservatively and label the fallback.
- `strategyProof`:
  - source module `Strategy Framework` for framework-backed strategy candidates;
  - source module `Today Review Lite` for lite historical-evidence snapshots;
  - prefer `generatedAt`;
  - if a lite proof has no timestamp, use candidate publication time with a compatibility label.
- `tradePlan`:
  - source module `Trade Plan Risk Engine`;
  - prefer `generatedAt`;
  - if absent, use candidate publication time with a compatibility label.
- `rawSignal`, `signalCalibration`, `smartMoney`, `todayReviewLiteSetup`:
  - normalize the current mixed `sourceSignalSnapshot` substructures into separate provenance rows for the detail page;
  - raw signal may use nested `generatedAt`;
  - calibration and smart-money currently need compatibility labeling because their stored timestamp is absent;
  - lite setup support should be labeled as Today Review-owned compatibility evidence, not as live upstream recalculation.

Reason objects should also gain additive provenance linkage, preferably by key and timing-source semantics, so blockers, watch reasons, and promotion reasons stay consistent with the same stored provenance chain.

## Exact Future File Reservations

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- exact new focused compatibility-read test: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Files

- application source or tests before Team 00 promotion
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
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-context-intelligence/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/smart-money-intelligence/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data work
- startup/backfill work
- paid/cloud scope
- broker or automation scope
- telemetry scope
- broad Today Review UI redesign

## Dependency And Conflict Notes

- `CF-W1-L3-TREV-01` is the run-level parent trust packet. Its docs exist, but Team 03 must not treat any branch-only `TREV-01` implementation artifacts as merged into `dev`.
- `CF-W1-L3-TREV-02` is not blocked on `TREV-01` source landing first, because the candidate route already returns stored snapshot data. The dependency is sequencing and compatibility, not a schema or route blocker.
- If Team 00 promotes `TREV-01` and `TREV-02`, they must not run in parallel:
  - both reserve `today-trade-review.service.ts`;
  - both reserve `today-trade-review.repository.ts`;
  - both reserve `today-trade-review.types.ts`;
  - both reserve `today-trade-review.md`;
  - both reserve `frontend/src/features/today-trade-review/types.ts`;
  - both reserve `frontend/tests/ui/today-trade-review.spec.ts`.
- `CF-W1-TP-02` remains separate. Any target-like wording cleanup or trade-plan phrasing change stays out of this child.

## Required QA Scenarios

Team 04 planning should cover:

- persisted candidate with full source-dated provenance across data quality, strategy proof, trade plan, and raw signal support;
- candidate whose provenance timestamp comes from underlying evidence vs snapshot-generated timestamp vs candidate publication-time fallback;
- partial mixed `sourceSignalSnapshot` where calibration and smart-money support exist but no stored timestamp exists;
- lite candidate whose strategy proof and setup support are compatibility-only and explicitly labeled;
- missing snapshot rows that render `UNAVAILABLE` without pretending completeness;
- repository compatibility read path for older rows where explainability exists but normalized provenance does not;
- detail page regression that keeps research-support-only language and never drifts into advice, broker, target-price, or automation wording.

## Readiness Result

`Ready candidate`.

The child is bounded, module-local, and additive. The next gate is Team 04 QA planning, then Team 00 Ready evaluation with one writer set only.

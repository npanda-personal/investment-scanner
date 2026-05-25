# CF-W2-TSC-04 Architecture Review

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

SPLIT REQUIRED.

`CF-W2-TSC-04` should not move to Ready as one unsplit parent packet. The smallest honest executable path is one bounded Today Review child:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`

Current verdict: the child is a Ready candidate after Team 04 writes the QA plan and Team 00 records a bounded Ready promotion on the accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` base commit `09bbf9b`.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/top-10-ready-candidates.md`
- `00-control/active-work-board.md`
- `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
- `03-architecture/CF-W1-TSC-02-architecture-review.md`
- `03-architecture/CF-W1-TSC-03-architecture-review.md`
- `06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current-State Findings

### 1. Current Today Review still leaks target and Trade Plan-first language on trusted surfaces

Current Today Review source and module docs still present target/reward, reward/risk, paper-review, and Trade Plan-first wording in user-facing list/detail paths:

- `today-trade-review.service.ts` still emits target-derived Lite plan data, reward/risk threshold copy, and Trade Plan proof-chain reason labels.
- `TodayReviewPage.tsx` still describes the shortlist as built from trusted evidence and trade-plan geometry.
- `TodayReviewCandidateDetailPage.tsx` still renders target/reward and reward/risk facts directly from `tradePlanSnapshot`.
- `today-trade-review.md` still documents target/reward and reward/risk as Today Review fields.

This is a real product-language gap, not a stale-doc-only problem.

### 2. The first honest fix is not frontend-copy-only

Frontend relabeling alone would still leave user-facing Today Review reason summaries, blockers, watch reasons, supporting-evidence labels, and detail reason categories sourced from backend Trade Plan-shaped text.

Examples from current source:

- `Reward/risk is incomplete for paper review.`
- `Trade-plan proof-chain snapshot supports paper-review research.`
- raw reason category rendering as `TRADE_PLAN_PROOF_CHAIN / INFO`

That means `CF-W2-TSC-04` needs a bounded Today Review read-path presentation mapping layer in addition to copy cleanup. This remains no-schema and Today Review-local.

### 3. Ranking and promotion semantics are still target-shaped, but they belong to `CF-W2-TSC-05`

Current Today Review service still:

- blocks or downgrades Lite candidates on `rewardRiskRatio`,
- derives synthetic 2R/3R target values,
- uses reward/risk inputs in confidence scoring,
- treats trade-plan geometry as candidate-promotion evidence.

Those are real problems, but they are ranking and eligibility semantics, not language-only cleanup. Changing them in `CF-W2-TSC-04` would widen the slice and collide with the separately drafted `CF-W2-TSC-05` requirement.

`CF-W2-TSC-04A` must preserve current ranking and promotion behavior, then hand semantic cleanup of those mechanics to `CF-W2-TSC-05`.

### 4. Accepted Today Review bases already provide enough evidence for honest no-target presentation

Accepted Today Review trust work already provides the source material needed for a no-schema language cleanup:

- `CF-W1-TSC-01A-TREV` established source-proven trigger evidence adoption rules.
- `CF-W1-TSC-02A-TREV-HEALTH` established active-health semantics on Today Review.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` established supporting-trust evidence and was accepted as commit `09bbf9b`.

That means the cleanup child can reuse existing Today Review snapshots and explainability fields rather than reopening Signal Generation, Strategy Decision, Trade Plan, DQ, Calibration, or Backtesting source.

### 5. Compatibility-only data may remain persisted, but it cannot remain trusted candidate evidence

Current payloads can continue carrying `tradePlanSnapshot` and older target-shaped compatibility fields. The first child does not need to delete or migrate them.

But touched Today Review trusted-candidate surfaces must either:

- hide target/reward and reward/risk values from trusted candidate framing, or
- label any remaining read-side presentation as compatibility-only or historical context.

Trusted candidate entry wording must use source-proven trigger evidence where available, or explicit unavailable/missing evidence where it is not.

## Architecture Decision

Split `CF-W2-TSC-04` into one bounded Today Review child:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`

The child should be:

- Today Review-owned;
- additive and read-path only;
- stacked on accepted `09bbf9b`, not plain `dev`;
- limited to presentation mapping, wording cleanup, and compatibility-field suppression/labeling;
- explicitly separate from ranking, promotion, confidence, or Lite target-generation changes reserved for `CF-W2-TSC-05`.

## Proposed Additive Presentation Mapping

The child should add one Today Review-owned presentation projection or equivalent field family with semantics equivalent to:

```ts
interface TodayReviewTrustedEntryEvidence {
  availability: 'SOURCE_PROVEN' | 'UNAVAILABLE' | 'COMPATIBILITY_ONLY';
  triggerPrice: number | null;
  triggerTimestamp: string | null;
  strategyCode: string | null;
  strategyVersion: string | null;
  ruleSummary: string | null;
  summary: string;
}

interface TodayReviewCompatibilityContext {
  tradePlanEntryZoneSummary: string | null;
  tradePlanInvalidationSummary: string | null;
  visibility: 'HIDDEN' | 'COMPATIBILITY_ONLY';
  notes: string[];
}

interface TodayReviewTrustedCandidatePresentation {
  candidateLabel: string;
  entryEvidence: TodayReviewTrustedEntryEvidence;
  compatibilityContext: TodayReviewCompatibilityContext;
  normalizedReasonSummary: string;
  normalizedBlockers: string[];
  normalizedWatchReasons: string[];
}
```

Exact field names may differ. The contract intent is:

- trusted-candidate wording comes from Today Review-owned presentation mapping;
- source-proven trigger evidence is primary when available;
- Trade Plan compatibility fields are not primary trusted evidence;
- raw stored fields may remain for backward compatibility.

## Required Base And Sequencing

### Required implementation base

- accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b feat: add today review supporting trust evidence`

Do not implement from:

- plain `dev`
- accepted `34c9993` alone
- any older Trade Plan-shaped Today Review baseline

### Writer sequencing

The Today Review writer set is now released by accepted `TSC-03A`. This child does not conflict with Team 08 because it stays inside Today Review only and must not touch Data Quality or Pipeline Ops files.

## Exact Future File Reservations

### Allowed implementation files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Forbidden files

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- Prisma schema or migrations
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/pipeline-ops/**`
- all other source/tests outside the reserved Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Stop Conditions

Stop and return this packet to Team 00 / Architect if truthful implementation requires:

- ranking or promotion logic changes;
- Lite target generation removal;
- reward/risk threshold removal;
- confidence-score recalculation;
- repository/controller/router/validation/index edits;
- route or route-registry edits;
- schema, migration, generated-file, package, shared UI, or shared utility changes;
- upstream source edits in Signal Generation, Strategy Decision, Trade Plan, DQ, Calibration, or Backtesting.

Those are `CF-W2-TSC-05` or separate upstream work, not `CF-W2-TSC-04A`.

## QA Handoff Notes

Future Team 04 planning should verify:

- no visible `R:R`, `reward/risk`, `target/reward`, `modeled reward`, `paper review`, `trade-plan geometry`, `Trade-plan proof-chain`, `buy now`, `sell now`, `guaranteed`, or `financial advice` wording on touched Today Review list/detail/module-doc/spec surfaces;
- trusted entry wording uses source-proven trigger evidence when present;
- when source-proven trigger evidence is absent, trusted entry wording is explicit about unavailable or missing evidence;
- raw Trade Plan compatibility data, if still exposed anywhere on touched surfaces, is labeled compatibility-only or historical and not trusted evidence;
- supporting evidence and health sections from accepted `09bbf9b` remain visible and consistent;
- reason lists do not surface raw `TRADE_PLAN_PROOF_CHAIN` as trusted candidate language on touched UI;
- no ranking, promotion, grouping, or confidence behavior drifts in this slice.

## Ready Recommendation

Parent item `CF-W2-TSC-04`: not Ready.

Recommended child `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`: Ready candidate after Team 04 prepares the QA plan and Team 00 records a bounded Ready promotion on accepted base `09bbf9b`.

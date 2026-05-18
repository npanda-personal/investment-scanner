# CF-W1-L3-TREV-01 Today Review Publication Evidence Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Today Review publication-evidence contract prepared. Not Ready for Implementation.

## Contract Intent

Today Review must explain, from its persisted run snapshot, why the daily shortlist published candidates, why it limited publication, or why it suppressed publication entirely.

The contract is research-support only. It must not imply automation, broker authorization, or direct financial advice.

## Ownership

`today-trade-review` owns this behavior.

Upstream evidence producers remain unchanged:

- Market Data Foundation for `reviewReadinessSummary`, trusted-universe health, and trusted-universe membership
- Strategy Decision Engine for candidate inputs

Today Review must consume those public contracts and must not duplicate or redefine them.

## Required Additive Run Metadata

Add one additive `publicationEvidence` object to `TodayReviewSourceSnapshot`.

Equivalent required semantics:

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

The exact field names may differ, but the semantics must stay stable.

## Required Mapping Rules

- `reviewReadiness.reviewMode` is the authoritative review mode when present.
- If `reviewReadiness.reviewMode` is missing, Today Review may fall back to trusted-universe mode, but it must record that fallback explicitly.
- If neither readiness snapshot nor trusted-universe mode is available, Today Review must record a conservative fallback and explain why publication could not be trusted.
- `NO_REVIEW` must map to `SUPPRESSED`.
- configured partial scan must map to `LIMITED_PUBLICATION`.
- membership load failure must map to `SUPPRESSED` and preserve the failure reason.
- `LIMITED_REVIEW` may publish candidates only as bounded research-support output and must state that publication was limited.
- `FULL_REVIEW` may publish candidates only when trusted-universe membership evidence and scan state support it.

## Legacy Read-Path Rule

Persisted rows that predate `publicationEvidence` must still be explainable on read.

Implementation may synthesize the additive object from existing `reviewReadiness`, `reviewUniverse`, `scanFunnel`, and warnings, but it must not require:

- Prisma backfill
- schema change
- route change
- new provider calls

## UI Contract

The Today Review list/run surface must expose, from the additive publication evidence or equivalent normalized run snapshot:

- review mode
- review mode source
- required data-through date
- stored data-through date
- trusted-universe availability
- scan completion
- membership load status
- membership failure reason when present
- outside-trusted-universe exclusion count
- explicit missing-readiness or mismatch explanation when applicable

The first slice must stay on the run/list surface only.

## Candidate Detail Rule

`TodayReviewCandidateDetailPage` remains a research-support-only detail surface.

The first slice must not widen candidate detail into a new run-evidence data contract. Preserve existing read-only language and verify it in UI regression coverage.

## Compatibility Rules

- Keep existing Today Review routes unchanged.
- Keep existing run and candidate response fields backward-compatible.
- Do not remove or rename `reviewReadiness`, `reviewUniverse`, `scanFunnel`, or `explainability`.
- Do not alter candidate ranking, scoring, strategy proof, Data Quality scoring, or Trade Plan geometry semantics in this slice.

## Forbidden Behavior

- Do not recompute Market Data review readiness or trusted-universe policy inside Today Review.
- Do not publish Strategy Decision entries outside the trusted snapshot.
- Do not treat configured partial scan as membership load failure.
- Do not hide missing or mismatched readiness behind optimistic wording.
- Do not add advice-like labels, target-price framing, or automation wording.

## Test Contract

Focused tests must prove:

- full-review publication evidence
- limited-review publication evidence
- no-review suppression evidence
- configured-partial publication evidence
- legacy or mocked mismatch explanation
- legacy or mocked missing-readiness explanation
- outside-trusted-universe exclusions remain out of all candidate sections
- candidate detail remains read-only research support

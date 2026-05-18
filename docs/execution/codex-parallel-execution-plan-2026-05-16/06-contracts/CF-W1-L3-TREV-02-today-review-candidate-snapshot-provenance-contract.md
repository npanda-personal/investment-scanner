# CF-W1-L3-TREV-02 Today Review Candidate Snapshot Provenance Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Today Review candidate snapshot provenance contract prepared.

Readiness result: `Ready candidate`.

## Contract Intent

Today Review candidate detail must explain which stored evidence modules supported the candidate, when that evidence was dated, and whether the timing came from underlying evidence, snapshot generation, or publication-time fallback.

This contract is research-support only. It must not imply broker authorization, execution, guaranteed outcomes, or direct financial advice.

## Ownership

`today-trade-review` owns this child.

Upstream modules remain unchanged evidence producers through the snapshots Today Review already stores:

- Data Quality Engine
- Market Context Intelligence
- Strategy Framework / Strategy Decision-owned proof metadata already captured by Today Review
- Trade Plan Risk Engine
- Signal Generation Engine
- Signal Calibration Engine
- Smart Money Intelligence

Today Review must not re-run those modules on candidate-detail load.

## Required Additive Candidate Provenance Surface

Add one additive normalized candidate provenance surface, preferably under `TodayReviewCandidateExplainability`, with equivalent semantics to:

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

The exact field names may differ, but the semantics must stay stable.

## Required Mapping Rules

- `dataQuality`:
  - module label `Data Quality Engine`;
  - prefer `lastEvaluatedAt`;
  - if only lite `latestPriceDate` or non-tier fields exist, label `LEGACY_SHAPE` and explain the fallback.
- `marketContext`:
  - module label `Market Context Intelligence`;
  - prefer `updatedAt`;
  - if the stored snapshot lacks a timestamp, use a compatibility fallback and label it.
- `strategyProof`:
  - module label `Strategy Framework` for framework-backed proof;
  - module label `Today Review Lite` for lite historical-evidence proof;
  - prefer `generatedAt`;
  - if absent, use candidate publication time with explicit compatibility wording.
- `tradePlan`:
  - module label `Trade Plan Risk Engine`;
  - prefer `generatedAt`;
  - if absent, use candidate publication time with explicit compatibility wording.
- `rawSignal`:
  - module label `Signal Generation Engine`;
  - prefer nested `generatedAt`.
- `signalCalibration`:
  - module label `Signal Calibration Engine`;
  - current stored shape has no timestamp, so the first child must label it `PARTIAL` or `LEGACY_SHAPE` with fallback timing disclosure.
- `smartMoney`:
  - module label `Smart Money Intelligence`;
  - current stored shape has no timestamp, so the first child must label it `PARTIAL` or `LEGACY_SHAPE` with fallback timing disclosure.
- `todayReviewLiteSetup`:
  - module label `Today Review Lite`;
  - use when the candidate is sourced from the lite setup snapshot rather than upstream signal/calibration rows.

## Required Reason-Provenance Rules

`TodayReviewCandidateReason` must stay consistent with the same normalized provenance chain.

Equivalent required semantics:

- each reason keeps `sourceModule`;
- each reason keeps or derives `evidenceDate` when available;
- each reason should indicate which normalized provenance row it references, directly or by equivalent semantics;
- reasons that rely on compatibility fallback must not appear as if underlying evidence time were directly stored.

## Candidate Detail UI Contract

The candidate detail page must:

- replace broad `Available / Unavailable` support labels with explicit provenance rows;
- show source module, status, timestamp, and timing-source label for each stored evidence item;
- show explicit compatibility-only wording for partial, legacy-shaped, or unavailable snapshot structures;
- keep the page read-only and research-support only;
- preserve existing plan, proof, data-quality, and market-context panels unless a field is directly replaced by the new provenance row.

The first child is limited to the candidate detail page. Do not widen it into run/list surface work.

## Legacy Read-Path Rule

Older rows that predate normalized provenance must still render usable provenance labels on read.

Implementation may normalize from existing snapshot JSON plus candidate `createdAt` / `updatedAt`, but it must not require:

- Prisma backfill
- schema change
- route change
- controller change
- live provider call
- startup or backfill job

## Compatibility Rules

- Keep `GET /today-review/candidates/:id` unchanged.
- Keep existing candidate snapshot fields additive and backward-compatible.
- Do not remove or rename `dataQualitySnapshot`, `marketContextSnapshot`, `strategyProofSnapshot`, `tradePlanSnapshot`, `sourceSignalSnapshot`, or `explainability`.
- Do not require frontend API or hook rewiring for the first child.
- Do not alter run/list DTOs in this packet.

## Forbidden Behavior

- Do not recompute upstream modules on detail load.
- Do not widen into Today Review run/list publication evidence; that remains `CF-W1-L3-TREV-01`.
- Do not widen into target-wording cleanup; that remains `CF-W1-TP-02`.
- Do not touch Prisma/schema, migrations, route registries, shared utilities, shared UI, packages, generated files, providers, startup/backfill, paid/cloud, broker, or telemetry scope.
- Do not present missing timestamps or missing snapshot parts as silently complete evidence.

## Test Contract

Focused tests must prove:

- full candidate provenance with stored evidence timestamps;
- mixed timestamp-source labeling across evidence rows;
- compatibility-only fallback labeling for lite proof and partial source-signal support;
- missing snapshot handling without optimistic wording;
- repository compatibility normalization for older rows;
- detail-page rendering of source module, timestamp, timing source, and compatibility label;
- research-support-only language remains intact.

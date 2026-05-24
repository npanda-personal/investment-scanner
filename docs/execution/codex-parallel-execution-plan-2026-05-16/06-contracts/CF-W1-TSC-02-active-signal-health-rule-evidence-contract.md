# CF-W1-TSC-02 Active Signal Health Rule Evidence Contract

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

## Status

Split-child contract. Parent is not Ready for Implementation.

This contract applies to the bounded child:

- `CF-W1-TSC-02A-TREV-HEALTH`

## Purpose

Define one additive Today Review-owned active-signal health projection for accepted Trusted Signal Candidates.

The projection must help the user see whether a candidate is still active, healthy, weakening, risk-warning, exit-triggered, invalidated, expired, or blocked, with visible rule/version/evidence dates and explicit missing-evidence reasons.

This remains research-support only. It must not become a Trade Plan workflow, target-price workflow, reward/risk workflow, direct-action workflow, broker workflow, or automated trade instruction.

## Required Base

The child must stack on accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`, which already carries accepted Trusted Signal Candidate adoption and the accepted Signal Generation bridge dependency `40c00f1`.

Do not implement this child directly against plain `dev`.

## Scope

### In scope

- Today Review candidate-row health projection
- Today Review candidate-detail health projection
- additive Today Review backend/frontend types
- additive health mapping in Today Review service
- focused Today Review service and UI smoke coverage

### Out of scope

- new persistence
- repository/controller/router/validation/index edits
- route changes
- route-registry edits
- shared backend utilities
- shared frontend UI
- schema or migrations
- package or generated-file changes
- upstream module source changes
- new page or new monitor route
- durable health history
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work
- `CF-W1-TSC-03` supporting DQ/calibration/backtesting evidence chain

## Allowed Files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Files

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- Prisma schema or migrations
- upstream/downstream source or tests outside the allowed file set

## Additive Health Semantics

The child should add semantics equivalent to:

```ts
type TrustedSignalHealthState =
  | 'ACTIVE'
  | 'HEALTHY'
  | 'WEAKENING'
  | 'RISK_WARNING'
  | 'EXIT_TRIGGERED'
  | 'INVALIDATED'
  | 'EXPIRED'
  | 'BLOCKED';

type TrustedSignalHealthEvidenceStatus =
  | 'SOURCE_PROVEN'
  | 'PARTIAL'
  | 'MISSING_RULE_EVIDENCE'
  | 'UNSUPPORTED'
  | 'DATA_QUALITY_BLOCKED';

interface TrustedSignalHealthProjection {
  state: TrustedSignalHealthState;
  evidenceStatus: TrustedSignalHealthEvidenceStatus;
  summary: string;
  reasonCodes: string[];
  evidenceDate: string | null;
  sourceModule: string;
  strategyCode: string | null;
  strategyVersion: string | null;
  ruleId: string | null;
  ruleVersion: string | null;
  missingEvidenceReasons: string[];
}
```

Exact field names may differ. The semantics must remain additive and backward-compatible.

## Evidence Inputs

Allowed evidence inputs:

- accepted Trusted Signal Candidate snapshots from `CF-W1-TSC-01A-TREV`
- Signal Generation source-proven entry trigger evidence already carried through Today Review
- Data Quality snapshot readiness and evidence dates
- strategy/rule/version evidence already carried through Today Review snapshots
- Strategy Decision rule-based current-state evidence already available during Today Review projection

Not allowed as health proof:

- arbitrary target prices
- synthetic profit targets
- reward/risk ratios
- Trade Plan target or stop geometry
- price movement alone
- advice-like language
- new heuristic evidence invented outside the existing source modules

## State Rules

- `BLOCKED`
  - required trusted entry evidence is missing; or
  - Data Quality is blocked, missing, unsupported, or stale-hard-blocked; or
  - current proof basis required for a trusted health state is missing.
- `ACTIVE`
  - trusted entry evidence exists, but no stronger current rule-backed health state is proven.
- `HEALTHY`
  - current rule/version evidence proves the candidate remains valid.
- `WEAKENING`
  - current rule/version evidence proves weakening.
- `RISK_WARNING`
  - current warning evidence proves risk without meeting exit or invalidation proof.
- `EXIT_TRIGGERED`
  - documented exit-rule evidence proves exit.
- `INVALIDATED`
  - documented invalidation-rule evidence proves invalidation.
- `EXPIRED`
  - documented expiry-rule evidence proves expiry.

Missing proof must never be promoted into a stronger state. It must fall back to `ACTIVE` or `BLOCKED` with explicit missing-evidence reasons.

## Compatibility Rules

- Existing Today Review routes remain unchanged.
- Existing Today Review persisted rows remain readable.
- Older rows that lack new health evidence must render conservatively and not fail.
- No new persisted columns are required.
- No response shape should become breaking; new fields are additive only.

## Stop Conditions

Stop and split again if truthful implementation requires:

- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry edits;
- shared UI or shared backend utility edits;
- upstream source changes;
- package changes;
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work;
- `CF-W1-TSC-03` support evidence;
- target/R:R/Trade Plan semantics as health evidence.

## One-Writer Rule

One writer only across the full Today Review backend/frontend reservation.

Do not run this child in parallel with any other Today Review source packet.

## Readiness Note

As of 2026-05-24:

- parent `CF-W1-TSC-02` is not Ready;
- child `CF-W1-TSC-02A-TREV-HEALTH` is the only honest Ready-candidate path;
- Team 04 QA planning and Team 00 stacked promotion are still required before implementation.

# CF-W1-TSC-01 - Trusted Signal Candidate Workflow Architecture Review

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

Status: Architecture Path Prepared - Not Ready For Implementation

## Decision

Prepare `CF-W1-TSC-01` as a bounded Today Review-first read-path/additive workflow.

Do not create a disconnected new page for the first slice.

Do not execute current `CF-W1-TP-03` Trade Plan proof-snapshot work as framed.

## Recommended First Slice

Use `/today-review` to surface Trusted Signal Candidate grouping and health language.

The first implementation candidate should be a Today Review-owned slice that aggregates only currently available evidence:

- Today Review candidate/run evidence;
- Signal Generation trigger evidence;
- Data Quality readiness or blocker status;
- Strategy/rule/version metadata where available;
- Strategy evidence freshness where available;
- Signal Quality review-loop evidence where available;
- market/historical context fit only where currently supported.

The slice should not introduce new persistence or route registration.

## Module Boundary

Primary owner:

- `today-trade-review`

Read-only evidence dependencies, only through existing public surfaces:

- `signal-generation-engine`
- `data-quality-engine`
- `strategy-framework`
- `signal-quality-lab`
- `market-context-intelligence`
- `historical-context-snapshots`

Avoid coupling to `trade-plan-risk-engine` for the first slice. Rule-based exit/invalidation may be referenced only if already present in current Today Review or signal evidence; do not create Trade Plan semantics.

## Candidate Contract Shape

Architecture should support a display model with:

- candidate group: `HIGHLY_TRUSTED`, `TRUSTED_NEEDS_REVIEW`, `WATCH_ONLY`, `BLOCKED`;
- health state: `ACTIVE`, `HEALTHY`, `WEAKENING`, `RISK_WARNING`, `EXIT_TRIGGERED`, `INVALIDATED`, `EXPIRED`, `BLOCKED`;
- entry trigger price from the rule-trigger event;
- reason summary;
- strategy/rule/version;
- Data Quality readiness and blocker reasons;
- evidence freshness/status labels;
- exit/invalidation rule status when source-proven;
- missing evidence reasons.

No target-price, R:R, or synthetic profit-target field should be introduced.

## Future Implementation File Reservation Candidate

Exact reservations must be revalidated before Ready promotion.

Likely allowed source/test files for a first Today Review-owned child:

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
- Route registries.
- Shared backend utilities.
- Shared UI components.
- Package manifests.
- Generated files.
- Provider/live-data calls.
- Startup/backfill behavior.
- Broker integration.
- Paid/cloud services.
- Broad UI navigation work.
- Trade Plan source changes unless a separate approved child explicitly reframes them away from R:R/targets.

## Architecture Risks

- Existing Trade Plan naming may leak into the candidate workflow if copied mechanically.
- Existing target-shaped compatibility fields may appear trustworthy if not filtered out.
- Today Review could become too broad if it starts owning signal, strategy, DQ, and context logic instead of aggregating existing evidence.
- Exit/invalidation status can become unsafe if inferred from price targets instead of documented rules.

## Architecture Gate

`CF-W1-TSC-01` is not implementation-ready yet.

Team 00 should request:

- Team 04 QA plan;
- current source inspection for exact evidence fields;
- exact first-child file reservations;
- one-writer sequencing against active `CF-W1-L3-TREV-02` branch commit `f1de1d5`.

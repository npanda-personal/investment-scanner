# CF-W2-TSC-04 Today Review No-Target Candidate Language Cleanup Contract

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

Split-child contract prepared for docs-only readiness.

This contract applies to the bounded child:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`

Current verdict: child is a Ready candidate after Team 04 QA planning and Team 00 bounded promotion on accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b`.

## Purpose

Define the bounded Today Review presentation contract that removes target/reward, reward/risk, and Trade Plan-first language from trusted candidate list/detail surfaces without widening into ranking or eligibility semantics.

This remains research-support only. It must not become a target-price workflow, reward/risk workflow, Trade Plan-first workflow, direct-action workflow, broker workflow, or automated trade instruction.

## Required Base

The child must stack on accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` commit `09bbf9b`, not plain `dev`.

This preserves:

- accepted trigger-evidence adoption from `TSC-01A`
- accepted active-health semantics from `TSC-02A`
- accepted supporting-trust evidence from `TSC-03A`

## Scope

### In scope

- Today Review list/detail candidate-language cleanup
- Today Review read-path presentation mapping for trusted candidate wording
- additive Today Review backend/frontend types if needed for presentation fields
- additive Today Review service normalization of visible reason/blocker/watch wording
- Today Review module doc wording cleanup
- focused Today Review service and UI smoke coverage

### Out of scope

- ranking, promotion, grouping, or confidence logic changes
- Lite target generation removal
- reward/risk threshold removal
- repository/controller/router/validation/index edits
- route changes
- route-registry edits
- shared backend utilities
- shared frontend UI
- schema or migrations
- package or generated-file changes
- upstream module source changes
- new page or new route
- Trade Plan engine rewrite
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work

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
- all source/tests outside the allowed Today Review file set

## Required Semantics

### Trusted entry evidence

- Trusted entry wording must use source-proven trigger evidence when the accepted Today Review base can prove it.
- If source-proven trigger evidence is unavailable, the user-facing copy must say unavailable or missing evidence.
- Do not present `tradePlanSnapshot.entryZone`, stop geometry, target geometry, or reward/risk math as trusted entry price evidence.

### Compatibility-only Trade Plan data

- Existing `tradePlanSnapshot` fields may remain in payloads for compatibility.
- Touched Today Review trusted-candidate surfaces must not present target price, target range, modeled reward, or reward/risk as trusted candidate evidence.
- If any raw Trade Plan compatibility context is still shown on touched surfaces, it must be labeled compatibility-only or historical context.
- Hidden compatibility-only fields are allowed.

### Reason and supporting-evidence language

- Visible `reasonSummary`, `blockers`, `watchReasons`, supporting-evidence labels, and detail reason-category presentation must use Trusted Signal Candidate-safe language.
- Raw stored reason categories may remain backward-compatible, but touched UI must not render `TRADE_PLAN_PROOF_CHAIN` or equivalent Trade Plan-first labels as trusted candidate language.
- `paper review` wording is out of scope for touched trusted-candidate surfaces and must be replaced with research-review or candidate-safe wording where still needed.

### Scope boundary against `CF-W2-TSC-05`

- Do not change candidate ranking, promotion, grouping, confidence, or Lite target-generation mechanics in this child.
- Do not remove reward/risk thresholds from service logic in this child.
- Do not reinterpret current scoring outputs.
- Those semantics belong to `CF-W2-TSC-05`.

### Compatibility and routes

- Existing Today Review routes remain unchanged.
- Existing persisted Today Review rows remain readable.
- New presentation fields, if added, are additive only.
- Accepted health and supporting-trust surfaces from base `09bbf9b` must remain visible and backward-compatible.

## Explicit Non-Goals

- No ranking cleanup
- No eligibility cleanup
- No confidence-model cleanup
- No new score
- No new grouping
- No new persistence
- No Trade Plan source rewrite
- No Data Quality or Pipeline Ops edits

## Stop Conditions

Stop and split again if truthful implementation requires:

- ranking or eligibility changes;
- score or confidence recalculation;
- Lite target generation removal;
- repository/controller/router/validation/index edits;
- route or route-registry edits;
- shared UI or shared backend utility edits;
- package changes;
- schema, migration, or generated-file changes;
- upstream source edits.

## One-Writer Rule

One writer only across the full Today Review backend/frontend reservation.

Do not run this child in parallel with any other Today Review source packet.

## Readiness Note

As of 2026-05-25:

- parent `CF-W2-TSC-04` is not Ready;
- child `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is the only honest executable path;
- required base is accepted `09bbf9b`;
- Team 04 QA planning is still required before Team 00 promotion.

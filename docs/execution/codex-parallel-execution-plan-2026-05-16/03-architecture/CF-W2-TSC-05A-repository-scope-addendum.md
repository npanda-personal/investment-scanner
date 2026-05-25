# CF-W2-TSC-05A Repository Scope Addendum

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Work Item

`CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`

Scope-correction addendum after Team 04 QA re-verification rejection.

## Status

ARCHITECTURE ADDENDUM ISSUED.

Verdict: bounded scope correction is required before another Team 04 re-verification.

This is a module-local reservation correction, not a Product Owner blocker.

## Rejection Trigger

Team 04 confirmed that the first Team 07 rework removed legacy target/reward and paper-review semantics from the reserved Today Review service, UI, and tests, but persisted read responses still rebuild trusted explainability with legacy repository fallback semantics.

Confirmed live read-path gap:

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
  - persisted candidate DTO hydration still calls `candidateExplainability(...)`
  - fallback reason mapping still emits `TRADE_PLAN_PROOF_CHAIN`
  - fallback ranking breakdown still emits `rankingComponents.tradePlan`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
  - `latest`, `runById`, and `candidate` return service reads that hydrate through the repository path above

That means the original `CF-W2-TSC-05A` reservation was too narrow for the already-approved no-target / no-trade-plan semantic boundary on persisted reads.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-TSC-05A-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-05-today-review-no-target-ranking-eligibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-TSC-05-work-packet.md`
- `C:\work\repo\investment-scanner-worktrees\team07-CF-W2-TSC-05A\docs\execution\codex-parallel-execution-plan-2026-05-16\04-qa\CF-W2-TSC-05A-qa-reverification.md`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`

## Architecture Verdict

Repository inclusion is a routine module-local scope correction under standing delegation.

It is not a true Product Owner blocker because:

1. the required change stays inside the already-approved Today Review module boundary;
2. the repository is the module-owned persisted DTO hydrator for the same controller -> service -> repository read chain already in scope;
3. the correction does not require Prisma schema, migrations, route registries, controller contract expansion, shared utilities, package changes, providers, or upstream module edits;
4. the product semantic decision is already approved: compatibility-only trade-plan fields must not leak into trusted explainability, reason, ranking-component, or promotion semantics.

This addendum does not expand product intent. It closes a live persisted read-path gap so the existing approved semantic intent is actually enforced.

## Exact Amended Scope Recommendation

### Replace prior allowed implementation scope with

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Explicitly keep forbidden

- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- Prisma schema or migrations
- generated files
- shared backend utilities
- shared frontend components
- package manifests
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

## Required Semantic Boundary On Persisted Reads

After the scope correction, persisted Today Review reads must honor the same semantic boundary as the generated in-memory path.

### Trusted persisted explainability may still use

- source-proven trigger and rule/version evidence
- data-quality readiness and freshness evidence
- current signal-health or blockage evidence
- documented invalidation/risk context
- supporting status evidence already approved for Today Review reuse
- explicit missing-evidence honesty

### Persisted explainability must stop rebuilding trusted semantics from compatibility-only trade-plan fields

Persisted read responses must not emit trusted reason, ranking-component, or promotion semantics based on:

- `TRADE_PLAN_PROOF_CHAIN`
- `rankingComponents.tradePlan`
- reward/risk text classification
- target/reward text classification
- paper-review or paper-readiness labels
- trade-plan geometry labels

Compatibility-only payload fields may remain inside snapshots for backward-readable data, but they must not decide trusted explainability labels or ranking breakdowns on persisted reads.

## QA Expectations For Rework

Team 04 should require proof against the persisted repository hydration path, not only the generated service path.

Minimum re-verification expectations:

1. focused backend coverage proves `latest`, `getRun`, and `getCandidate` hydration no longer rebuild trusted explainability with legacy `TRADE_PLAN_PROOF_CHAIN` or `rankingComponents.tradePlan` fallback semantics;
2. compatibility-only `tradePlanSnapshot` fields may still exist, but they do not drive trusted reason categories, ranking components, or promotion labels on persisted reads;
3. existing no-target/no-reward/no-paper-review phrase expectations remain clean on touched Today Review runtime surfaces;
4. frontend smoke still passes against a dedicated URL because list/detail pages consume the persisted Today Review API;
5. QA rejects again if truthful correction requires controller, router, route-registry, schema, shared utility, shared component, package, or upstream module edits.

Recommended backend validation shape:

- keep the focused Today Review service test run;
- add a focused repository-hydration test that persists or simulates stored candidate snapshots and asserts the persisted DTO explainability output;
- keep backend build, frontend build, and dedicated-URL Playwright smoke.

## Team 00 Routing Recommendation

Team 00 may route a bounded Team 07 rework without asking the Product Owner again.

Conditions:

1. reserve the repository and one focused repository-read test file exactly as listed above;
2. keep the work stacked on the accepted `CF-W2-TSC-04A` base and current `CF-W2-TSC-05A` worktree lineage;
3. keep controller/router/schema/shared/upstream/package scope closed;
4. send the corrected Team 07 handoff back to Team 04 for full re-verification before any Team 10 review.

## Stop Boundary

Escalate back to Team 00 / Team 03 and treat as a new blocker only if the repository correction reveals a truthful need for:

- controller or route contract changes
- type changes that force shared cross-module contract migration outside Today Review
- Prisma or persistence-shape changes
- upstream `trade-plan-risk-engine` or `strategy-decision-engine` source edits
- shared utility/component/package/generated-file edits

Absent one of those conditions, this remains a bounded Team 07 module-local rework.

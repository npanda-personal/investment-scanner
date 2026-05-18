# CF-W1-RH-02A Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate architecture packet prepared.

This is a bounded no-schema first child, but it is not backend-only. Current `dev` source can fail `whatChanged` closed without new storage by adding explicit comparison-basis semantics in `research-hub` and by replacing the hard-coded frontend fallback copy that currently overclaims temporal evidence.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-02-research-hub-what-changed-traceability-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-RH-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-RH-01-work-packet.md`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Current Source Findings

- `research-hub.service.ts` currently labels `whatChanged` as simulated and derives `newTradeCandidates` directly from the current `tradeCandidates` list rather than from any auditable previous Research Hub basis.
- `research-hub.types.ts` and `frontend/src/features/research-hub/api/researchHubApi.ts` expose only `newTradeCandidates`, `downgradedCandidates`, `marketGateChange`, and `warnings`. There is no explicit basis-status field today.
- `ResearchOverviewPage.tsx` renders the hard-coded fallback sentence `No new review candidates since the last evaluation.` whenever `newTradeCandidates` is empty, regardless of whether a prior basis exists.
- `frontend/tests/ui/research-hub.spec.ts` currently asserts that misleading sentence.
- Current `dev` does not contain a module-owned persisted Research Hub overview snapshot, journal row, or scheduler-produced previous-overview record that would allow candidate-level Research Hub delta claims.
- Existing Today Review persisted runs are not a safe comparison basis for this child. Today Review candidates are a downstream published review set with trusted-universe, trade-plan, and review-state semantics that do not match Research Hub's overview-level `tradeCandidates` contract. Using Today Review as a proxy would still fabricate Research Hub delta meaning.

## Architecture Decision

Prepare `CF-W1-RH-02A` as a bounded Research Hub fail-closed comparison-basis child.

The first child should:

- add explicit `whatChanged` comparison-basis status to backend and frontend types;
- return `UNAVAILABLE` basis semantics on current `dev` unless the same reserved Research Hub writer set can prove an auditable prior Research Hub basis without widening scope;
- suppress `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` whenever basis status is `UNAVAILABLE`;
- replace the frontend temporal fallback sentence with basis-aware unavailable wording;
- preserve route shape, module ownership, and research-support language;
- keep true delta history, scheduler/journal storage, and any durable previous-overview path in a later child under parent `CF-W1-RH-02`.

## Smallest Feasible First Child

The smallest feasible first child is one bounded Research Hub backend/frontend slice:

- backend service/types/doc/test;
- frontend feature API type, page rendering, and UI smoke only.

This child is still no-schema and module-local. It does not need route work, shared UI work, shared utility work, upstream module edits, or provider/live-data work.

## Required Comparison-Basis Posture

For `CF-W1-RH-02A`, the safe default on current `dev` is:

- `comparisonBasis.status = UNAVAILABLE`
- `comparisonBasis.comparedAgainstGeneratedAt = null`
- `comparisonBasis.sourceModule = null`
- `newTradeCandidates = []`
- `downgradedCandidates = []`
- `marketGateChange = null`

Why this is acceptable:

- it removes the false temporal claim now;
- it does not invent a prior basis from mismatched upstream semantics;
- it preserves an additive contract shape so a later `CF-W1-RH-02B` storage/history child can add a true `AUDITABLE` path without route or package churn.

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Forbidden Files

- all application source and tests before Team 00 promotion
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `backend/src/modules/today-trade-review/**`
- all `backend/src/modules/strategy-decision-engine/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all `backend/src/modules/market-context-intelligence/**`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/signal-calibration-engine/**`
- all `backend/src/modules/smart-money-intelligence/**`
- all other upstream module source edits or tests
- scheduler/journal storage or durable overview snapshot work
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- package manifests
- shared backend utilities
- shared frontend components
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry scope
- broad Research Hub redesign

## Sequencing With CF-W1-RH-01

`CF-W1-RH-02A` shares the same core Research Hub backend writer set as `CF-W1-RH-01`:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `backend/src/modules/research-hub/research-hub.types.ts` becomes required here and optional in `RH-01`

Team 00 should not run `CF-W1-RH-01` and `CF-W1-RH-02A` in parallel.

Recommended sequencing:

1. keep `CF-W1-RH-01` on its current QA-to-Ready path;
2. promote `CF-W1-RH-02A` only after `CF-W1-RH-01` is accepted/merged or intentionally re-packed into one combined Research Hub writer pass;
3. if Team 00 combines them, treat the combined packet as a fresh one-writer Research Hub reservation rather than as two simultaneous passes.

## QA Planning Handoff For Team 04

Team 04 can plan this child now.

Minimum scenarios:

- backend returns explicit `comparisonBasis.status = UNAVAILABLE` when no prior Research Hub basis exists;
- backend clears `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` when basis is unavailable;
- backend does not infer a basis from current `tradeCandidates` alone;
- backend does not infer a basis from Today Review persisted runs or other mismatched upstream outputs;
- frontend no longer says `since the last evaluation` when basis is unavailable;
- frontend renders basis-unavailable wording without implying hidden history or pending synchronization;
- UI smoke preserves research-support wording and does not introduce buy/sell/advice language.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Team 04 should also record that true prior-basis detection remains outside `RH-02A` unless Team 00 opens a later child with an approved durable Research Hub history path.

## Readiness Result

Ready candidate.

- A bounded no-schema first child is feasible.
- The child improves trust by failing `whatChanged` closed rather than inventing deltas.
- The child requires only module-local Research Hub backend/frontend files plus the existing module UI smoke.
- Scheduler/journal storage, Prisma/schema, migrations, generated files, route changes, shared utilities/UI, package manifests, upstream module source edits, provider/live-data, startup/backfill, paid/cloud, broker, telemetry, and broad UI redesign remain explicitly blocked.

# CF-W1-RH-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate architecture packet prepared. Team 04 QA planning and Team 00 sequencing are still required before any implementation handoff.

The smallest feasible first child is a backend-only, module-local `research-hub` actionability-adapter slice. Current `dev` source already exposes enough public read surfaces to replace hard-coded placeholder insufficiency for Today Review, Trade Plan, Signal Quality, and Calibration dimensions without Prisma/schema changes, route-registry edits, shared utility changes, shared UI changes, provider/live-data work, startup/backfill work, package changes, generated-file changes, broad frontend redesign, or upstream module source edits.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-TREV-01-today-review-publication-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-TREV-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TP-02-exit-invalidation-semantics-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TP-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-CAL-01-signal-calibration-reliability-drift-contract.md`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/trade-plan-risk-engine/index.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.service.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.types.ts`
- `backend/src/modules/trade-plan-risk-engine/trade-plan-risk-engine.md`
- `backend/src/modules/signal-quality-lab/index.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`

## Current Source Findings

- `research-hub.service.ts` already owns the actionability adapter and already computes all seven actionability dimensions in one bounded method.
- The same service still hard-codes `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` through `unstableDimension(...)` placeholders instead of consuming stable module-owned public outputs.
- `research-hub.types.ts` and `frontend/src/features/research-hub/api/researchHubApi.ts` already support the additive fields this child needs: `status`, `count`, `evidenceDate`, `message`, `sourceModule`, and blockers. No frontend contract expansion is required for the first child.
- `ResearchOverviewPage.tsx` already renders the existing actionability object generically. If the backend only changes status/count/date/message values, no frontend implementation is required.
- `TodayTradeReviewService.latest({ region, assetType })` is already available on `dev` and returns a public `TodayReviewRunResponse` with `run.status`, `finishedAt`, `reviewUniverseMode`, `candidateCounts`, `sourceSnapshot.reviewReadiness`, and `sourceSnapshot.scanFunnel`.
- `TradePlanRiskEngineService.funnelDiagnostics({ region, assetType })` and `list(...)` are already available on `dev` and expose public paper-readiness summary and blocker data without requiring Trade Plan source changes.
- `SignalQualityLabService.summary(...)` is already available on `dev` and exposes public `selectedHorizon`, `evidenceUsability`, `evaluationDiagnostics`, `horizonAvailability`, `recommendedAction`, and `generatedAt`.
- `SignalCalibrationEngineService.latestPersistedForInstruments(...)` is already available on `dev` and returns persisted calibration rows with public `calibrationReadiness` / `calibrationEvidence` or conservative missing-evidence semantics.
- None of the four upstream modules needs to be edited for the first child. The work is adapter-only if Research Hub consumes those public services and fails closed when evidence is unavailable or branch-only semantics have not merged into `dev`.

## Module Boundary Review

`research-hub` owns this first child.

Reasons:

- the requirement is about replacing local placeholder actionability semantics inside Research Hub, not changing upstream modules;
- each upstream dependency already has a public service read path in `dev`;
- Research Hub is the only module that should aggregate those public outputs into an overview-level actionability summary;
- the bounded child can stay entirely inside the Research Hub backend module, module docs, and focused module tests.

Upstream ownership must remain unchanged:

- Today Review owns publication/readiness semantics;
- Trade Plan owns paper-readiness semantics;
- Signal Quality Lab owns evidence-usability semantics;
- Signal Calibration Engine owns calibration-readiness semantics.

Research Hub must consume public outputs only. It must not import or inspect upstream repositories, private helper functions, or parked branch-only internals.

## Architecture Decision

Prepare `CF-W1-RH-01` as a backend-only Research Hub actionability evidence child that rewires four existing dimensions through current public service reads on `dev`:

- `todayReviewReadiness`
- `tradePlanReadiness`
- `signalEvidence`
- `calibrationReadiness`

The first child should:

- keep all implementation inside `research-hub.service.ts`, module docs, and focused service tests;
- preserve the existing response shape and frontend page behavior;
- replace placeholders with public-output-derived status, count, evidence date, and reason summary;
- remain conservative when accepted branch semantics are not merged into `dev`;
- keep `whatChanged` out of scope;
- keep research-support language and avoid buy/sell/target/advice wording.

## Recommended Mapping Policy

### Today Review

Use `TodayTradeReviewService.latest({ region, assetType })` only.

Recommended mapping:

- no run, no `run`, or missing readiness snapshot: `INSUFFICIENT_DATA`
- `run.status = FAILED`: `BLOCKED`
- `reviewUniverseMode = NO_REVIEW` or trusted membership load failure surfaced through public snapshot: `BLOCKED`
- `reviewUniverseMode = LIMITED_REVIEW`, configured-partial trusted load, or `run.status = PARTIAL`: `LIMITED`
- completed full-review run with public readiness snapshot present: `READY`

Preferred evidence fields:

- `count`: published long/short/exit review candidate total from `candidateCounts`
- `evidenceDate`: `finishedAt` when present, otherwise `sourceSnapshot.generatedAt`

### Trade Plan

Use public Trade Plan service reads only, preferring `funnelDiagnostics({ region, assetType })`.

Recommended mapping:

- ready-for-paper-review count greater than zero: `READY`
- no ready plans but `WATCH_ONLY` count greater than zero: `LIMITED`
- no ready/watch plans and blocked count greater than zero: `BLOCKED`
- no stable summary or no plans with insufficient evidence only: `INSUFFICIENT_DATA`

Preferred evidence fields:

- `count`: `readyForPaperReview` or total affected plans from public summary
- `evidenceDate`: `generatedAt` from funnel response

### Signal Quality

Use `SignalQualityLabService.summary(...)` on the current public `dev` contract only.

Recommended conservative mapping before accepted `CF-W1-SQLAB-01` trust-state fields are merged into `dev`:

- `evidenceUsability = USABLE`: `LIMITED`
- `evidenceUsability = LIMITED`: `LIMITED`
- `evidenceUsability = UNAVAILABLE` with signals present: `UNPROVEN`
- missing summary or zero relevant evidence: `INSUFFICIENT_DATA`

Reason for the cap:

- current `dev` SQLAB public output proves evidence usability, not the stricter outcome-confidence state defined in the accepted-but-not-merged `CF-W1-SQLAB-01` packet;
- Research Hub must not fabricate a `READY` / trusted signal-evidence state before those richer public trust semantics exist on `dev`.

Preferred evidence fields:

- `count`: `evaluationDiagnostics.evaluatedSignals`
- `evidenceDate`: `generatedAt`

### Calibration

Use `SignalCalibrationEngineService.latestPersistedForInstruments(...)` over the current bounded Research Hub review pool only.

Recommended conservative mapping before accepted `CF-W1-CAL-01` trust-state fields are merged into `dev`:

- at least one persisted calibration row with usable public readiness and no `UNAVAILABLE` dominance: `LIMITED`
- persisted rows exist but only limited influence or mixed missing evidence: `LIMITED`
- persisted rows absent or all unavailable: `UNPROVEN` or `INSUFFICIENT_DATA`
- upstream lookup failure: `INSUFFICIENT_DATA`

Reason for the cap:

- current `dev` calibration output exposes readiness and evidence, but not the richer `trustState` semantics defined in accepted `CF-W1-CAL-01`;
- Research Hub must not fabricate a `READY` / trusted calibration dimension before that public trust-state packet is present on `dev`.

Preferred evidence fields:

- `count`: number of candidate instruments with persisted calibration rows
- `evidenceDate`: most recent `generatedAt` across the bounded pool

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- optional only if module-local helper aliases are needed without expanding the response shape: `backend/src/modules/research-hub/research-hub.types.ts`

## Forbidden Files

- all application source and tests before Team 00 promotion
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- all `frontend/src/features/research-hub/**`
- all `frontend/tests/ui/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `backend/src/modules/today-trade-review/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/signal-calibration-engine/**`
- all other upstream module source edits, including private repositories/helpers
- shared backend utilities
- shared frontend components
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- package manifests
- generated files
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry scope
- broad frontend redesign

## Dependency And Sequencing Notes

- `CF-W1-L3-TREV-01`: non-blocking compatibility dependency. The first child can consume current `dev` Today Review public outputs now. If `publicationEvidence` merges later, Research Hub should prefer the additive public field without reopening Today Review source.
- `CF-W1-TP-02`: non-blocking compatibility dependency. The first child can consume current `dev` Trade Plan public paper-readiness outputs now. If the active TP-02 branch lands later, Research Hub must preserve compatibility and use only module-owned public semantics.
- `CF-W1-SQLAB-01`: sequencing dependency for future stronger trust mapping, not a blocker for this child. Before its accepted trust-state fields are merged into `dev`, Research Hub must cap Signal Quality at `LIMITED`, `UNPROVEN`, or `INSUFFICIENT_DATA`.
- `CF-W1-CAL-01`: sequencing dependency for future stronger trust mapping, not a blocker for this child. Before its accepted trust-state fields are merged into `dev`, Research Hub must cap Calibration at `LIMITED`, `UNPROVEN`, or `INSUFFICIENT_DATA`.
- Do not treat accepted or active branch docs as proof that those branch commits are already merged into `dev`.

## QA Planning Handoff For Team 04

Team 04 can start QA planning now for the backend-only first child.

Minimum backend scenarios:

- Today Review maps to `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA` through mocked public `latest(...)` responses only.
- Trade Plan maps to `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA` through mocked public `funnelDiagnostics(...)` or bounded list responses only.
- Signal Quality no longer returns placeholder insufficiency when public summary exists, but remains capped below `READY` on current `dev` semantics.
- Calibration no longer returns placeholder insufficiency when persisted public calibration rows exist, but remains capped below `READY` on current `dev` semantics.
- `canReviewActionableSetups` stays conservative and does not imply direct advice or broker authorization.
- `nextBestAction`, blockers, and dimension messages remain research-support only and avoid forbidden wording.
- Service behavior fails closed when any upstream public read is unavailable instead of fabricating trust.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

Team 04 should explicitly record that frontend Research Hub rendering changes are deferred from this child.

## Readiness Result

Ready candidate.

- The smallest bounded first child is feasible.
- No split is required inside the bounded child itself.
- The child is backend-only by design.
- Private upstream internals, fabricated trust scoring, schema, route registry, shared utility/UI, provider/live-data, startup/backfill, package/generated files, broad frontend redesign, and upstream module source edits remain explicitly blocked.
- Team 04 QA planning is the next gate.

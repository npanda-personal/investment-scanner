# CF-W1-RH-01 Research Hub Actionability Evidence Wiring Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Contract prepared from current source and dependency-boundary review.

Ready recommendation: `Ready candidate` for Team 04 QA handoff and Team 00 sequencing, not self-promoted for implementation.

## Contract Intent

Research Hub must stop presenting stable upstream actionability dimensions as permanent placeholders when bounded public evidence is already available on `dev`.

This first contract is backend-only and additive. It preserves the existing Research Hub actionability response shape while replacing placeholder status/message/count/date values for:

- `todayReviewReadiness`
- `tradePlanReadiness`
- `signalEvidence`
- `calibrationReadiness`

The module remains research-support only. It must not imply direct financial advice, broker authorization, execution permission, or target-price certainty.

## Ownership

`research-hub` owns this behavior.

Upstream evidence owners remain unchanged:

- Today Review owns review publication/readiness semantics.
- Trade Plan owns paper-readiness semantics.
- Signal Quality Lab owns evidence-usability semantics.
- Signal Calibration Engine owns calibration-readiness semantics.

Research Hub must consume those public outputs and must not duplicate or redefine upstream logic.

## Exact Public Read Boundary

Allowed public read surfaces:

- `TodayTradeReviewService.latest({ region, assetType })`
- `TradePlanRiskEngineService.funnelDiagnostics({ region, assetType })`
- optional only if bounded summary extraction truly needs it: `TradePlanRiskEngineService.list(...)`
- `SignalQualityLabService.summary({ horizon, limit, minSampleSize, region, assetType, ... })`
- `SignalCalibrationEngineService.latestPersistedForInstruments(instrumentIds)`

Allowed public DTO fields include:

- Today Review `run.status`, `finishedAt`, `reviewUniverseMode`, `candidateCounts`, `sourceSnapshot.reviewReadiness`, `sourceSnapshot.scanFunnel`
- Trade Plan public paper-readiness counts, proof-chain blocker summaries, and response `generatedAt`
- Signal Quality public `selectedHorizon`, `evidenceUsability`, `evaluationDiagnostics`, `horizonAvailability`, `recommendedAction`, `generatedAt`
- Calibration public `generatedAt`, `calibrationReadiness`, and `calibrationEvidence`

Forbidden:

- upstream repositories
- upstream private helper functions
- upstream controller/router internals
- branch-only fields that are not yet merged into `dev`
- direct source edits to Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration Engine

## Required Adapter Rules

### Response Shape

Keep the existing `ResearchActionability` shape.

Do not add new actionability dimension keys in this first child.

Use the existing additive fields only:

- `status`
- `count`
- `evidenceDate`
- `message`
- `sourceModule`
- blocker list entries

### Today Review Dimension

Research Hub must:

- map Today Review from the public `latest(...)` response only;
- expose explicit `READY`, `LIMITED`, `BLOCKED`, or `INSUFFICIENT_DATA` semantics from public run/readiness fields;
- expose candidate publication count and evidence date when public fields exist;
- fail closed when no stable latest run exists.

Research Hub must not:

- call Today Review repository methods;
- recompute trusted-universe membership internally;
- assume `CF-W1-L3-TREV-01` branch-only `publicationEvidence` exists on `dev`.

If `publicationEvidence` later exists on merged `dev`, Research Hub may prefer it through the public Today Review DTO only.

### Trade Plan Dimension

Research Hub must:

- map Trade Plan readiness from public paper-readiness outputs only;
- use module-owned public counts and blocker summaries rather than recomputing plan eligibility from candidate details;
- expose ready/watch/blocked/insufficient semantics conservatively.

Research Hub must not:

- inspect Trade Plan repository rows directly;
- derive its own exit or invalidation semantics;
- reopen TP-02 design work inside Research Hub.

### Signal Quality Dimension

Research Hub must:

- consume current `dev` Signal Quality summary as public evidence-availability input;
- stop using placeholder insufficiency when public summary exists;
- use `evaluationDiagnostics.evaluatedSignals` and `generatedAt` when available.

Before accepted `CF-W1-SQLAB-01` trust-state fields are merged into `dev`, Research Hub must cap current Signal Quality mapping at:

- `LIMITED`
- `UNPROVEN`
- `INSUFFICIENT_DATA`

Research Hub must not:

- invent a `READY` / trusted signal-evidence state from current `dev` evidence-usability alone;
- duplicate Signal Quality outcome-confidence logic locally.

### Calibration Dimension

Research Hub must:

- use bounded candidate-pool `latestPersistedForInstruments(...)` reads only;
- expose persisted calibration presence, missing evidence, and public readiness semantics conservatively;
- fail closed when persisted calibration evidence is absent or unavailable.

Before accepted `CF-W1-CAL-01` trust-state fields are merged into `dev`, Research Hub must cap current Calibration mapping at:

- `LIMITED`
- `UNPROVEN`
- `INSUFFICIENT_DATA`

Research Hub must not:

- invent a `READY` / trusted calibration state from current `dev` readiness alone;
- trigger on-demand recalibration;
- use private repository methods.

## Conservative Boolean Rule

`canReviewActionableSetups` must remain conservative.

Required behavior:

- do not set it `true` while Today Review or Trade Plan remains anything other than `READY`;
- do not set it `true` when any dimension is `BLOCKED` or `INSUFFICIENT_DATA`;
- if Signal Quality or Calibration remains capped below `READY` solely because accepted trust-state packets are not yet merged into `dev`, keeping the boolean `false` is correct for this first child.

This packet is primarily about accurate dimension evidence, not about forcing a positive reviewability boolean.

## Compatibility Rules

- Keep the existing `/api/v1/research/overview` route unchanged.
- Keep current frontend feature files untouched in the first child.
- Preserve existing `marketReadiness`, `researchPriorities`, `strategyProofSummary`, `confirmationSummary`, `whatChanged`, `nextActions`, `generatedAt`, and `dataGaps` shapes.
- Preserve the existing actionability dimension keys.
- Do not remove or rename current fields.
- Do not widen `whatChanged` into true delta traceability in this slice.

## Forbidden Behavior

- Do not fabricate trust scoring or new numeric actionability scores.
- Do not consume private upstream internals.
- Do not edit upstream module source files.
- Do not add schema, migration, generated-type, route-registry, shared utility, or shared UI changes.
- Do not add provider/live-data, startup/backfill, package, paid/cloud, broker, or telemetry scope.
- Do not broaden this child into a frontend redesign or a Research Hub UX rewrite.
- Do not use advice-like, target-like, or automation wording.

## Test Contract

Focused backend tests must prove:

- Today Review dimension uses public run/readiness output rather than placeholders;
- Trade Plan dimension uses public paper-readiness output rather than placeholders;
- Signal Quality dimension no longer returns default insufficiency when public summary exists, but also does not claim `READY` before `CF-W1-SQLAB-01` semantics exist on `dev`;
- Calibration dimension no longer returns default insufficiency when persisted public evidence exists, but also does not claim `READY` before `CF-W1-CAL-01` semantics exist on `dev`;
- missing upstream public evidence fails closed;
- `canReviewActionableSetups` stays conservative;
- response language remains research-support only.

## Dependency Sequencing Rule

- `CF-W1-L3-TREV-01`: compatibility dependency only; not a blocker for this child.
- `CF-W1-TP-02`: compatibility dependency only; not a blocker for this child.
- `CF-W1-SQLAB-01`: semantic-upgrade dependency for future stronger Signal Quality trust mapping; not a blocker for this child.
- `CF-W1-CAL-01`: semantic-upgrade dependency for future stronger Calibration trust mapping; not a blocker for this child.

Do not treat accepted or active branch artifacts for those packets as already merged into `dev`.

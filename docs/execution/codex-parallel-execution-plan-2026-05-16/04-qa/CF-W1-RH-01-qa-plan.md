# CF-W1-RH-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Research Hub actionability evidence wiring QA plan prepared. `CF-W1-RH-01` is QA-plan ready for Team 00 Ready evaluation as one bounded backend-only `research-hub` slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved backend files only.

Current status refresh: Team 03 prepared the bounded architecture review, contract, and work packet on 2026-05-18. Team 04 aligns this QA plan to the same backend-only adapter child and does not widen it into frontend Research Hub work, upstream source edits, schema work, route work, shared utility/UI changes, provider/live-data work, package changes, or generated-file changes.

## QA Intent

Research Hub should stop presenting stable upstream actionability dimensions as permanent placeholder insufficiency when bounded public evidence already exists on `dev`. This QA plan therefore focuses on proving two things at the same time:

- placeholder insufficiency is replaced with module-owned public evidence for Today Review, Trade Plan, Signal Quality, and Calibration; and
- Research Hub still fails closed, stays research-support only, and does not overstate reviewability on current `dev`.

## Scope

Validation plan for additive backend actionability evidence wiring in `CF-W1-RH-01`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- optional only if helper aliases are needed without expanding the response shape: `backend/src/modules/research-hub/research-hub.types.ts`

Out of scope for this first child:

- all `frontend/src/features/research-hub/**` files, including `api/researchHubApi.ts`, `hooks/useResearchOverview.ts`, `components/ResearchOverviewPage.tsx`, and `frontend/tests/ui/research-hub.spec.ts`
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- backend/frontend route registries
- Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration Engine source/test edits
- shared backend utilities, shared UI, Prisma, migrations, generated files, package manifests, providers, startup/backfill, paid/cloud, telemetry, broker, or live-data work
- `CF-W1-RH-02` `whatChanged` traceability work or any broader Research Hub redesign

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-RH-01-architecture-review.md`
- `06-contracts/CF-W1-RH-01-research-hub-actionability-evidence-wiring-contract.md`
- `08-work-packets/CF-W1-RH-01-work-packet.md`
- `10-requirements/CF-W1-RH-01-research-hub-actionability-evidence-wiring-requirement.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Current source alignment that this QA plan depends on:

- `research-hub.service.ts` already owns all actionability aggregation in one bounded adapter method, but still hard-codes `signalEvidence`, `calibrationReadiness`, `todayReviewReadiness`, and `tradePlanReadiness` through `unstableDimension(...)` placeholders.
- `research-hub.types.ts` already supports the status vocabulary this child needs: `READY`, `LIMITED`, `BLOCKED`, `UNPROVEN`, and `INSUFFICIENT_DATA`, plus additive `count`, `evidenceDate`, `message`, `sourceModule`, and blocker metadata.
- `research-hub.service.test.ts` already proves conservative behavior such as `canReviewActionableSetups=false` and research-support wording; this child should replace placeholder-specific assertions with public-output mapping assertions instead of widening into route or frontend tests.
- `TodayTradeReviewService.latest(...)` already exists on `dev` and exposes public latest-run data including run status, `reviewUniverseMode`, `candidateCounts`, `sourceSnapshot`, and `finishedAt`.
- `TradePlanRiskEngineService.funnelDiagnostics(...)` already exists on `dev` and exposes public paper-readiness summary counts, blocker summaries, proof-chain context, and `generatedAt`.
- `SignalQualityLabService.summary(...)` already exists on `dev` and exposes public `selectedHorizon`, `evidenceUsability`, `evaluationDiagnostics`, `recommendedAction`, and `generatedAt`, but the richer `CF-W1-SQLAB-01` outcome-confidence packet must not be assumed merged into `dev`.
- `SignalCalibrationEngineService.latestPersistedForInstruments(...)` already exists on `dev` and exposes persisted `calibrationReadiness`, `calibrationEvidence`, and `generatedAt`, but the richer `CF-W1-CAL-01` trust-state packet must not be assumed merged into `dev`.
- Research Hub frontend rendering is already generic, and a feature-local UI smoke exists today, but this child intentionally requires no frontend edits. Any frontend file touch is a reject condition for this first slice.

## Required QA Assertions

- Existing `ResearchActionability` shape remains intact. Current dimension keys, `headline`, `researchSupportOnly`, `nextBestAction`, blocker array, and non-actionability overview sections remain present and unrenamed.
- Today Review uses `TodayTradeReviewService.latest(...)` public output only:
  - `READY` maps from a completed full-review public run with readiness snapshot present
  - `LIMITED` maps from public limited-review or partial-review semantics
  - `BLOCKED` maps from failed/no-review public semantics
  - `INSUFFICIENT_DATA` maps from missing latest-run evidence or missing readiness snapshot
- Today Review exposes bounded count/date evidence when public fields exist:
  - candidate count comes from public `candidateCounts`
  - evidence date comes from public `finishedAt` or equivalent public run evidence
- Trade Plan uses public paper-readiness output only, preferring `funnelDiagnostics(...)`:
  - `READY` maps from non-zero ready-for-paper-review public count
  - `LIMITED` maps from watch-only public count when ready count is zero
  - `BLOCKED` maps from blocked public count when ready and watch counts are zero
  - `INSUFFICIENT_DATA` maps from missing stable summary or insufficient-only public evidence
- Trade Plan does not recompute geometry, exit semantics, invalidation semantics, or candidate eligibility inside Research Hub.
- Signal Quality summary replaces placeholder insufficiency whenever a public SQLAB summary exists.
- On current `dev`, Signal Quality must not overstate trust:
  - `evidenceUsability = USABLE` or `LIMITED` may raise the dimension to `LIMITED`
  - public summary showing unavailable selected-horizon evidence may map to `UNPROVEN`
  - missing public summary or no relevant public evidence maps to `INSUFFICIENT_DATA`
  - `READY` is not allowed for this dimension until richer SQLAB trust-state semantics are actually merged into `dev`
- Calibration persisted-read mapping replaces placeholder insufficiency whenever persisted public calibration rows exist.
- On current `dev`, Calibration must not overstate trust:
  - persisted rows with usable or limited public readiness can raise the dimension to `LIMITED`
  - persisted rows that are unavailable-only or missing-evidence-heavy map to `UNPROVEN` or `INSUFFICIENT_DATA`
  - public lookup failure maps to `INSUFFICIENT_DATA`
  - `READY` is not allowed for this dimension until richer CAL trust-state semantics are actually merged into `dev`
- Missing upstream public evidence fails closed:
  - no positive Research Hub dimension may be inferred from market-open status, raw signal counts, or other unrelated healthy dimensions
  - if an upstream public read is unavailable, missing, or throws, the affected dimension stays conservative rather than inheriting trust
- `canReviewActionableSetups` stays conservative and research-support only:
  - it remains `false` whenever Today Review is not `READY`
  - it remains `false` whenever Trade Plan is not `READY`
  - it remains `false` whenever any dimension is `BLOCKED` or `INSUFFICIENT_DATA`
  - it remains `false` on current `dev` if Signal Quality or Calibration stay capped below `READY`
- `nextBestAction`, dimension messages, blockers, and headline remain research-support only:
  - allow wording such as `review`, `evidence`, `consider review`, `limited`, `blocked`, `data gap`, and `insufficient data`
  - reject `buy now`, `sell now`, `must buy`, `must sell`, `price target`, `profit target`, `guaranteed`, broker, order-placement, execution, or automation wording
- QA must reject the packet if implementation touches frontend Research Hub files, upstream source files, route registries, schema/generated files, shared utility/UI, providers/live data, startup/backfill, packages, paid/cloud, broker, telemetry, or `CF-W1-RH-02` scope.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Today Review ready via public latest run | Completed full-review public run with readiness snapshot maps `todayReviewReadiness` to `READY`, carries public candidate count, and exposes a public evidence date. |
| Today Review limited via public latest run | Public limited-review or partial-review semantics map `todayReviewReadiness` to `LIMITED`; no stronger state is inferred. |
| Today Review blocked via public latest run | Public failed/no-review semantics map `todayReviewReadiness` to `BLOCKED` with a visible blocker message. |
| Today Review insufficient evidence | Missing latest run, missing readiness snapshot, or unavailable public read maps `todayReviewReadiness` to `INSUFFICIENT_DATA`; Research Hub does not fall back to a positive state. |
| Trade Plan ready via public funnel | Non-zero ready-for-paper-review public count maps `tradePlanReadiness` to `READY` with public count/date evidence. |
| Trade Plan limited via watch-only public evidence | Zero ready count plus non-zero watch-only public count maps `tradePlanReadiness` to `LIMITED` and stays review-only. |
| Trade Plan blocked via public blocker summary | Zero ready/watch counts plus blocked public evidence maps `tradePlanReadiness` to `BLOCKED` with visible blocker summary. |
| Trade Plan insufficient evidence | Missing stable funnel/list summary or insufficient-only public evidence maps `tradePlanReadiness` to `INSUFFICIENT_DATA`; Research Hub does not fabricate reviewability. |
| Signal Quality public summary exists with usable evidence | `signalEvidence` is no longer placeholder insufficiency; it maps to `LIMITED`, not `READY`, and surfaces public count/date/message fields. |
| Signal Quality public summary exists but selected horizon is unavailable | `signalEvidence` maps to `UNPROVEN` with a selected-horizon evidence gap reason rather than placeholder insufficiency or false readiness. |
| Signal Quality public summary missing | `signalEvidence` maps to `INSUFFICIENT_DATA`; Research Hub does not inherit trust from raw signal counts alone. |
| Calibration persisted rows exist with usable bounded readiness | `calibrationReadiness` is no longer placeholder insufficiency; it maps to `LIMITED`, not `READY`, and surfaces persisted count/date/message fields. |
| Calibration persisted rows exist but are unavailable-only or mixed with missing evidence | `calibrationReadiness` maps conservatively to `UNPROVEN` or `INSUFFICIENT_DATA`; it does not read as usable trust. |
| Calibration lookup failure | Public calibration read failure maps `calibrationReadiness` to `INSUFFICIENT_DATA` and leaves the boolean conservative. |
| Combined conservative boolean on current `dev` | Even with Today Review and Trade Plan mapped from public outputs, `canReviewActionableSetups` remains `false` if Signal Quality or Calibration stay capped below `READY` on current `dev`. |
| Research-support wording preserved | Messages, blockers, next-best action, and headline remain research-support only with no target/advice/broker/automation wording. |
| Scope drift attempt | Any frontend Research Hub touch, upstream source edit, route/schema/shared/provider/package/generated widening, or coupling to `CF-W1-RH-02` is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Optional product-language scan after reserved implementation exists:

```powershell
rg -n "buy now|sell now|must buy|must sell|price target|profit target|guaranteed|broker|order placement|live trading|automation" backend/src/modules/research-hub backend/tests/modules/research-hub
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, UI smoke, and live data

Forbidden by default for this slice:

- frontend Research Hub file edits or UI smoke updates as a backdoor for actionability wiring
- Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration Engine source/test edits as a backdoor for Research Hub evidence wiring
- controller/router/index or route-registry widening
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved `research-hub` service/doc/test files plus optional module-local types helper
- implementation touches frontend Research Hub files, backend/frontend route registries, controller/router/index files, or shared utilities/UI
- implementation requires Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration source edits or private-internal access
- implementation requires Prisma/schema/generated changes, package changes, provider/live-data work, startup/backfill, or broader Research Hub redesign
- implementation turns `canReviewActionableSetups` positive without proving current-`dev` public semantics justify it
- implementation couples this packet to `CF-W1-RH-02` or any `whatChanged` redesign

## Evidence Required Later

- Exact implementation handoff limited to the reserved `research-hub` backend files
- Scenario evidence for Today Review `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA`
- Scenario evidence for Trade Plan `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA`
- Proof that Signal Quality and Calibration no longer return placeholder insufficiency when public evidence exists
- Proof that Signal Quality and Calibration do not overstate trust on current `dev`
- Proof that missing upstream public evidence fails closed
- Proof that `canReviewActionableSetups` remains conservative and research-support only
- Focused service-test output only after approval
- Build output only after approval
- Explicit note that no frontend Research Hub files, upstream source files, route/schema/shared/provider/package/generated scope, or `CF-W1-RH-02` work was touched

## QA Verdict For Team 00

`CF-W1-RH-01` is QA-plan ready for Team 00 Ready evaluation.

Current blockers and risks:

- executable QA remains blocked until Team 00 promotes the bounded backend-only `research-hub` handoff
- accepted `CF-W1-SQLAB-01` and `CF-W1-CAL-01` packets must not be assumed merged into `dev`, so this child must keep Signal Quality and Calibration capped below `READY`
- implementers could accidentally make `canReviewActionableSetups=true` from only Today Review and Trade Plan readiness, which would overstate current-`dev` trust
- implementers could widen the slice into frontend Research Hub files or upstream source edits unless Team 00 keeps the reservation exact

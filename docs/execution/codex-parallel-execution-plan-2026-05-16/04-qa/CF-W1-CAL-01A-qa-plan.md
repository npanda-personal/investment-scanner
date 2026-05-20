# CF-W1-CAL-01A QA Plan

Date: 2026-05-19

Owner: Team 04 QA Factory

Status: Docs-only QA plan prepared. `CF-W1-CAL-01A` is `QA-READY / READY-FOR-TEAM00-EVALUATION` as one bounded backend-only `signal-calibration-engine` trust-state child. Executable QA remains blocked until Team 00 promotes the packet and an implementation handoff exists for the reserved calibration files only.

Current status refresh: Team 03 marked `CF-W1-CAL-01A` as `ACCEPT / READY-CANDIDATE` on 2026-05-19. Team 04 confirms the QA packet is aligned to the requirement, architecture review, contract, work packet, and Team 03 outbox, with sequencing constrained to parked parent `CF-W1-CAL-01` commit `fd3d464` or one explicitly authorized combined calibration pass from current `dev`.

## QA Intent

This slice is only valuable if calibration trust becomes clearer without changing calibration math or widening scope. QA therefore focuses on proving that the service fails closed on blocking or missing DQ evidence, preserves existing compatibility fields, and keeps calibration useful for inspection without letting weak evidence look like normal downstream trust.

## Scope

Validation plan for additive calibration DQ readiness trust semantics in `signal-calibration-engine`.

In-scope surfaces after Team 00 promotion and bounded implementation handoff:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Out of scope for this child:

- Prisma, migrations, package manifests, generated files, or route registries
- repository, controller, router, validation, module, or index edits
- `signal-quality-lab`, `data-quality-engine`, `historical-context-snapshots`, or `trade-plan-risk-engine` source/test edits
- `CF-W1-TP-01A`, `CF-W1-TP-02`, or `CF-W1-L3-DQ-01` scope absorption
- frontend source, frontend tests, shared backend utilities, or shared frontend UI
- provider, live-market, startup, backfill, telemetry, paid/cloud, or broker work
- score-formula rewrites, new persistence, or broader API restructuring

This planning task does not approve application code edits, tests, builds, services, or provider calls. It records the QA packet only.

## Sequencing Gate

Executable QA is valid only if the future implementation handoff matches one of these Team 00-approved paths:

1. stack `CF-W1-CAL-01A` on parked parent `CF-W1-CAL-01` commit `fd3d464`; or
2. authorize one combined `signal-calibration-engine` pass from current `dev` that carries both parent trust-state fields and child DQ gate semantics in the same reserved writer set.

Reject the QA handoff if the implementation arrives from an unapproved base or opens a parallel writer on the same calibration files.

## Required QA Assertions

- `TRUSTED` requires clean current DQ, sufficient selected-horizon evidence, preserved calibrated-score behavior, and `downstreamInfluence = NORMAL`.
- `LIMITED` is used for low sample or non-blocking context gaps only, with DQ present and `downstreamInfluence = LIMITED`.
- `DIAGNOSTIC_ONLY` is used when latest DQ evidence is missing, never with normal downstream influence, and with `authoritativeScore = RAW_SCORE`.
- `UNAVAILABLE` is used when selected-horizon evidence is absent, raw score is absent, or DQ is explicitly blocking.
- `dqGateState` is mandatory on `calibrationReadiness` for every service-local scenario:
  - `PASS` when latest DQ exists and no explicit blocker is present.
  - `MISSING` when latest DQ evaluation is absent and calibration remains inspection-only.
  - `BLOCKED` when any explicit DQ blocker is present.
- Explicit DQ blockers fail closed one by one:
  - `eligibleForCalibration = false`
  - `eligibleForSignals = false`
  - `signalReadinessStatus = NOT_READY`
  - `coverageStatus = UNUSABLE`
  - `liquidityStatus = ILLIQUID`
- Every blocked DQ case must set `trustState = UNAVAILABLE`, suppress normal downstream influence, and expose a stable blocker reason.
- Missing latest DQ evaluation must never produce `TRUSTED`, `LIMITED`, or `downstreamInfluence = NORMAL`.
- Existing score math remains unchanged.
- Existing compatibility fields remain intact, including current `calibrationReadiness.status`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, reasons, blockers, warnings, and score-bearing fields.
- Accepted parent compatibility fields from parked `CF-W1-CAL-01` commit `fd3d464` remain intact, including `trustState`, `trustReasonCode`, and `trustReason`.
- New trust-state and DQ-gate metadata are additive only.
- Research-support language is preserved. No target-price framing and no direct financial advice.

## Scenario Matrix

| Scenario | Expected assertion after implementation | Trust value being protected |
| --- | --- | --- |
| Trusted clean-DQ calibration | Sufficient selected-horizon evidence, latest DQ present, no blocker, `trustState=TRUSTED`, `dqGateState=PASS`, `downstreamInfluence=NORMAL`. | Calibration looks trustworthy only when evidence and DQ both support it. |
| Limited low-sample calibration | Evidence exists with low sample, DQ present, `trustState=LIMITED`, `dqGateState=PASS`, `downstreamInfluence=LIMITED`. | Weak sample support remains reviewable without looking fully trusted. |
| Limited context-gap calibration | Evidence exists with non-blocking context gaps, DQ present, `trustState=LIMITED`, `dqGateState=PASS`, and reasons explain the gap. | Partial context cannot be mistaken for fully backed calibration. |
| Diagnostic-only missing latest DQ | Evidence is inspectable but latest DQ is absent, `trustState=DIAGNOSTIC_ONLY`, `dqGateState=MISSING`, `authoritativeScore=RAW_SCORE`, and downstream influence is not `NORMAL`. | Inspection remains possible, but trust is withheld. |
| Unavailable no selected-horizon evidence | Selected horizon has zero evaluated evidence, `trustState=UNAVAILABLE`, `downstreamInfluence=NONE`, and calibration does not masquerade as usable. | No evidence means no trustworthy calibration basis. |
| Unavailable `eligibleForCalibration=false` | Explicit stable blocker reason, `trustState=UNAVAILABLE`, `trustReasonCode=UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, `downstreamInfluence=NONE`, and no `LIMITED` fallback. | DQ disqualification cannot leak through as a soft penalty only. |
| Unavailable `eligibleForSignals=false` | Explicit stable blocker reason, `trustState=UNAVAILABLE`, `trustReasonCode=UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, `downstreamInfluence=NONE`, and no `LIMITED` fallback. | Signal-ineligible rows cannot be recast as trusted calibration. |
| Unavailable `NOT_READY` | Explicit stable blocker reason, `trustState=UNAVAILABLE`, `trustReasonCode=UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, `downstreamInfluence=NONE`, and no `LIMITED` fallback. | Not-ready DQ state cannot appear usable. |
| Unavailable `UNUSABLE` | Explicit stable blocker reason, `trustState=UNAVAILABLE`, `trustReasonCode=UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, `downstreamInfluence=NONE`, and no `LIMITED` fallback. | Unusable coverage cannot be softened into normal trust. |
| Unavailable `ILLIQUID` | Explicit stable blocker reason, `trustState=UNAVAILABLE`, `trustReasonCode=UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, `downstreamInfluence=NONE`, and no `LIMITED` fallback. | Illiquid conditions cannot be presented as dependable calibration. |
| Score math and compatibility preservation | Raw score, calibrated score behavior, and existing response fields remain unchanged; additive trust fields do not remove or rename current surfaces. | Consumers gain clarity without integration drift. |
| Sequencing and scope discipline | Implementation is based on `fd3d464` or one authorized combined pass and stays inside the reserved calibration file set only. | The child remains bounded and reviewable. |

## Service-Local Test Design

Future service tests should stay in `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts` and use in-memory service fixtures. They should not invoke routes, Prisma, providers, startup jobs, frontend UI, or sibling modules beyond mocked public outputs.

Required focused assertions:

- clean DQ fixture: `eligibleForCalibration=true`, `eligibleForSignals=true`, `signalReadinessStatus=READY`, non-blocking coverage/liquidity, sufficient selected-horizon evidence, and expected `TRUSTED` plus `dqGateState=PASS`.
- low-sample fixture: DQ still clean and present, low sample evidence, expected `LIMITED` plus `dqGateState=PASS`.
- context-gap fixture: DQ still clean and present, non-blocking missing context gaps, expected `LIMITED` plus `dqGateState=PASS`.
- missing-DQ fixture: no latest DQ evaluation, evidence otherwise inspectable, expected `DIAGNOSTIC_ONLY`, `dqGateState=MISSING`, `authoritativeScore=RAW_SCORE`, and downstream influence not `NORMAL`.
- no-selected-horizon-evidence fixture: selected horizon has zero evaluated outcomes, expected `UNAVAILABLE`, `downstreamInfluence=NONE`, and raw-score preservation when raw score exists.
- one fixture per explicit DQ blocker, each expected to produce `UNAVAILABLE`, `UNAVAILABLE_BLOCKING_DQ`, `dqGateState=BLOCKED`, stable blocker text, no normal downstream influence, and no `TRUSTED` or `LIMITED` outcome.
- compatibility fixture: compare pre-child score-bearing outputs for representative clean/low-sample/DQ-blocked inputs so `rawScore`, `calibratedScore`, `scoreDelta`, `boosts`, `penalties`, `calibrationApplied`, `adjustmentCapApplied`, `calibrationEvidence`, `reasons`, `blockers`, `warnings`, and parent `trustState` fields are not removed, renamed, or recalculated outside the intended additive gate.

## Focused Command Guidance

Commands below are future guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 promotion and bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation handoff, Team 00 sequencing confirmation, and resource check:

```powershell
cd backend
npm.cmd run build
```

## Reject Triggers

Reject the implementation handoff for this child if any of the following occurs:

- edits outside the reserved calibration service/types/doc/test writer set
- Prisma, migration, generated-file, or package-manifest changes
- backend or frontend route-registry changes
- repository, controller, router, validation, module, or index edits
- shared backend utility or shared frontend component changes
- frontend source or frontend test changes
- provider, live-market, startup, backfill, telemetry, paid/cloud, or broker scope
- `signal-quality-lab`, `data-quality-engine`, `historical-context-snapshots`, `trade-plan-risk-engine`, `CF-W1-TP-01A`, `CF-W1-TP-02`, or `CF-W1-L3-DQ-01` implementation scope entering the same pass
- score-math rewrites instead of additive trust-state gating
- removal, renaming, or contract drift in current score-bearing or compatibility fields

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, and provider/live-data validation
- UI smoke checks

Forbidden by default for this slice:

- Prisma generate, migrate, db push, or db execute
- frontend Playwright or frontend calibration workflow checks
- broad backend regression suites unrelated to the reserved file set
- provider/live-data workflows

## Evidence Required Later

- Exact implementation handoff limited to the reserved `signal-calibration-engine` files
- Confirmation of Team 00 sequencing on parked parent commit `fd3d464` or one explicitly authorized combined calibration pass
- Focused scenario results for `TRUSTED`, `LIMITED`, `DIAGNOSTIC_ONLY`, and `UNAVAILABLE`
- Focused scenario results for each explicit DQ blocker:
  - `eligibleForCalibration = false`
  - `eligibleForSignals = false`
  - `NOT_READY`
  - `UNUSABLE`
  - `ILLIQUID`
- Confirmation that score math and compatibility fields are preserved
- Exact commands run, skipped checks, skip reasons, and next owner for any remaining blocker

## QA Verdict For Team 00

`ACCEPT / READY-FOR-TEAM00-EVALUATION`

Current blockers and risks:

- executable QA remains blocked until Team 00 promotes the bounded handoff
- implementation could blur missing-DQ and blocking-DQ into one vague reason unless each path is asserted separately
- implementation could preserve one blocker as penalty-only behavior unless all five explicit DQ blockers receive focused assertions
- any drift into Prisma, routes, shared files, frontend, packages, generated files, provider scope, or sibling slices must be treated as a reject condition for this child

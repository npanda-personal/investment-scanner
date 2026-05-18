# CF-W1-CAL-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Docs-only QA plan refreshed. `CF-W1-CAL-01` is QA-plan ready for Team 00 Ready evaluation as one bounded backend-only `signal-calibration-engine` child. Executable QA remains blocked until Team 00 promotes the packet and an implementation handoff exists for the reserved files only.

Current status refresh: Team 03 returned `CF-W1-CAL-01` as a `Ready candidate` on 2026-05-18. Team 04 confirms the QA packet is now aligned to the requirement, architecture review, contract, work packet, and Product Owner correction to prioritize direct investor/trader value through clearer research-trust framing rather than broader calibration expansion.

## QA Intent

Calibration is valuable only when an investor or trader can tell whether it is strong enough for research comparison, only usable with caution, merely diagnostic, or unavailable. This QA plan therefore focuses on proof that the first child makes trust limits obvious without changing score math, widening scope, or making calibration look more authoritative than its evidence.

## Scope

Validation plan for additive calibration trust-state semantics in `signal-calibration-engine`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- optional only if the implementation adds endpoint-level additive response assertions: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Out of scope for the first child:

- repository, controller, router, validation, Prisma, migration, package, generated, or route-registry changes
- Signal Quality Lab source/export changes
- Data Quality Engine source/export changes
- Historical Context Snapshots source changes
- frontend calibration UI or dashboard changes
- provider, live-market, paid/cloud, telemetry, broker, startup/backfill, build, or UI smoke work
- score-formula rewrite, new model behavior, or new persistence

This plan does not approve application source edits, test edits, builds, services, or providers. It records the QA packet only.

## Required QA Assertions

- Calibration exposes additive trust-state metadata that clearly distinguishes `TRUSTED`, `LIMITED`, `DIAGNOSTIC_ONLY`, and `UNAVAILABLE`.
- Trusted calibration is reserved for evidence-backed, clean-DQ cases only.
- Limited calibration is reserved for still-usable but cautionary cases such as low sample or non-blocking context gaps.
- Missing DQ alignment is treated as diagnostic-only and must not present normal downstream influence.
- Zero selected-horizon evidence is treated as unavailable rather than limited or diagnostic-only.
- Blocking DQ states fail closed and must not present trusted or normal-influence calibration.
- Each blocking DQ case is asserted explicitly: `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID`.
- Existing score math remains unchanged.
- Existing compatibility fields remain intact, including current `calibrationReadiness.status`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, warnings, and score-bearing fields.
- Research-support wording is preserved; no direct advice, no target-price framing, and no authority inflation.
- Forbidden scope is rejected if the implementation reaches beyond the reserved calibration service/types/doc/test packet.

## Scenario Matrix

| Scenario | Expected assertion after implementation | Investor/trader value being protected |
| --- | --- | --- |
| Trusted evidence-backed calibration | Sufficient selected-horizon evidence, DQ evaluation present, no blocker status, `trustState=TRUSTED`, and `downstreamInfluence=NORMAL`. | Comparable signals can be reviewed with confidence rather than guesswork. |
| Limited low-sample calibration | Historical evidence exists but selected horizon is low sample; `trustState=LIMITED`, `downstreamInfluence=LIMITED`, and the reason points to sample weakness without claiming unavailable. | Weak evidence is still visible but clearly cautionary. |
| Limited context-gap calibration | Historical evidence exists with non-blocking context gaps; `trustState=LIMITED` and reasons explain the gap without overstating certainty. | Partial evidence is reviewable without looking proven. |
| Diagnostic-only missing DQ alignment | Historical evidence exists but latest DQ evaluation is missing; `trustState=DIAGNOSTIC_ONLY` and downstream influence is not `NORMAL`. | Numeric output can still be inspected, but not mistaken for trustworthy calibration. |
| Unavailable no selected-horizon evidence | Selected horizon has no evaluated evidence; `trustState=UNAVAILABLE`, downstream influence is `NONE`, and the response does not masquerade as usable calibration. | Users are told there is no basis for calibrated comparison. |
| Unavailable fail-closed on `eligibleForCalibration=false` | Trust state is unavailable, blocking reason is explicit, and normal downstream influence is suppressed. | Explicit DQ disqualification cannot leak through as a soft penalty only. |
| Unavailable fail-closed on `eligibleForSignals=false` | Trust state is unavailable, blocking reason is explicit, and normal downstream influence is suppressed. | Signals blocked upstream cannot reappear as calibration trust. |
| Unavailable fail-closed on `NOT_READY` | Trust state is unavailable, blocking reason is explicit, and normal downstream influence is suppressed. | Not-ready evidence cannot be misread as usable signal support. |
| Unavailable fail-closed on `UNUSABLE` | Trust state is unavailable, blocking reason is explicit, and normal downstream influence is suppressed. | Broken coverage cannot be diluted into a normal score. |
| Unavailable fail-closed on `ILLIQUID` | Trust state is unavailable, blocking reason is explicit, and normal downstream influence is suppressed. | Illiquid conditions cannot be presented as dependable calibration. |
| Score math and current-field preservation | Existing score calculation outputs and existing response fields still match the current contract; new trust fields are additive only. | Consumers keep current integration behavior while gaining clearer trust framing. |
| Forbidden-scope rejection | QA rejects any implementation that touches repository/controller/router/validation/schema/routes/upstream modules/frontend/shared/package/generated files or rewrites score math. | The direct-value slice stays bounded and reviewable instead of expanding risk. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Optional only if additive route payload assertions are widened:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, providers, and UI smoke
- live data validation

Forbidden by default for this slice:

- SQLAB or DQE source edits or tests as a backdoor for calibration trust-state logic
- frontend Playwright or calibration dashboard checks
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved service/types/doc/test file set
- implementation requires SQLAB, DQE, or Historical Context source/export changes
- implementation changes controller, router, validation, repository, schema, or route contracts
- implementation rewrites score math instead of trust-state gating
- implementation weakens current compatibility fields or removes current evidence/warning surfaces
- the packet starts absorbing `CF-W1-SQLAB-01` or `CF-W1-DQ-02` source work in the same writer pass

## Evidence Required Later

- Exact implementation handoff limited to the reserved `signal-calibration-engine` files
- Scenario results for trusted, limited-low-sample, limited-context-gap, diagnostic-only-missing-DQ, unavailable-no-evidence, and each explicit blocking-DQ case
- Confirmation that `eligibleForCalibration=false`, `eligibleForSignals=false`, `NOT_READY`, `UNUSABLE`, and `ILLIQUID` all fail closed
- Confirmation that score math and current compatibility fields are preserved
- Focused command output only after approval
- Skipped checks with reason and next owner
- Clear note whether optional route-level assertions were added or the QA pass remained service-test only

## QA Verdict For Team 00

`CF-W1-CAL-01` is QA-plan ready for Team 00 Ready evaluation.

Current blockers and risks:

- executable QA is still blocked until Team 00 promotes the bounded backend-only `signal-calibration-engine` handoff
- implementers could collapse missing-DQ and blocking-DQ cases into the same vague reason, reducing trust value even if status flags are technically correct
- implementers could preserve penalty-only behavior for one blocker path unless each listed DQ condition gets its own focused assertion
- any widening into SQLAB, DQE, routes, schema, frontend, or shared files should be treated as a reject condition for this first child

# CF-W1-CAL-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backend-only Signal Calibration reliability-drift QA plan prepared. QA-ready for Team 00 Ready evaluation. Executable validation remains blocked until Team 00 promotes one bounded implementation handoff for the reserved `signal-calibration-engine` files.

Current status refresh: Team 03 revalidated the existing bounded calibration packet on 2026-05-18. Team 04 aligns this QA plan to the same trust-state refinement slice and keeps SQLAB and DQE as read-only public dependencies.

## Scope

Validation plan for additive calibration trust-state semantics in `signal-calibration-engine`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- optional only if the implementation adds endpoint-level additive response assertions: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

Out of scope for this first slice:

- repository, controller, router, validation, Prisma, migration, package, generated, or route-registry changes
- Signal Quality Lab or Data Quality Engine source/export changes
- Historical Context Snapshots source changes
- frontend calibration dashboard changes
- provider, live-market, paid/cloud, telemetry, broker, startup/backfill, or UI smoke work
- score-formula rewrite outside trust-state gating

This plan does not approve application source edits, tests, builds, or services. It records the QA packet only.

## Required QA Assertions

- Calibration exposes additive trust-state metadata that clearly distinguishes `TRUSTED`, `LIMITED`, `DIAGNOSTIC_ONLY`, and `UNAVAILABLE` semantics.
- Blocking DQ states fail closed and prevent normal downstream influence.
- Missing DQ alignment does not present calibration as trusted normal influence.
- Low-sample or context-gap evidence is clearly limited rather than unavailable or fully trusted.
- Zero selected-horizon evidence produces unavailable calibration rather than limited or diagnostic semantics.
- Existing score math and compatibility fields remain backward-compatible, including `calibrationReadiness`, `downstreamInfluence`, `authoritativeScore`, `calibrationEvidence`, and warnings.
- Research-support wording is preserved; no direct advice or target-price semantics appear.

## Scenario Matrix

| Scenario | Expected assertion after implementation |
| --- | --- |
| Sufficient selected-horizon evidence with DQ evaluation present and no blockers | Trust state is trusted; normal downstream influence remains allowed. |
| Evidence exists but selected horizon is low-sample or context is partial | Trust state is limited; downstream influence remains limited and reasons cite low sample or gaps. |
| Historical evidence exists but DQ alignment is missing | Trust state is diagnostic-only; downstream influence is not normal and the result remains research-only. |
| Selected horizon has no evaluated evidence | Trust state is unavailable; calibration does not masquerade as usable evidence. |
| DQ shows `eligibleForCalibration=false` or `eligibleForSignals=false` | Trust state is unavailable and blocking DQ evidence prevents normal influence. |
| DQ shows `NOT_READY`, `UNUSABLE`, or `ILLIQUID` | Trust state is unavailable and fail-closed behavior is explicit. |
| Raw score exists while trust-state is blocked | Compatibility fields still point to raw-score authority where the current contract requires it; score math itself is not rewritten. |
| Additive trust-state is returned through route response | Existing route payload fields remain compatible while new trust-state fields are additive only. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

If the implementation stays fully service-local and does not add route assertions, the minimum focused command is:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Related read-only regression guidance, only if Team 00 explicitly widens post-implementation validation to public dependency compatibility:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
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
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- `signal-calibration-engine.repository.test.ts` unless Team 00 explicitly widens the packet
- SQLAB or DQE source edits or tests as a backdoor for calibration trust-state logic
- frontend Playwright or calibration dashboard UI checks
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved service/types/doc/test file set
- implementation requires SQLAB or DQE source/export changes
- implementation changes controller, router, validation, repository, schema, or route contracts
- implementation rewrites score math rather than trust-state gating
- tests require frontend/dashboard checks or broad Lane 2 cross-module execution
- the packet starts absorbing `CF-W1-SQLAB-01` or `CF-W1-DQ-02` source work in the same writer pass

## Evidence Required Later

- Exact implementation handoff limited to the reserved `signal-calibration-engine` files
- Scenario results for trusted, limited, diagnostic-only, unavailable-no-evidence, and unavailable-blocking-DQ states
- Confirmation that blocking DQ states fail closed without changing calibration score math
- Focused command output only after approval
- Skipped checks with reason and next owner
- Clear note whether optional route-level assertions were added or the QA pass remained service-test only

# CF-W1-SQLAB-01 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Backend-only Signal Quality Lab outcome-confidence QA plan prepared. QA-ready for Team 00 Ready evaluation. Executable validation remains blocked until Team 00 promotes one bounded implementation handoff for the reserved `signal-quality-lab` files.

Current status refresh: Team 03 confirmed the bounded SQLAB trust-labeling packet remains source-aligned on 2026-05-18. Team 04 aligns this QA plan to the same module-local additive confidence slice and does not widen it into Data Quality Engine or downstream consumer edits.

## Scope

Validation plan for additive outcome-confidence labeling in `signal-quality-lab`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- optional only if the implementation adds endpoint-level additive response assertions: `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

Out of scope for this first slice:

- repository, controller, router, validation, Prisma, migration, package, generated, or route-registry changes
- Data Quality Engine source/export changes
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan source changes
- frontend Signal Quality Lab UI changes
- provider, live-market, paid/cloud, telemetry, broker, startup/backfill, or UI smoke work
- new query parameters or changed default DQ filter behavior

This plan does not approve application source edits, tests, builds, or services. It records the QA packet only.

## Required QA Assertions

- SQLAB exposes additive outcome-confidence metadata that clearly distinguishes `TRUSTED`, `LIMITED`, `DIAGNOSTIC`, and `UNTRUSTED` semantics.
- Optional or missing DQ coverage does not silently produce trusted confidence.
- No selected-horizon evidence maps to untrusted rather than limited or diagnostic.
- DQ lookup failure maps to untrusted and is visible as a trust blocker.
- Existing evidence diagnostics, grouped status fields, `recommendedAction`, warnings, and summary/group payloads remain backward-compatible.
- Existing DQ query/filter behavior is preserved for this first slice; the packet does not make DQ required by default.
- Research-support wording is preserved; no direct advice or target-price semantics appear.

## Scenario Matrix

| Scenario | Expected assertion after implementation |
| --- | --- |
| Selected-horizon evidence is usable and DQ support is complete with no hard blockers | Outcome confidence is trusted and reasons explain readiness-backed evidence. |
| Selected-horizon evidence exists but sample is partial or low-sample | Outcome confidence is limited and reasons cite partial selected-horizon support rather than strong proof. |
| Selected-horizon evidence exists but DQ coverage is optional or missing | Outcome confidence is diagnostic and the output remains research-only. |
| Selected-horizon evidence has zero evaluated outcomes | Outcome confidence is untrusted and does not masquerade as usable selected-horizon proof. |
| DQ lookup fails for evaluated sample | Outcome confidence is untrusted and the lookup failure is surfaced explicitly. |
| Existing grouped rows such as `SMALL_SAMPLE` or `INSUFFICIENT_FUTURE_DATA` are present | These remain maturity diagnostics and do not replace the additive outcome-confidence field. |
| Additive outcome-confidence is returned through route response | Existing summary/group route payload fields remain compatible while new confidence fields are additive only. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

If the implementation stays fully service-local and does not add route assertions, the minimum focused command is:

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

- `signal-quality-lab.repository.test.ts` unless Team 00 explicitly widens the packet
- DQE source edits or tests as a backdoor for trust-state logic
- frontend Playwright or Signal Quality Lab UI checks
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved service/types/doc/test file set
- implementation requires DQE source/export changes
- implementation changes controller, router, validation, repository, schema, or query-contract behavior
- implementation changes default DQ filtering rather than adding additive confidence metadata
- tests require frontend/dashboard checks or broad downstream module validation
- the packet starts folding calibration or strategy/trade-plan gating into the same writer pass

## Evidence Required Later

- Exact implementation handoff limited to the reserved `signal-quality-lab` files
- Scenario results for trusted, limited, diagnostic, untrusted-no-evidence, and untrusted-DQ-lookup-failure states
- Confirmation that current DQ filter/query behavior remained unchanged for the first slice
- Focused command output only after approval
- Skipped checks with reason and next owner
- Clear note whether optional route-level assertions were added or the QA pass remained service-test only

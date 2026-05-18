# CF-W1-SQLAB-02A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: No-schema derived journal-preview QA plan prepared. QA-ready for Team 00 sequencing and Ready evaluation only as one bounded `signal-quality-lab` child slice, and only after `CF-W1-SQLAB-01` clears the shared backend `signal-quality-lab` service/types/doc/service-test surfaces. Executable validation remains blocked until Team 00 promotes one exact implementation handoff. The durable parent storage scope remains blocked.

Current status refresh: Team 03 split `CF-W1-SQLAB-02` on 2026-05-18 into `CF-W1-SQLAB-02A` derived journal preview and future durable-storage parent `CF-W1-SQLAB-02B`. Team 04 aligns this QA plan to the child-only no-schema preview and does not treat the durable parent as part of this packet.

## Scope

Validation plan for additive signal-outcome journal preview metadata rendered inside the existing Signal Quality Lab instrument-history workflow.

In-scope surfaces after Team 00 sequencing, Ready promotion, and implementation handoff:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Out of scope for this first slice:

- durable journal storage, editable notes, save/update actions, or any implied persistence
- Prisma schema, migrations, repository, controller, router, validation, route-registry, or query-contract changes
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- Signal Generation, Signal Calibration, Today Review, Strategy Decision, Trade Plan, or Data Quality source/export changes
- shared UI, shared backend utilities, package manifests, generated files, providers, live-market validation, startup/backfill, paid/cloud, telemetry, or broker flows

This plan does not approve application source edits, test edits, builds, or services. It records the QA packet only.

## Dependencies

- Team 03 architecture review, contract, and work packet are prepared for the split child.
- Team 00 must not promote or implement `CF-W1-SQLAB-02A` in parallel with `CF-W1-SQLAB-01` because both packets reserve:
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- Existing signal-history and outcome responses remain the baseline and must not regress.
- The durable parent remains blocked until a separate approved storage packet exists for `signal-quality-lab`.

## Required QA Assertions

- Journal preview metadata is additive only and does not remove or rename existing `outcomes`, `evaluationDiagnostics`, `horizonAvailability`, `recommendedAction`, or instrument-history fields.
- Favorable follow-through mapping works for aligned measured outcomes:
  - bullish signal plus positive selected-horizon return
  - bearish signal plus negative selected-horizon return
- Adverse follow-through mapping works for contradicted measured outcomes:
  - bullish signal plus negative selected-horizon return
  - bearish signal plus positive selected-horizon return
- Flat follow-through mapping is used for effectively flat selected-horizon outcomes and does not overclaim confirmation or contradiction.
- Pending future-data mapping is used when local price history exists but the selected horizon is not yet mature:
  - status equivalent to `INSUFFICIENT_FUTURE_DATA`
  - lesson equivalent to `PENDING_FUTURE_DATA`
- Missing-history mapping is used when no usable local price history exists:
  - status equivalent to `MISSING_PRICE_HISTORY`
  - lesson equivalent to `MISSING_PRICE_HISTORY`
- UI copy explicitly states the preview is derived and not persisted, and the page does not introduce save controls, editable lesson notes, or durable-journal wording.
- Existing selected-outcome rendering and insufficient-data messaging stay visible and compatible while the journal preview appears as an additive row, column, or inline detail.
- Research-support language is preserved; no direct advice, target-price, guaranteed-outcome, or automation wording appears.

## Acceptance Scenarios

| Scenario | Expected QA result |
| --- | --- |
| Bullish or bearish signal has measured selected-horizon outcome aligned with original direction | Journal preview status is evaluated and lesson label maps to favorable follow-through; summary explains measured alignment without advice wording. |
| Bullish or bearish signal has measured selected-horizon outcome that contradicts original direction | Journal preview status is evaluated and lesson label maps to adverse follow-through; summary explains contradiction without implying a durable judgment. |
| Selected-horizon measured return is effectively flat | Journal preview status is evaluated and lesson label maps to flat follow-through; copy avoids confirmation/contradiction overclaiming. |
| Selected horizon has local price history but not enough future rows yet | Journal preview status maps to insufficient future data and lesson maps to pending future data; copy tells the user more trading rows are needed. |
| No usable local price history exists for the signal | Journal preview status and lesson both map to missing price history; copy tells the user current local data cannot measure the outcome. |
| Instrument history page loads existing history/outcomes with additive journal preview | Existing outcome values, insufficient-data wording, and research links still behave as before; journal preview is additive only. |
| Journal preview is rendered in the existing Signal Quality Lab page | Visible copy makes derived-not-persisted status explicit and there is no save/edit action, no durable journal label, and no new route/navigation surface. |
| Existing signal-history or outcome consumers receive additive payloads | Current field names and response shape remain compatible while journal preview metadata is added. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Focused backend validation after Team 00 sequencing, Ready promotion, and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Approval-gated frontend build after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd frontend
npm.cmd run build
```

Focused Signal Quality Lab UI smoke after implementation because the reserved page/spec already exist:

```powershell
cd frontend
npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- broad backend suites such as `npm.cmd test` with no file filters
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- route/controller/repository/validation assertions unless Team 00 explicitly widens the packet
- durable-storage validation for notes, persistence, or migration behavior
- shared UI extraction or shared utility verification as a backdoor for widening scope
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad cross-module validation

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- Team 00 attempts to promote or implement `CF-W1-SQLAB-02A` in parallel with `CF-W1-SQLAB-01`
- implementation requires repository, controller, router, validation, Prisma, migration, route-registry, frontend API client, shared UI, shared utility, package, generated, or cross-module source changes
- implementation introduces save/edit persistence semantics, durable journal wording, or a separate journal page/route
- implementation changes existing signal-history/outcome payload fields instead of adding preview metadata
- implementation requires backend storage design for journal entries; that is the blocked durable parent
- UI copy omits derived-not-persisted status or introduces advice-like, target-like, or guaranteed-outcome language

## Evidence Required Later

- Exact implementation handoff limited to the approved child file set
- Explicit Team 00 sequencing note that `CF-W1-SQLAB-02A` is not running in parallel with `CF-W1-SQLAB-01`
- Scenario results for favorable, adverse, flat, pending-future-data, and missing-price-history mappings
- Confirmation that existing signal-history and outcome payload fields stayed backward-compatible
- Proof that derived-not-persisted copy is visible and no save/edit affordance was introduced
- Focused command output only after approval
- Skipped checks with reason and next owner
- Explicit note that durable journal storage stayed blocked and untested in this child slice

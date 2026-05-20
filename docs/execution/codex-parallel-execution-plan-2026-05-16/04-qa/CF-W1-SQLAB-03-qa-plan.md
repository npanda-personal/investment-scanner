# CF-W1-SQLAB-03 QA Plan

Date: 2026-05-20

Owner: Team 04 QA Factory

Status: Signal Quality review-loop actionability QA plan prepared. QA-ready for Team 00 Ready evaluation only after Team 00 sequences it behind `CF-W1-SQLAB-02A` and confirms the writer set is clear. Executable validation remains blocked until that sequencing decision is made and the bounded implementation handoff exists.

Current accepted local commit boundary: `abac241 feat: add signal quality journal preview evidence`.

## Scope

Validation plan for additive review-loop actionability metadata rendered inside the existing Signal Quality Lab workflow for noisy and limited outcomes.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Out of scope for this first slice:

- journal persistence, editable notes, save/update actions, or any durable learning-memory path
- Prisma schema, migrations, generated files, or persistence-shape changes
- `signal-quality-lab` repository, controller, router, validation, or public-export widening
- backend or frontend route registry changes, query-contract changes, or route-path changes
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- Signal Generation, Signal Calibration, Trade Plan, or Today Review source or tests
- shared UI, shared backend utilities, package manifests, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-SQLAB-03-architecture-review.md`
- `06-contracts/CF-W1-SQLAB-03-signal-quality-review-loop-actionability-contract.md`
- `08-work-packets/CF-W1-SQLAB-03-work-packet.md`
- `10-requirements/CF-W1-SQLAB-03-signal-quality-review-loop-actionability-for-noisy-and-limited-outcomes-requirement.md`

Current Signal Quality Lab source alignment already supports the bounded review-loop derivation:

- the module already exposes `evidenceUsability`, `recommendedAction`, `evaluationDiagnostics`, `horizonAvailability`, noisy issue evidence, and instrument-history outcome rows;
- the current feature page already renders the selected-horizon diagnostic state, noisy signal cards, and history/outcome rows;
- the current endpoints and query parameters are sufficient for this first slice, so no new route or frontend API file is required;
- there is no durable journal storage table yet, which keeps this child strictly review-loop oriented.

## Required QA Assertions

- Review-loop actionability metadata is additive only and does not remove or rename existing fields.
- The implementation distinguishes `TRY_SHORTER_HORIZON`, `RERUN_AFTER_MORE_DATA`, `CHECK_PRICE_HISTORY`, `TREAT_AS_INSUFFICIENT_EVIDENCE`, and `IGNORE_FOR_REVIEW_LOOP`.
- Visible review-loop guidance appears on the selected-horizon overview, noisy signal cards, and history/outcome rows inside the existing Signal Quality Lab page.
- Reason labels and summaries stay deterministic and research-supportive, with no direct advice, target-price, buy/sell, broker, or automation wording.
- Existing `evidenceUsability`, `recommendedAction`, `evaluationDiagnostics`, `horizonAvailability`, noisy issue detection, and current outcome calculations remain unchanged.
- No journal persistence, schema, route, or shared-file widening is introduced.
- The QA plan must respect the writer-set overlap with `CF-W1-SQLAB-02A` and not be treated as parallel-safe.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Selected horizon is unavailable but a shorter horizon already exists | Action code is `TRY_SHORTER_HORIZON`, the shorter horizon is recommended for review, and the wording stays research-supportive. |
| Selected horizon is unavailable because more future rows are needed | Action code is `RERUN_AFTER_MORE_DATA`, the user is told to wait for more data, and no false confidence is introduced. |
| Missing or unusable local price history is the primary blocker | Action code is `CHECK_PRICE_HISTORY`, the blocker is explicit, and the page does not imply a durable judgment. |
| Limited, low-confidence, or small-sample evidence | Action code is `TREAT_AS_INSUFFICIENT_EVIDENCE`, the reason is visible, and the row remains diagnostic rather than advice-like. |
| Noisy or contradictory evidence | Action code is `IGNORE_FOR_REVIEW_LOOP`, the review-loop guidance tells the user not to promote the pattern, and the existing diagnostics remain visible. |
| Existing Signal Quality Lab page rendering | The overview, noisy cards, and history/outcome rows show the additive packet without adding journal persistence or new route surfaces. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 sequencing approval, Ready promotion, and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
```

Approval-gated backend build after accepted implementation and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

Approval-gated frontend build after accepted implementation and memory/resource check:

```powershell
cd frontend
npm.cmd run build
```

Focused Signal Quality Lab UI smoke after implementation because the reserved feature page/spec already exist:

```powershell
cd frontend
npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend and frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- outcome persistence or journal write-path work
- repository/controller/router/validation/public-export widening
- route-registry or query-contract changes
- shared UI extraction or shared utility widening
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad backend suites

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation requires journal persistence or any durable learning-memory path;
- implementation changes repository, schema, route, or frontend API files;
- implementation widens into Signal Generation, Signal Calibration, Trade Plan, or Today Review source;
- implementation introduces non-additive fields or advice-like, target-like, or automation-like wording;
- Team 00 attempts to run `CF-W1-SQLAB-03` in parallel with `CF-W1-SQLAB-02A`.

## Sequencing And Dependency Notes

- `CF-W1-SQLAB-03` must be sequenced behind active `CF-W1-SQLAB-02A`.
- Both packets reserve the same `signal-quality-lab` backend and frontend files, so one-writer-per-file remains mandatory.
- The accepted local commit boundary for the overlapping writer set is `abac241 feat: add signal quality journal preview evidence`.
- Team 00 should not promote `CF-W1-SQLAB-03` as a parallel writer until the `SQLAB-02A` handoff is accepted or committed and the shared writer set is clear.

## Evidence Required Later

- Exact implementation handoff limited to the reserved `signal-quality-lab` backend and feature-local UI files
- Scenario evidence for shorter-horizon, rerun-after-more-data, missing-price-history, insufficient-evidence, and noisy-ignore actionability
- Proof that the existing diagnostics, outcome calculations, and query behavior stayed unchanged
- Confirmation that the page renders the additive review-loop packet with research-support wording only
- Explicit note that no journal persistence, schema, route, shared-file, package, provider, live-data, or automation widening occurred


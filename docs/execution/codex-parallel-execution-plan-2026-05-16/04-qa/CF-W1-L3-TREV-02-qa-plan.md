# CF-W1-L3-TREV-02 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Today Review candidate snapshot provenance QA plan prepared. `CF-W1-L3-TREV-02` is QA-plan ready for Team 00 Ready evaluation as one bounded `today-trade-review` candidate-detail provenance slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff for the reserved Today Review files only, and this slice must not run in parallel with `CF-W1-L3-TREV-01`.

Current status refresh: Team 03 prepared the bounded architecture review, contract, and work packet on 2026-05-18. Team 04 aligns this QA plan to the same Today Review detail-only child and does not widen it into broad Today Review page redesign, route work, Prisma/schema work, shared utility/UI work, upstream module edits, provider/live-data work, startup/backfill, package changes, or generated-file changes.

## QA Intent

Today Review candidate detail should show what stored evidence supported a candidate, where that evidence came from, and how the displayed date was derived. This QA plan therefore focuses on proving two things at the same time:

- candidate detail exposes auditable provenance rows with explicit timing-source disclosure for stored snapshots; and
- legacy, partial, or timing-incomplete snapshots stay compatibility-only, unavailable, or unknown rather than reading as fully proven evidence.

## Scope

Validation plan for additive candidate-detail provenance normalization and rendering in `CF-W1-L3-TREV-02`.

In-scope surfaces after Team 00 Ready promotion:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- exact new focused compatibility-read test only if needed: `backend/tests/modules/today-trade-review/today-trade-review.repository.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Out of scope for this first child:

- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/api/todayTradeReviewApi.ts`
- `frontend/src/features/today-trade-review/hooks/useTodayReview.ts`
- `frontend/src/features/today-trade-review/routes.tsx`
- `frontend/src/features/today-trade-review/index.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- backend/frontend route registries
- Prisma, migrations, generated files, shared backend utilities, shared UI, package manifests
- upstream `market-data-foundation`, `data-quality-engine`, `market-context-intelligence`, `strategy-decision-engine`, `trade-plan-risk-engine`, `signal-generation-engine`, `signal-calibration-engine`, and `smart-money-intelligence` source/test edits
- Trade Plan geometry rewrite, Strategy Decision rewrite, startup/backfill, providers, paid/cloud, broker, telemetry, or broad Today Review redesign

This plan does not approve application source edits, tests, builds, services, or Ready movement. It records the QA packet only.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-L3-TREV-02-architecture-review.md`
- `06-contracts/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-contract.md`
- `08-work-packets/CF-W1-L3-TREV-02-work-packet.md`
- `10-requirements/CF-W1-L3-TREV-02-today-review-candidate-snapshot-provenance-requirement.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Current source alignment that this QA plan depends on:

- `today-trade-review.types.ts` already stores candidate-owned snapshots, reason-level `sourceModule`, optional `evidenceDate`, and candidate `createdAt` / `updatedAt`, but it does not yet define a normalized candidate provenance surface.
- `today-trade-review.service.ts` already snapshots usable timing fields such as `generatedAt`, `lastEvaluatedAt`, and `updatedAt` for some evidence producers, while current stored calibration and smart-money support inside `sourceSignalSnapshot` still lack their own timestamp.
- `today-trade-review.repository.ts` currently rebuilds candidate explainability for persisted rows and drops timing to `null` on compatibility synthesis, which is exactly the read-path gap this child must close without schema or route changes.
- `TodayReviewCandidateDetailPage.tsx` still shows coarse support booleans such as `Readiness evidence`, `Strategy proof evidence`, and `Trade-plan proof-chain` as `Available / Unavailable`, so the candidate detail page cannot currently prove source ownership or timing-source semantics.
- The same detail page still contains legacy trade-plan labels such as `Target 1 / Target 2 or reward range`; those semantics remain outside this child. QA will judge new or changed provenance copy only and will reject any widening into trade-plan wording cleanup or geometry changes.
- `today-trade-review.service.test.ts` and `frontend/tests/ui/today-trade-review.spec.ts` cover candidate detail generally, but they do not yet prove normalized provenance rows, compatibility-only labels, unavailable/unknown fallback timing, or repository normalization for legacy rows.

## Required QA Assertions

- Existing candidate DTO and `GET /today-review/candidates/:id` remain additive and backward-compatible. Current snapshot fields and `explainability` remain present and unrenamed.
- Candidate detail gains one additive normalized provenance surface, preferably under `explainability`, with stable semantics equivalent to:
  - evidence key or row identity
  - source module label
  - status such as present, partial, legacy-shape, or unavailable
  - evidence timestamp
  - timing source such as underlying evidence, snapshot generated at, candidate created at, candidate updated at, or unknown
  - candidate publication timestamp
  - compatibility-only label when needed
- Candidate-level provenance rows exist for stored snapshot detail where applicable:
  - `dataQuality`
  - `marketContext`
  - `strategyProof`
  - `tradePlan`
  - `rawSignal`
  - `signalCalibration`
  - `smartMoney`
  - `todayReviewLiteSetup`
- Candidate-level provenance labels and evidence dates come from stored evidence only:
  - prefer underlying evidence timestamps when those fields are actually stored
  - use snapshot-generated timing only when that snapshot field exists
  - use candidate publication timing only as an explicit compatibility fallback
  - use explicit unavailable or unknown fallback when stored evidence cannot prove source timing
- Partial or legacy snapshot shapes are compatibility-only:
  - lite strategy proof without stored timestamp must not read as direct Strategy Framework timing
  - calibration and smart-money support without stored timestamp must not read as directly time-proven upstream evidence
  - current mixed `sourceSignalSnapshot` substructures must normalize into separate provenance rows or equivalent semantics instead of one silent blob
- Repository compatibility normalization works on persisted rows that lack normalized provenance:
  - no Prisma/schema, migration, generated-file, route, controller, provider, startup, or backfill changes are allowed
  - older rows still render usable provenance labels from existing stored JSON plus candidate timestamps
  - synthesized compatibility provenance must not fabricate underlying timestamps
- `TodayReviewCandidateReason` remains consistent with the same normalized provenance chain:
  - reason `sourceModule` still matches the provenance row
  - reason `evidenceDate` stays stored, derived conservatively, or explicitly unavailable
  - reasons using publication-time or compatibility fallback do not present themselves as direct underlying-evidence timing
- Candidate detail rendering only:
  - `TodayReviewCandidateDetailPage.tsx` replaces the support booleans with explicit provenance rows
  - broad `TodayReviewPage.tsx` redesign is out of scope and any touch there is a QA reject
  - frontend API/hook rewiring is out of scope and any touch there is a QA reject
- Read-only research-support wording is preserved for changed copy:
  - allow labels such as `stored evidence`, `publication-time fallback`, `compatibility-only`, `unknown timing`, `review support`, and `unavailable`
  - reject new provenance wording that introduces target-like, direct-advice, broker, order, execution, or automation framing
  - reject the packet if it widens into Trade Plan target/geometry semantics or attempts a Strategy Decision wording rewrite
- QA must reject the packet if implementation touches Prisma/schema, migrations, route registries, shared utilities/UI, package manifests, providers/live data, startup/backfill, paid/cloud, broker, telemetry, upstream module source, Trade Plan geometry, Strategy Decision rewrite, or broad Today Review UI scope.
- Team 00 must not run `CF-W1-L3-TREV-02` in parallel with `CF-W1-L3-TREV-01` because both reserve the same Today Review writer files.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| Full stored provenance on framework-backed candidate | Candidate detail shows distinct provenance rows for Data Quality, Market Context, Strategy proof, Trade Plan, and raw signal support with explicit source modules and stored evidence dates. |
| Mixed timing sources on one candidate | At least one row uses underlying evidence time, another uses snapshot-generated time, and another uses candidate publication fallback; each timing source is labeled explicitly rather than inferred. |
| Partial `sourceSignalSnapshot` support | Calibration and Smart Money support render as `PARTIAL` or `LEGACY_SHAPE` with compatibility wording and fallback timing disclosure instead of looking fully timestamp-proven. |
| Lite candidate compatibility path | Lite strategy proof and Today Review Lite setup support render with `Today Review Lite` provenance labels, compatibility-only wording, and candidate publication fallback where no direct upstream timestamp exists. |
| Missing snapshot or unprovable timing | Missing snapshot rows render `UNAVAILABLE`; stored evidence that cannot prove source timing renders explicit unavailable or unknown timing rather than silent completeness. |
| Legacy persisted row without normalized provenance | Repository read path derives usable provenance labels from existing snapshot JSON plus candidate `createdAt` / `updatedAt` without schema changes, route changes, or fabricated upstream timestamps. |
| Reason linkage stays coherent | Blockers, watch reasons, and promotion reasons still point to the same provenance chain and do not claim stronger timing than the normalized provenance row supports. |
| Candidate detail UI-only child | `TodayReviewCandidateDetailPage.tsx` renders provenance rows and removes support booleans; `TodayReviewPage.tsx`, hooks, API, and routes stay untouched. |
| Research-support wording preserved | New or changed provenance copy avoids target-like, direct-advice, broker, execution, and automation wording while staying read-only and audit-oriented. |
| Scope drift or parallel writer attempt | Any forbidden-file touch, Trade Plan geometry rewrite, Strategy Decision rewrite, broad UI change, or parallel implementation with `CF-W1-L3-TREV-01` is a QA reject. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused validation after Team 00 Ready promotion and bounded implementation handoff:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts today-trade-review.repository.test.ts --runInBand
```

Feature-local UI smoke only if the reserved frontend files are part of the implementation handoff:

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

Approval-gated builds after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, UI smoke, and live data

Forbidden by default for this slice:

- `TodayReviewPage.tsx` redesign or route/API/hook rewiring as a backdoor for candidate provenance work
- upstream Today Review parent-run publication-evidence work from `CF-W1-L3-TREV-01`
- Trade Plan semantics cleanup, target-wording cleanup, or geometry changes that belong to `CF-W1-TP-02`
- upstream module edits, controller/router/index widening, Prisma/schema/data mutation, provider/live-market work, startup/backfill, paid/cloud, telemetry, or broker scope

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- implementation expands beyond the reserved Today Review files listed in this plan
- implementation touches Prisma/schema, migrations, backend/frontend route registries, controller/router/validation/index files, shared utilities/UI, package manifests, or generated files
- implementation touches `TodayReviewPage.tsx`, frontend API/hook/routes, or any broad Today Review navigation/layout surface
- implementation requires `market-data-foundation`, `data-quality-engine`, `market-context-intelligence`, `strategy-decision-engine`, `trade-plan-risk-engine`, `signal-generation-engine`, `signal-calibration-engine`, or `smart-money-intelligence` source/test edits
- implementation rewrites Trade Plan geometry or Strategy Decision semantics instead of surfacing stored provenance
- implementation introduces new target-like, direct-advice, broker, execution, or automation wording in the changed provenance/detail copy
- Team 00 attempts to implement `CF-W1-L3-TREV-02` in parallel with `CF-W1-L3-TREV-01`

## Evidence Required Later

- Exact implementation handoff limited to the reserved Today Review backend/frontend detail files
- Focused backend evidence for stored provenance rows and repository compatibility normalization
- Focused UI evidence for candidate detail provenance rows, compatibility labels, unavailable/unknown fallback, and read-only research-support wording
- Proof that `GET /today-review/candidates/:id` stayed additive and backward-compatible
- Proof that old persisted rows render usable provenance labels without schema, route, or backfill work
- Proof that reasons remain aligned with the same provenance chain
- Focused test output only after approval
- Build output only after approval
- Explicit note that `CF-W1-L3-TREV-01` and `CF-W1-L3-TREV-02` were kept mutually exclusive in implementation

## QA Verdict For Team 00

`CF-W1-L3-TREV-02` is QA-plan ready for Team 00 Ready evaluation.

Current blockers and risks:

- executable QA remains blocked until Team 00 promotes the bounded Today Review candidate-detail provenance handoff
- Team 00 must keep `CF-W1-L3-TREV-02` out of parallel implementation with `CF-W1-L3-TREV-01` because the shared Today Review writer set overlaps
- current `dev` still relies on compatibility reconstruction for persisted candidate explainability, so repository normalization must stay conservative and must not invent upstream timing
- current detail page contains pre-existing Trade Plan copy outside this child; implementers must not use this packet to widen into broader wording cleanup, geometry changes, or page redesign

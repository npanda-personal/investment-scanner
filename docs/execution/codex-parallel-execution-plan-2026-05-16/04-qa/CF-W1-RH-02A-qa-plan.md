# CF-W1-RH-02A QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Research Hub what-changed fail-closed comparison-basis QA plan prepared. QA-plan ready for Team 00 sequencing and Ready evaluation as one bounded `research-hub` backend-plus-feature-local UI slice. Executable validation remains blocked until Team 00 promotes one exact implementation handoff. Implementation must not run in parallel with `CF-W1-RH-01` because both packets reserve the same core Research Hub backend writer set.

Current status refresh: Team 03 prepared the bounded architecture review, contract, and work packet on 2026-05-18. Team 04 aligns this QA plan to the same fail-closed child and does not widen it into schema, route, shared UI, shared utility, upstream-source, provider, package, or durable-history work. Current queue review shows no open Product Owner decision blocker and no `SMI` / `MCTX` / `MD-03` / active SQLAB-prep dependency for this packet. The only current promotion blocker is Research Hub writer sequencing against `CF-W1-RH-01`.

## QA Intent

Research Hub must stop implying that current review-priority rows prove a real previous comparison basis when current `dev` does not have one. This QA plan focuses on proving fail-closed trust behavior:

- the backend makes comparison-basis availability explicit;
- delta fields stay suppressed when the basis is unavailable;
- the frontend shows unavailable-basis wording instead of fake temporal certainty; and
- no surrogate basis is inferred from Today Review or any other mismatched upstream output.

## Scope

Validation plan for additive fail-closed `whatChanged` comparison-basis semantics in `CF-W1-RH-02A`.

In-scope surfaces after Team 00 sequencing and Ready promotion:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

Out of scope for this child:

- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- backend/frontend route registries
- Today Review, Strategy Decision, Trade Plan Risk, Market Context, Signal Quality, Signal Calibration, Smart Money, or any other upstream module source/test edits
- Prisma, migrations, generated files, package manifests, shared backend utilities, shared frontend components, provider/live-data work, startup/backfill, paid/cloud, telemetry, or broker scope
- scheduler, journal, or durable Research Hub overview snapshot work
- parent `CF-W1-RH-02` true-history/storage follow-on scope

This plan does not approve application source edits, tests, builds, or Ready movement. It records the QA packet only.

## Dependencies And Queue State

- Team 03 architecture/contract/work-packet inputs for `CF-W1-RH-02A` are present.
- `12-ready-queue/blocked-by-decision.md` shows no open Product Owner decision blocker for this child.
- `12-ready-queue/blocked-by-shared-file.md` does not list `CF-W1-RH-02A` as a shared-file blocker against schema/routes/shared files when it stays inside the reserved module-owned file set.
- `12-ready-queue/blocked-by-upstream-dependency.md` does not list `CF-W1-RH-02A` behind an upstream module dependency.
- Active `CF-W1-SMI-01`, `CF-W1-MCTX-01`, `CF-W1-MD-03`, and active SQLAB architecture prep do not block this docs-only QA packet.
- Exact current blocker for implementation promotion: `CF-W1-RH-02A` must not run in parallel with `CF-W1-RH-01` because both reserve:
  - `backend/src/modules/research-hub/research-hub.service.ts`
  - `backend/src/modules/research-hub/research-hub.types.ts` for `RH-02A`
  - `backend/src/modules/research-hub/research-hub.md`
  - `backend/tests/modules/research-hub/research-hub.service.test.ts`

QA-ready conclusion for Team 00:

- this packet is ready for Ready evaluation now;
- executable implementation is blocked only by Research Hub writer sequencing until `CF-W1-RH-01` is accepted/merged or Team 00 explicitly repacks both items into one Research Hub writer pass.

## Contract Inputs And Current Source Alignment

Primary planning inputs:

- `03-architecture/CF-W1-RH-02A-architecture-review.md`
- `06-contracts/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-contract.md`
- `08-work-packets/CF-W1-RH-02A-work-packet.md`
- `10-requirements/CF-W1-RH-02A-research-hub-what-changed-fail-closed-basis-requirement.md`

Current `dev` source alignment that this QA plan depends on:

- `backend/src/modules/research-hub/research-hub.service.ts` currently marks `whatChanged` as simulated and derives `newTradeCandidates` from the current `tradeCandidates` list rather than a proven prior Research Hub basis.
- `backend/src/modules/research-hub/research-hub.types.ts` currently exposes only `newTradeCandidates`, `downgradedCandidates`, `marketGateChange`, and `warnings`; there is no explicit `comparisonBasis` metadata yet.
- `backend/src/modules/research-hub/research-hub.md` still documents `What Changed` as a core mandate, which increases the trust risk of leaving simulated temporal semantics in place.
- `backend/tests/modules/research-hub/research-hub.service.test.ts` currently validates Research Hub aggregation and conservative actionability, but it does not yet prove fail-closed basis semantics.
- `frontend/src/features/research-hub/api/researchHubApi.ts` mirrors the backend type gap and will need additive `comparisonBasis` support without breaking existing overview fields.
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx` currently shows `No new review candidates since the last evaluation.` whenever `newTradeCandidates` is empty, even when no prior basis exists.
- `frontend/tests/ui/research-hub.spec.ts` currently asserts that unsupported temporal sentence and therefore must be updated as part of this bounded child.

## Required QA Assertions

- `ResearchWhatChanged` gains additive `comparisonBasis` metadata in both backend and frontend types, with stable equivalents of:
  - `status`
  - `comparedAgainstGeneratedAt`
  - `sourceModule`
  - `message`
- On current `dev`, the default fail-closed path is explicit:
  - `comparisonBasis.status = UNAVAILABLE`
  - `comparisonBasis.comparedAgainstGeneratedAt = null`
  - `comparisonBasis.sourceModule = null`
  - `comparisonBasis.message` explains that no auditable prior Research Hub comparison basis is available
- When `comparisonBasis.status = UNAVAILABLE`, the backend suppresses all temporal delta claims:
  - `newTradeCandidates = []`
  - `downgradedCandidates = []`
  - `marketGateChange = null`
- Research Hub does not infer a prior basis from the current `tradeCandidates` list alone.
- Research Hub does not infer a prior basis from Today Review persisted runs, Today Review latest-run DTOs, or any other mismatched upstream module output.
- Warning behavior remains additive and bounded:
  - existing `whatChanged.warnings` may still render
  - warnings must not imply that hidden delta history exists
  - warning presence must not turn an unavailable basis into an apparent compared state
- Frontend What Changed rendering is basis-aware:
  - it stops rendering `No new review candidates since the last evaluation.`
  - it renders backend-provided unavailable-basis wording instead
  - it does not imply pending sync, hidden storage, or expected automatic recovery unless the backend message explicitly and safely says so
- Research-support wording remains intact:
  - allow wording such as `comparison basis unavailable`, `auditable prior basis unavailable`, `review`, `candidate`, `warning`, `reason`, and `consider review`
  - reject `buy now`, `sell now`, `must buy`, `must sell`, `price target`, `profit target`, `guaranteed`, `execute`, `order`, or broker/automation language
- Existing top-level Research Hub route and fetch flow remain intact:
  - `/api/v1/research/overview` stays unchanged
  - page load still works through the current module-owned feature surface
  - other overview sections remain compatible
- QA must reject the packet if implementation widens into schema, migrations, route registries, shared UI/utilities, upstream source/tests, provider/live-data, startup/backfill, package manifests, generated files, or durable history/storage work.

## Scenario Matrix

| Scenario | Expected QA assertion after implementation |
| --- | --- |
| No prior Research Hub basis on current `dev` | `comparisonBasis.status` is `UNAVAILABLE`; date/source are null; message explains unavailable basis; all delta fields are suppressed. |
| Current trade candidates exist but no prior basis exists | Non-empty `researchPriorities.tradeCandidates` does not cause `whatChanged.newTradeCandidates` to populate; the comparison basis still reads `UNAVAILABLE`. |
| No trade candidates and no prior basis exists | UI renders explicit unavailable-basis wording, not `since the last evaluation`, and does not imply a real previous review cycle. |
| Unavailable basis plus warnings | Warning copy can render, but `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` remain suppressed and the page still reads as basis-unavailable. |
| Attempted Today Review surrogate basis | QA rejects any implementation path that uses Today Review persisted runs, latest-run outputs, or downstream review-state semantics as the source of Research Hub `whatChanged` deltas. |
| Attempted current-list self-comparison | QA rejects any implementation that derives `newTradeCandidates` by slicing or re-labeling the current `tradeCandidates` list without a real prior Research Hub basis. |
| Additive contract compatibility | `ResearchOverview` keeps existing top-level sections and field names; `comparisonBasis` is additive and does not remove current `whatChanged` container fields. |
| Feature-local UI wording update | The What Changed panel shows a basis-unavailable explanation and no longer asserts `No new review candidates since the last evaluation.` |
| Research-support wording preserved | What Changed panel and tests stay free of advice-like, target-like, guaranteed, broker, or execution wording. |
| Scope drift attempt | Any schema/route/shared/upstream-source/provider/package/generated widening is a QA reject and stop condition. |

## Optional `AUDITABLE` Path Guardrail

Current architecture expects `UNAVAILABLE` on `dev`. An `AUDITABLE` path is not required for this child.

If an implementer claims an `AUDITABLE` path anyway, QA must require all of the following before accepting it:

- the basis comes from an already-merged same-semantics Research Hub public read path;
- the basis stays inside the reserved `research-hub` writer set;
- no Today Review or other downstream/upstream surrogate semantics are repurposed;
- no schema, storage, scheduler, journal, route, shared-file, or upstream-source scope is introduced.

If any of those checks fail, QA must reject the `AUDITABLE` path and return the packet to Team 00 / Architect.

## Feature-Local UI Smoke Expectations

- `frontend/tests/ui/research-hub.spec.ts` remains the only UI smoke surface for this child.
- Smoke must prove the What Changed panel no longer shows unsupported `since the last evaluation` copy when basis is unavailable.
- Smoke must prove basis-unavailable wording is visible on the page even when there are zero new candidates.
- Smoke must prove warnings can coexist with an unavailable basis without creating fake delta claims.
- Smoke must keep verifying research-only framing already present in the page and must not introduce advice-like copy while updating the What Changed panel assertion.

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Future focused backend validation after Team 00 sequencing, Ready promotion, and implementation handoff:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

Focused feature-local UI smoke after implementation because the reserved page/spec already exist:

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Approval-gated builds after accepted implementation and memory/resource checks:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

Optional product-language scan after reserved implementation exists:

```powershell
rg -n "since the last evaluation|buy now|sell now|must buy|must sell|price target|profit target|guaranteed|execute|order|broker" backend/src/modules/research-hub frontend/src/features/research-hub frontend/tests/ui/research-hub.spec.ts backend/tests/modules/research-hub
```

## Skipped / Forbidden Checks

Skipped in this planning pass:

- all executable tests
- backend/frontend builds
- local servers, services, provider checks, and UI smoke

Forbidden by default for this slice:

- broad backend or frontend suites without file filters
- Prisma generate, migrate, db push, db execute, or any schema/data mutation
- route/controller/router/index widening
- shared UI/shared utility verification as a backdoor for scope growth
- upstream Today Review or other module validation as a backdoor for surrogate basis logic
- provider/live-market, paid/cloud, telemetry, broker, startup/backfill, or broad cross-module validation

## Stop Conditions

Stop QA and return to Team 00 / Architect if:

- Team 00 attempts to implement `CF-W1-RH-02A` in parallel with `CF-W1-RH-01`
- implementation expands beyond the reserved `research-hub` backend/frontend/spec/doc files
- implementation requires schema, migrations, generated files, route registries, shared UI, shared utilities, package changes, or provider/live-data work
- implementation touches Today Review or any other upstream/downstream module source/tests to fabricate or expose a prior Research Hub basis
- implementation introduces scheduler, journal, durable overview snapshot, or broader `CF-W1-RH-02` storage/history scope
- implementation preserves or reintroduces `since the last evaluation` wording when basis is unavailable
- implementation adds advice-like, target-like, broker, or execution wording to the What Changed panel

## Evidence Required Later

- Exact implementation handoff limited to the reserved `research-hub` backend/frontend/test/doc files
- Team 00 sequencing note confirming `CF-W1-RH-02A` is not running in parallel with `CF-W1-RH-01`, or explicit one-writer repack approval
- Service-test evidence proving `comparisonBasis.status = UNAVAILABLE` on current-`dev` no-prior-basis paths
- Proof that `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` are suppressed under unavailable basis
- Proof that current `tradeCandidates` alone do not generate delta claims
- Proof that Today Review is not used as a surrogate prior basis
- UI smoke evidence proving the old `since the last evaluation` sentence is gone and basis-unavailable wording is visible instead
- Focused command output only after approval
- Explicit note that no schema, route, shared-file, upstream-source, provider, package, or durable-history widening occurred

## QA Verdict For Team 00

`CF-W1-RH-02A` is QA-plan ready for Team 00 Ready evaluation.

Exact blockers:

- no open Product Owner decision blocker
- no `SMI` / `MCTX` / `MD-03` / active SQLAB-prep blocker
- no schema/route/shared/upstream-source/provider/package blocker as long as the packet stays inside the reserved file set
- one implementation sequencing blocker remains: `CF-W1-RH-02A` must not enter a live writer pass until `CF-W1-RH-01` is accepted/merged or Team 00 explicitly repacks both items into one Research Hub writer reservation

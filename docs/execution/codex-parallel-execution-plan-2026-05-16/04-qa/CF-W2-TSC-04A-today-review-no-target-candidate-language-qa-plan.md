# CF-W2-TSC-04A Today Review No-Target Candidate Language QA Plan

Date: 2026-05-25
Owner: Team 04 - QA Factory
Status: ACCEPTED FOR PLANNING

## Work Item

- Child requirement: `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE`
- Parent requirement: `CF-W2-TSC-04 - Today Review no-target candidate-language cleanup`

## Planning Verdict

ACCEPT the Team 03 architecture packet as plannable.

Reason:

- the child is bounded to Today Review-owned read-path and wording cleanup;
- the reserved file set is explicit and testable;
- the architecture contract clearly separates this slice from `CF-W2-TSC-05` ranking and eligibility semantics;
- current source and current tests both show the exact target/reward and Trade Plan-first wording that this QA plan can verify after implementation.

This is planning only. No application source verification was performed in this pass.

## Active Authority And Inputs Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-TSC-04-work-packet.md`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## QA Scope

This QA plan applies only after Team 00 promotes the child on accepted base commit `09bbf9b`.

### In scope

- Today Review service presentation mapping assertions, if implementation touches service mapping
- Today Review list-page UI smoke
- Today Review candidate-detail UI smoke
- no-target/no-advice text assertions on touched trusted candidate surfaces
- positive trusted-candidate wording assertions
- guardrail checks for no drift beyond the child contract

### Out of scope

- ranking, grouping, promotion, confidence, or eligibility semantics
- Lite target-generation removal
- reward/risk threshold removal
- upstream module behavior
- Data Quality or Pipeline Ops verification
- route, schema, package, shared UI, or generated-file changes

## Architecture Preconditions For QA

QA execution may start only if the implementation handoff confirms all of the following:

1. base commit is accepted `09bbf9b`
2. changes stay inside the reserved Today Review file set
3. no route/schema/shared/package/generated-file edits were introduced
4. no upstream module edits were introduced
5. the child remains presentation-only and additive

If any precondition fails, QA should reject the handoff back to Team 00 before test execution.

## Current Audit Anchors

The current codebase supports the child scope and also proves the need for it:

- backend service currently emits `reward/risk`, `paper review`, `trade-plan geometry`, and `Trade-plan proof-chain` language
- Today Review page currently uses trade-plan geometry in trusted shortlist copy
- candidate detail currently shows target/reward and reward/risk facts
- current UI spec fixtures/assertions still encode target/reward and Trade Plan-first wording

Those findings make the child testable and confirm that QA must check both behavior and fixture/spec wording after implementation.

## Acceptance Coverage

### 1. Backend focused tests

Run focused backend tests only if Team 07 touches `today-trade-review.service.ts` or service-owned mapping/types.

Required coverage:

- trusted entry presentation uses source-proven trigger evidence when available
- missing source-proven entry evidence produces explicit unavailable or missing wording
- trusted candidate `reasonSummary`, blockers, watch reasons, and explainability labels no longer surface:
  - `reward/risk`
  - `paper review`
  - `trade-plan geometry`
  - `Trade-plan proof-chain`
  - target/reward or modeled reward wording as trusted evidence
- compatibility-only Trade Plan context, if still exposed in payload/UI-facing mapping, is hidden or clearly labeled compatibility-only or historical
- accepted supporting evidence and health surfaces from base `09bbf9b` remain available
- no service-side ranking/grouping/confidence drift is introduced

Suggested assertion shape:

- assert on returned candidate DTO fields and explainability labels
- assert on candidate detail presentation fields if additive mapping is introduced
- avoid asserting implementation-specific naming unless the handoff contract documents it

### 2. Frontend/UI smoke

Run focused Today Review Playwright smoke against:

- Today Review page
- Today Review candidate detail page

Required list-page checks:

- page renders current trusted candidate sections without route change
- trusted shortlist copy uses candidate-safe research-support wording
- list/table cells do not expose target/reward, `R:R`, reward/risk, modeled reward, paper-review, trade-plan geometry, or advice wording
- row/detail navigation still works
- supporting evidence, DQ context, warnings, blockers, and health/readiness surfaces remain visible

Required candidate-detail checks:

- detail page does not show target/reward or reward/risk as trusted evidence facts
- trusted entry terminology uses `trigger price`, `entry trigger`, or explicit evidence-unavailable wording
- reason and evidence sections avoid raw `TRADE_PLAN_PROOF_CHAIN` user-facing wording on touched trusted surfaces
- strategy/rule/version evidence remains visible
- reason summary, blockers, risk warning, invalidation, health, and DQ context remain visible
- no direct buy/sell/advice-like language appears

### 3. Negative text assertions and scans

On touched trusted candidate surfaces, assert absence of:

- `R:R`
- `reward/risk`
- `target/reward`
- `target / reward`
- `modeled reward`
- `paper review`
- `trade-plan geometry`
- `Trade-plan proof-chain`
- arbitrary target
- profit target
- `buy now`
- `sell now`
- `must buy`
- `must sell`
- `financial advice`

The scan applies to:

- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Notes:

- do not fail on field names like `targetTradingDate`; that is not target-price language
- do not treat hidden compatibility data in raw payloads as a failure unless a touched trusted surface presents it as evidence

### 4. Positive wording assertions

Assert presence of approved or approved-equivalent wording on touched trusted surfaces:

- `Trusted Signal Candidate` where that label is introduced by implementation
- `entry trigger`
- `trigger price`
- `reason summary`
- strategy/rule/version evidence wording
- `rule evidence`
- `evidence unavailable` or `missing evidence` only when the source-proven trigger evidence is genuinely absent

Positive wording rules:

- source-proven trigger evidence must be the preferred trusted entry wording when available
- unavailable wording is allowed only when source evidence is absent
- compatibility-only wording is allowed only if clearly labeled compatibility-only or historical context

### 5. Guardrails / non-regression checks

QA must reject the slice if any of the following drift appears:

- ranking changes
- grouping changes
- confidence-score changes
- eligibility changes
- promotion changes
- upstream contract drift outside Today Review
- route changes
- schema changes
- shared UI changes
- package manifest changes
- generated-file changes

Guardrail evidence sources:

- changed-files audit from handoff
- focused backend test expectations on candidate state/grade/rank behavior
- UI smoke confirming existing route paths still load

## Execution Steps After Implementation

1. Confirm changed files stay inside the reserved Today Review file set.
2. Confirm the handoff states base `09bbf9b`.
3. Read the implementation diff and note any added presentation fields.
4. Run focused backend tests if service mapping changed.
5. Run frontend build and focused Today Review UI smoke.
6. Run the focused language scan on reserved files.
7. Review visible UI text and spec fixtures for forbidden wording leakage.
8. Compare resulting behavior against the architecture stop conditions.
9. Record pass/fail evidence in a separate QA verification artifact.

## Focused Commands For Team 00 / Implementer

Run after implementation:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
```

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

```powershell
rg -n "R:R|reward/risk|target / reward|target/reward|modeled reward|paper review|trade-plan geometry|Trade-plan proof-chain|profit target|buy now|sell now|must buy|must sell|financial advice" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## QA Stop Conditions

Return the packet to Team 00 / Team 03 without QA signoff if implementation requires or introduces:

- ranking or promotion logic changes
- confidence or eligibility changes
- Lite target-generation removal
- reward/risk threshold removal
- repository/controller/router/validation/index edits
- route or route-registry edits
- shared UI/shared utility edits
- Prisma/schema/migration changes
- package or generated-file changes
- upstream edits in Trade Plan, Strategy Decision, Signal Generation, Data Quality, Calibration, or Backtesting

## Risks And Notes

- Current service and current UI spec both embed forbidden wording, so QA must inspect updated tests as well as UI output.
- The child intentionally does not clean up target-shaped ranking semantics; QA must distinguish wording cleanup from semantic cleanup reserved for `CF-W2-TSC-05`.
- If implementation hides compatibility fields entirely, QA should treat that as acceptable within this child.

## Planned QA Result Type

Expected post-implementation outcome:

- PASS only if the child removes forbidden trusted-candidate language from touched Today Review surfaces, keeps approved evidence wording, and shows no scope drift.
- FAIL if any touched trusted surface still presents target/reward, reward/risk, Trade Plan-first labels, or advice-like copy as trusted evidence.

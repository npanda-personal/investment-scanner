# Team 04 CF-W1-TSC-02A-TREV-HEALTH QA Plan Outbox

Date: 2026-05-24

## Work Item

`CF-W1-TSC-02A-TREV-HEALTH` - Today Review active-signal health projection.

## State / Mode

Completed - docs-only QA planning.

## Verdict

ACCEPT / READY-FOR-TEAM00-EVALUATION

QA readiness is accepted for Team 00 evaluation as one bounded Today Review child, with executable QA still blocked until Team 00 promotes the split child on accepted base `9fbc989` and Team 07 provides an implementation handoff limited to the reserved Today Review files.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 3 with Lane 2 evidence inputs
- Module: `today-trade-review`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-TSC-02A-TREV-HEALTH-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TSC-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TSC-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-TSC-02-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-04-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-DQ-02A-qa-plan.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Scenario Coverage Recorded

- `ACTIVE` with trusted entry evidence and no stronger current proof
- `HEALTHY` with current rule-backed proof
- `WEAKENING` with current rule-backed proof
- `RISK_WARNING` with current warning evidence
- `EXIT_TRIGGERED` only from documented exit-rule proof
- `INVALIDATED` only from documented invalidation proof
- `EXPIRED` only from documented expiry proof
- `BLOCKED` from missing entry basis, DQ hard-block, or missing current proof basis
- missing-rule-evidence downgrade
- DQ hard-block fail-closed behavior
- legacy snapshot compatibility
- list/detail consistency for the same candidate
- language scan for no target/R:R/advice leakage
- reject-on-scope-drift and reject-on-plain-`dev` base drift

## Focused Commands

Run only after Team 00 promotes the child, Team 07 stacks on accepted base `9fbc989`, and an implementation handoff exists:

```powershell
git rev-parse HEAD
git merge-base --is-ancestor 9fbc989 HEAD
git diff --name-only 9fbc989 --
```

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
rg -n "R:R|reward/risk|profit target|price target|target price|synthetic target|buy now|sell now|must buy|must sell|guaranteed|financial advice|Trade Plan|trade-plan" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## Tests Run

None.

## Tests Skipped

- All executable checks were skipped because this assignment was docs-only QA planning and did not authorize tests, builds, servers, Playwright runs, or implementation validation.

## Blockers

- Executable QA remains blocked until Team 00 promotes the split child and confirms the exact Team07 stacked base on accepted commit `9fbc989`.
- Executable QA remains blocked until Team 07 provides an implementation handoff limited to the eight reserved Today Review files.
- Any widening into repository/controller/router/validation/index, route registries, schema, generated files, packages, shared utilities/UI, upstream modules, provider/live, startup/backfill, or new page/persistence scope is an immediate reject condition.
- Any attempt to prove health from price movement alone, Trade Plan compatibility fields, target-shaped values, or synthetic targets is an immediate reject condition.

## Next Gate

Team 00 Ready evaluation and sequencing for the bounded Today Review child `CF-W1-TSC-02A-TREV-HEALTH`.

## Evidence Notes

Primary QA planning evidence is recorded in `04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`.

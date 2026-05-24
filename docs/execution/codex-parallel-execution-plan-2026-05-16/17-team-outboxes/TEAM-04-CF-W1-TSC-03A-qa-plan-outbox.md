# Team 04 CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE QA Plan Outbox

Date: 2026-05-24

## Work Item

`CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` - Today Review supporting trust evidence.

## State / Mode

Completed - docs-only QA planning.

## Verdict

`QA plan prepared but blocked by active writer sequencing`

Do not promote this child to Ready yet.

QA planning is complete for the bounded Today Review child, but Team 00 must keep it blocked until:

- Team 07 clears the active Today Review writer set from `CF-W1-TSC-02A-TREV-HEALTH`;
- Team 00 records the exact post-`TSC-02A` implementation base; and
- Team 07 provides an implementation handoff limited to the reserved Today Review files.

## Owner / Lane / Module

- Owner: Team 04 QA Factory
- Lane: Lane 3 with Lane 1 and Lane 2 evidence inputs
- Module: `today-trade-review`

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-TSC-03A-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-TSC-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-TSC-03-supporting-trust-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-TSC-03-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Scenario Coverage Recorded

- full supporting evidence present on a richer base
- DQ hard-block with no silent upgrade
- `DQ-03` absent with explicit residual-summary unavailable or missing state
- calibration `USABLE`, `LIMITED`, and `UNAVAILABLE`
- richer calibration `trustState` and `dqGateState` only when `CAL-01A` exists on the chosen base
- backtesting `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, and `LIMITED_HISTORICAL_PROOF` only when accepted `BT-04` fields exist on the chosen base
- explicit unavailable backtesting support when `BT-04` is absent
- mixed-source missing evidence without recreated upstream logic
- legacy row compatibility and older snapshots missing new support fields
- same-candidate list/detail consistency
- no target price, no target/reward, no reward/risk, no Trade Plan-first, and no advice-like wording
- reject-on-scope-drift and reject-on-unresolved-writer-sequencing

## Focused Future Commands

Run only after Team 00 clears sequencing, records the post-`TSC-02A` base, and Team 07 provides an implementation handoff:

```powershell
git rev-parse HEAD
git diff --name-only
```

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
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
rg -n "R:R|reward/risk|profit target|price target|target price|target / reward|buy now|sell now|must buy|must sell|guaranteed|financial advice|Trade Plan|trade-plan" backend/src/modules/today-trade-review backend/tests/modules/today-trade-review frontend/src/features/today-trade-review frontend/tests/ui/today-trade-review.spec.ts
```

## Tests Run

None.

## Tests Skipped

- All executable checks were skipped because this assignment was docs-only QA planning and did not authorize tests, builds, servers, Playwright runs, or implementation validation.

## Blockers

- The active Today Review writer set is still owned by `CF-W1-TSC-02A-TREV-HEALTH`.
- Team 00 has not yet recorded the exact post-`TSC-02A` implementation base for this child.
- `CF-W1-DQ-03`, `CF-W1-CAL-01A`, and accepted `CF-W1-BT-04` may or may not exist on the chosen base, so fallback behavior must remain explicit unavailable or missing state until the base is recorded.
- Any widening into repository/controller/router/validation/index, route registries, schema, generated files, packages, shared utilities/UI, or upstream module logic is an immediate reject condition.

## Next Gate

Stay blocked in Team 00 sequencing. Do not move to Ready until the active Today Review writer set clears and the exact base is recorded.

## Evidence Notes

Primary QA planning evidence is recorded in `04-qa/CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE-qa-plan.md`.

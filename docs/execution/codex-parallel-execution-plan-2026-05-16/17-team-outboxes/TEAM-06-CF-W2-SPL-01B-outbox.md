# TEAM-06 Outbox - CF-W2-SPL-01B

Date: 2026-05-26  
Owner: Team 06 (Lane 2 - Strategy / Signal / Risk implementation)

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

## State / Mode

Implementation complete in dedicated worktree branch `codex/team06-strategy-signal/CF-W2-SPL-01B`, rebased to Team 00 checkpoint commit `ccf5d06`.

## Lane / Module

- Lane: 2
- Module: `backend/src/modules/signal-position-ledger`

## Files Changed

- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

## Files Inspected (Key)

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-ready-promotion.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-01B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-01B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `backend/src/modules/signal-generation-engine/*`
- `backend/src/modules/market-data-foundation/*`
- `backend/src/modules/data-quality-engine/*`
- `backend/src/modules/strategy-decision-engine/*`

## Behavior Delivered

- Added a backend-only `signal-position-ledger` module-local paginated active-row read model.
- Row inclusion now requires source-proven entry trigger evidence (`trigger_price_evidence.status = SOURCE_PROVEN`), numeric trigger price, trigger timestamp, and entry-compatible trigger type.
- Read model projects strategy/rule/version provenance from trigger contract evidence.
- Current return percent is computed only when entry basis is source-proven and latest persisted price + DQ trust basis is usable.
- Explicit stale/unavailable return states are emitted when price or trust basis is stale/unavailable.
- Health compatibility mapping is limited to:
  - `EXIT_CANDIDATE -> EXIT_TRIGGERED`
  - `REDUCE_RISK -> RISK_WARNING`
- All other lifecycle evidence remains explicitly unavailable.

## Contracts Changed

No shared cross-module contract file or route-registry change.  
Module-local DTO/types added for the new read model only.

## Tests Run

Passed:

1. `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand`
2. `cd backend && npm.cmd run build`
3. `cd backend && npm.cmd test -- signal-generation-engine.trigger-contract.test.ts strategy-decision-engine.service.test.ts market-data.service.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand`
4. `rg -n "active trade|open trade|closed trade|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|account gain|portfolio profit|financial advice" backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger` (no matches)

## Tests Skipped

- `signal-position-ledger.routes.test.ts` (not added; optional route assertions were not required for this slice).

## Assumptions

- Current trusted active inclusion is anchored on latest trusted signal rows plus trigger-contract source-proven evidence.
- DQ trust projection uses existing persisted evaluation outputs and does not recompute DQ scoring logic.

## Risks / Limitations

- Module is not mounted into `backend/src/api/routes.ts` by design; Team 00 shared-file gate is still required for runtime API exposure.
- Lifecycle truth remains compatibility-only (`EXIT_TRIGGERED` / `RISK_WARNING`) and does not prove durable open/closed position lifecycle.
- Worktree required local `backend/node_modules` junction for command execution parity; no package manifest change was made.

## Blockers

None for Team 04 backend QA on this bounded child.

## Shared-File Requests

None requested in this pass.

## Next Gate

Team 04 QA verification for backend-only bounded scope, followed by Team 00 integration sequencing.

---

## Team 10 Rework Delta (2026-05-26)

### Rework Reason

Team 10 code review rejected bounded issues in active-row DQ projection and module-boundary typing.

### Rework Files Changed

- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/13-implementation-evidence/CF-W2-SPL-01B-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-01B-outbox.md`

### Exact Fixes Applied

1. `currentDataQualityStatus` now reads only latest persisted/public DQ (`quality?.signalReadinessStatus ?? null`) and no longer falls back to trigger snapshot DQ.
2. Removed private import `../signal-generation-engine/signal-generation-engine.types` for `SignalTriggerContractDto`; introduced local `SignalPositionTriggerContractReadModel` with only consumed fields.
3. Added focused tests for:
   - missing latest DQ -> unavailable trust projection and null current DQ status
   - `REDUCE_RISK -> RISK_WARNING`
   - unsupported decision values -> `healthState = null`, `lifecycleEvidenceStatus = UNAVAILABLE`
   - multi-page source filtering + active-row pagination behavior

### Validation Rerun (Rework)

Passed:

1. `cd backend && npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand`
2. `cd backend && npm.cmd run build`
3. Forbidden-language scan:
   - `rg -n "buy now|sell now|guaranteed|profit target|price target|must buy|must sell|guaranteed return|financial advice|target price|reward/risk|R:R" backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger`
   - Result: no matches

### Remaining Risks / Blockers

- No new blocker in bounded scope.
- Global route mounting remains intentionally out of scope for this team slice.

# TEAM-04 - CF-W2-SPL-02 QA Plan Outbox

Date: 2026-05-26

Owner: Team 04 - QA Factory

## Assignment

Prepare a docs-only QA plan for `CF-W2-SPL-02` Signal Position Ledger active positions surface.

Scope was limited to QA planning inside the active execution folder. No application source, tests, package manifests, Prisma schema, migrations, generated files, shared UI, backend/frontend source, route registries, or implementation worktrees were modified.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SPL-02-qa-plan-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-SPL-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W2-SPL-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-02-architecture-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-01B-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-RH-01A-qa-plan-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-L3-PORT-01B-qa-plan.md`
- `backend/package.json`
- `frontend/package.json`

## QA Plan Result

`QA-PLAN READY`

The plan covers:

- backend route mounting for the accepted `CF-W2-SPL-01B` router;
- effective active endpoint `/api/v1/signals/position-ledger/active`;
- active-list scope, pagination, response shape, and newest-entry ordering;
- frontend route `/signal-position-ledger`;
- navigation label under `Daily Work`;
- `Active Positions` default tab and required active-row fields;
- placeholder-only `Closed History` tab;
- no closed-history API call, rows, counts, mocks, close fields, or inferred return values;
- research-support language guard;
- `totalCount` as the only scope-wide active summary count;
- page-local labels for derived status counts;
- exact focused backend, frontend, Playwright, build, and language-guard commands.

## Required Commands Later

```powershell
Get-Counter '\Memory\% Committed Bytes In Use'
```

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
```

If route registry coverage is implemented separately:

```powershell
cd backend
npm.cmd test -- routes.test.ts --runInBand
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
npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

```powershell
rg -n -i '\b(active trade|active trades|open trade|open trades|closed trade|closed trades|buy|sell|target|profit target|price target|reward/risk|risk:reward|R:R|broker|execution|realized P/L|realized profit|financial advice|must buy|must sell)\b' backend/src/api/routes.ts backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger frontend/src/app/routes.tsx frontend/src/app/navigationMetadata.tsx frontend/src/features/signal-position-ledger frontend/tests/ui/signal-position-ledger.spec.ts
```

## Team 00 Recommendation

Team 04 recommends Team 00 may promote `CF-W2-SPL-02` after confirming:

- the implementation base contains accepted `ca31d79`;
- one writer is reserved for `backend/src/api/routes.ts`;
- one writer is reserved for `frontend/src/app/routes.tsx`;
- one writer is reserved for `frontend/src/app/navigationMetadata.tsx`;
- implementation remains inside the Team 03 allowed file packet;
- no closed-history API, storage, rows, counts, mocks, or inferred values are opened.

## Tests Run

None.

## Tests Skipped

- backend focused tests
- backend build
- frontend build
- Playwright smoke
- language guard
- live local data validation

## Skipped-Test Reason

Docs-only QA planning task with no implementation handoff and explicit instruction not to modify application source, tests, package manifests, Prisma/schema/migrations/generated files, shared UI, backend/frontend source, route registries, or implementation worktrees.

## Blockers

No QA-planning blocker remains.

Executable QA remains blocked until Team 00 promotes the item, confirms the `ca31d79` base dependency, records shared-file reservations, and receives an implementation handoff.

## Next Gate

Team 00 Ready promotion and shared-file sequencing.

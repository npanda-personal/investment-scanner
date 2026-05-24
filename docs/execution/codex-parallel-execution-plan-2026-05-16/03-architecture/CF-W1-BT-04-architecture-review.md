# CF-W1-BT-04 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

ACCEPT / ARCHITECTURE-READY-CANDIDATE.

This packet is not Ready for Implementation yet. Team 04 QA planning is still required, and Team 00 must sequence it behind the accepted parked backtesting writer set.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-03-work-packet.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`
- `git branch --contains 8f984b1`
- `git branch --contains bb49ce2`

## Current Source Findings

- The backend already returns the raw inputs needed to classify saved-run proof freshness:
  - `generatedAt`
  - `availabilityStatus`
  - `calculationAudit`
  - current normalized run metrics
  - run config scope and strategy identifiers
- The current frontend saved-run list and selected-run panel do not show any explicit current-versus-historical proof label, so a backend-only change would not close the user-visible trust gap.
- The required UI work remains module-local inside `BacktestingStrategyLabPage.tsx`; no shared component or route change is required.
- Current `dev` does not contain the accepted parked `BT-03` writer set. A new backtesting writer pass must stack on the accepted backtesting trust branch, not plain `dev`.

## Architecture Decision

Prepare `CF-W1-BT-04` as one bounded `backtesting-strategy-lab` backend plus feature-local UI packet.

The smallest honest investor/trader packet is:

- additive backend current-proof classification for saved runs; plus
- feature-local saved-run list and selected-run detail rendering of the same label and summary.

## Proposed Contract Shape

The first child should add a stable additive current-proof object equivalent to:

```ts
type BacktestCurrentProofStatus =
  | 'CURRENT_PROOF'
  | 'STALE_PROOF'
  | 'REPAIRED_HISTORICAL'
  | 'LIMITED_HISTORICAL_PROOF';

type BacktestCurrentProofReasonCode =
  | 'LATEST_COMPARABLE_RUN'
  | 'OLDER_THAN_LATEST_COMPARABLE_RUN'
  | 'LEGACY_INVALID_REPAIRED'
  | 'INSUFFICIENT_HISTORY'
  | 'MISSING_PRICE_HISTORY'
  | 'LOW_DATA_COVERAGE'
  | 'BENCHMARK_UNAVAILABLE'
  | 'NO_TRADES';

interface BacktestCurrentProof {
  status: BacktestCurrentProofStatus;
  summary: string;
  reasonCodes: BacktestCurrentProofReasonCode[];
  latestComparableRunGeneratedAt: string | null;
  runGeneratedAt: string | null;
}
```

Exact field names may differ, but the behavior must remain stable.

## Required Mapping Rules

- `CURRENT_PROOF`
  - the run is the latest comparable saved run for the same strategy/scope/timeframe shape
  - no legacy-invalid repair warning is active
  - no insufficient-history or no-trade blocker forces a lower-trust label
- `STALE_PROOF`
  - a newer comparable run exists
  - the summary must say that the run is older than the latest comparable proof
- `REPAIRED_HISTORICAL`
  - `calculationAudit.aggregateStatus = LEGACY_INVALID`, or
  - equivalent repair-only historical handling is active
- `LIMITED_HISTORICAL_PROOF`
  - the run can still be shown, but it is limited by `INSUFFICIENT_HISTORY`, missing price history, no trades, or similar structural limitation

## Module Boundary

- Backend owner: `backtesting-strategy-lab`
- Frontend owner: `backtesting-strategy-lab`
- No route-registry, shared UI, package, generated, Prisma, or upstream module ownership opens in this child

## Exact Future File Reservations

Allowed future writer set:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Exact Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `frontend/src/features/backtesting-strategy-lab/api/**`
- `frontend/src/features/backtesting-strategy-lab/hooks/**`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/market-data-foundation/**`
- shared backend utilities
- shared frontend components
- package manifests
- generated files

## Dependencies And Sequencing

- Hard implementation base: accepted `CF-W1-BT-03` commit `8f984b1`
- Do not branch this child from current `dev`
- The reserved writer set is the same module-local writer set as `BT-03`
- Team 00 must keep the packet isolated to one dedicated backtesting writer worktree

## Shared-File Risk Assessment

- Shared route registries: no change allowed
- Shared UI: no change allowed
- Shared backend utilities: no change allowed
- The real risk is one-writer sequencing against the accepted parked backtesting trust branch, not shared architecture sprawl

## QA Implications

Team 04 should prepare QA for:

- `CURRENT_PROOF`
- `STALE_PROOF`
- `REPAIRED_HISTORICAL`
- `LIMITED_HISTORICAL_PROOF`
- same label and summary in the saved-run list and selected-run panel
- preserved benchmark, exit-diagnostic, coverage, and calculation-audit panels
- no fabricated walk-forward, holdout, optimization, or forward-proof claims

## Architecture Verdict

- Item: `CF-W1-BT-04`
- Result: `ARCHITECTURE-READY-CANDIDATE`
- Blocked: no
- Next gate: Team 04 QA planning, then Team 00 Ready evaluation on stacked backtesting base `8f984b1`

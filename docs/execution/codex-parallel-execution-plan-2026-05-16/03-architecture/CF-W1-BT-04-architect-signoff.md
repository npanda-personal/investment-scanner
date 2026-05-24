# CF-W1-BT-04 Architect Signoff

Date: 2026-05-24

Architect: Team 03 - Architecture Factory

## Decision

`ACCEPT`

Architect signoff accepts `CF-W1-BT-04` as a bounded `backtesting-strategy-lab` saved-run proof-freshness slice.

## Scope Reviewed

- Requirement: `10-requirements/CF-W1-BT-04-backtesting-run-freshness-and-current-proof-labels-requirement.md`
- Architecture review: `03-architecture/CF-W1-BT-04-architecture-review.md`
- Contract: `06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- Work packet: `08-work-packets/CF-W1-BT-04-work-packet.md`
- Team06 developer handoff in the implementation worktree
- Team04 QA verification: `04-qa/CF-W1-BT-04-qa-verification.md`
- Team10 review: `18-integration-queue/CF-W1-BT-04-code-review.md`
- Lightweight worktree inspection on `codex/team06-strategy-signal/CF-W1-BT-04` against base `8f984b198f155fb6b10bc330818fbdeaad8360d0`

## Architecture Boundary Verification

1. Reserved writer-set compliance passes.
   - `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --` in the Team06 worktree shows only the seven reserved implementation files.
   - `git status --short` adds only the two Team06 branch-local handoff docs.
   - No schema, migration, repository, controller, router, validation, module export, frontend API/hook/route, shared UI, shared backend utility, package, generated-file, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry drift was found.

2. `currentProof` remains additive and read-path only.
   - Backend/frontend type changes add new unions/interfaces and optional `currentProof` fields only.
   - No Prisma, persistence, repository query shape, route surface, or generated contract was widened.

3. List/detail derivation consistency is architecturally coherent.
   - `listRuns()` and `getRun()` both route normalized runs through `withCurrentProofMetadata()` in `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`.
   - The current UI selected-run flow stays on the same `listRuns()` dataset through `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`, so the exposed saved-run list and selected-run detail surfaces share the same proof-freshness packet for the same run.

4. Status mapping is safe and does not overclaim proof.
   - `deriveCurrentProof()` maps `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, `LIMITED_HISTORICAL_PROOF`, and `UNAVAILABLE_PROOF_BASIS`.
   - Failed or availability-error runs return visible unavailable reasons instead of implying freshness.
   - `LEGACY_INVALID` and repaired-trade-row evidence are downgraded to repaired historical, not treated as current proof.
   - Limited evidence states use structural reasons such as insufficient history, missing price history, no trades, partial availability, low coverage, or unavailable benchmark.
   - The `CURRENT_PROOF` summary remains explicitly historical research evidence only and does not claim forward validation.

5. Comparable-run freshness ranking is constrained safely.
   - `isComparableProofCandidate()` excludes failed runs, availability-error runs, legacy-invalid aggregate runs, and repaired-trade-row runs from becoming the latest positive proof basis for other runs.
   - This preserves the contract rule that repaired or unavailable evidence must not silently upgrade into current proof.

6. Local/free/product-policy constraints remain intact.
   - No paid/cloud/provider/broker behavior was introduced.
   - No target-price, profit-target, R:R, Trade Plan-first, guarantee, or direct-advice wording was found in the changed source/test scope.

## Team10 Residual Risk Assessment

Team10's repository-cap note is `non-blocking` for this signoff.

Reason:

- the existing `backtesting-strategy-lab.repository.ts` `listRuns()` cap at `100` is pre-existing and explicitly outside the BT-04 write scope;
- the user-facing BT-04 selected-run flow uses the `listRuns()` dataset already held in the feature hook, so the list/detail consistency promised by this slice holds for the exposed saved-run workflow;
- the residual risk is limited to deep-history direct detail retrieval through `getRun(id)` when a newer comparable run falls outside that repository window.

This is a follow-up architecture debt item, not a BT-04 blocker. If standalone historical detail retrieval becomes a required product workflow, Team 00 should open a separate repository-scope requirement.

## Validation / Evidence

Architect lightweight checks run:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff --stat 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff --check 8f984b198f155fb6b10bc330818fbdeaad8360d0 -- <reserved source/test file paths>`
- `rg -n "currentProof|CURRENT_PROOF|STALE_PROOF|REPAIRED_HISTORICAL|LIMITED_HISTORICAL_PROOF|UNAVAILABLE_PROOF_BASIS|withCurrentProofMetadata|deriveCurrentProof|isComparableProofCandidate|listRuns\\(|getRun\\(" ...`
- `rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|Trade Plan" ...`
- read-only snippet inspection of:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
  - `frontend/src/features/backtesting-strategy-lab/types.ts`
  - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
  - `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
  - `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

Evidence relied on:

- Team04 QA verdict: `ACCEPT`
- Team10 review verdict: `ACCEPT`
- Team04-recorded passing commands:
  - `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - `cd frontend && npm.cmd run build`
  - Team00 runtime-support Playwright rerun on `http://127.0.0.1:5224` with `4` tests passed

## Risks / Assumptions

- Residual non-blocking risk: deep-history direct `getRun(id)` freshness comparison can still miss a newer comparable run outside the repository `take: 100` window.
- Assumption: BT-04 acceptance is for the bounded saved-run list plus selected-run detail workflow defined in the requirement/work packet, not for a new unlimited historical-detail retrieval contract.
- No blocker was found that requires reopening schema, route, repository, or shared-file scope for this child.

## Next Gate

Route `CF-W1-BT-04` to Product Owner acceptance.

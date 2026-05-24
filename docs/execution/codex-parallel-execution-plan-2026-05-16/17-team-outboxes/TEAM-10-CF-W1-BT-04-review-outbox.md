# TEAM-10 Review / Release - CF-W1-BT-04

Date: 2026-05-24

## Verdict

`ACCEPT`

## Work Item

- Work item: `CF-W1-BT-04`
- State/mode: Review complete, release-gate audit
- Owner: Team 10 - Review / Release
- Lane/module: Lane 2 / `backtesting-strategy-lab`
- Branch/worktree reviewed: `codex/team06-strategy-signal/CF-W1-BT-04` / `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`

## Scope Reviewed

This review was limited to:

- the seven reserved BT-04 implementation files in backend/frontend/doc/test scope;
- the two Team06 handoff docs in the implementation worktree;
- the Team04 QA verification and QA outbox docs on the main repo;
- lightweight diff, language, and correctness inspection for current-proof derivation, DTO compatibility, preserved frontend evidence surfaces, and forbidden-scope drift.

## Findings

No blocking findings.

Key review points:

1. Diff scope is exact.
   - `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --` shows only the seven reserved implementation files.
   - `git status --short` adds only the two Team06 handoff docs as branch-local evidence.
   - No forbidden schema, route, shared UI/util, package, generated, provider/live, startup/backfill, paid/cloud, or broker scope drift was found.

2. Backend current-proof derivation is coherent in the reserved slice.
   - `listRuns()` and `getRun()` both route through `withCurrentProofMetadata()` in `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:69-85`.
   - `isComparableProofCandidate()` at `:1050-1056` excludes failed runs, availability-error runs, `LEGACY_INVALID` aggregate runs, and repaired-trade-row runs from becoming the latest comparable proof basis.
   - `deriveCurrentProof()` at `:1058-1137` covers `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, `LIMITED_HISTORICAL_PROOF`, and `UNAVAILABLE_PROOF_BASIS`.

3. DTO changes are additive.
   - Backend and frontend type files add new unions/interfaces and optional `currentProof` fields only.
   - No route or persistence contract drift was introduced.

4. Frontend preserves existing trust surfaces.
   - `resolveRunEvidence()` in `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:168-202` retains review-disposition and proof-basis fallbacks while adding proof freshness.
   - Saved-run list/detail continue to show review disposition, proof basis, benchmark/coverage/audit surfaces, now with proof freshness alongside them at `:528-557` and `:580-650`.

5. Tests are meaningful for this slice.
   - Backend test `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts:643-767` covers all five statuses and list/detail alignment.
   - UI spec `frontend/tests/ui/backtesting-strategy-lab.spec.ts:223-312` covers repaired-historical detail rendering plus current/stale list-detail consistency.

6. Language safety is clean.
   - Reviewer `rg` scan found no arbitrary target, R:R, Trade Plan-first, guarantee, or direct-advice language in the changed source/test scope.

## Validation / Evidence

Reviewer commands run:

- `git status --short`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff --stat 8f984b198f155fb6b10bc330818fbdeaad8360d0 --`
- `git diff 8f984b198f155fb6b10bc330818fbdeaad8360d0 -- <reserved file paths>`
- `git diff --check 8f984b198f155fb6b10bc330818fbdeaad8360d0 -- <reserved source/test file paths>`
- `rg -n "currentProof|CURRENT_PROOF|STALE_PROOF|REPAIRED_HISTORICAL|LIMITED_HISTORICAL_PROOF|UNAVAILABLE_PROOF_BASIS" ...`
- `rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|Trade Plan" ...`

Evidence relied on:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-BT-04-qa-verification.md` -> `ACCEPT`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W1-BT-04-qa-outbox.md` -> `ACCEPT`
- Team04-recorded passes for:
  - `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
  - `cd backend && npm.cmd run build`
  - `cd frontend && npm.cmd run build`
  - Team00 runtime-support Playwright rerun on `http://127.0.0.1:5224` with `4` tests passed

## Skipped Checks

- Team 10 did not rerun focused Jest, builds, or Playwright because Team04 QA already accepted the candidate and this pass was intentionally limited to lightweight inspection.
- No live local data validation was rerun in review because the accepted QA packet already covered the bounded saved-run regression surface.

## Risks / Assumptions

- Residual risk: the existing repository cap at `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts:75-77` can still limit freshness comparison for very old detail views because `getRun()` depends on `listRuns(userId)` for comparable-run discovery.
- Assumption: Architect signoff will treat that cap as known legacy behavior outside the reserved BT-04 write scope, not as a hidden contract change introduced by Team06.

## Next Gate

Route to Team 03 Architect Signoff.

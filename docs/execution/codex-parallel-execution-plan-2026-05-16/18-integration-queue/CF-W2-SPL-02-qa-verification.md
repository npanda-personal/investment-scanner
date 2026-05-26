# CF-W2-SPL-02 QA Verification

Date: 2026-05-26
Owner: Team 04 - QA Verification
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`

## Work Item

`CF-W2-SPL-02` - Signal Position Ledger active positions surface.

## QA Rerun Context

Rerun executed after Team 10 code-review rejection for:

1. stale prior-scope totals/page counts appearing under a newly selected scope while the new scoped response was loading;
2. missing explicit UI smoke evidence for active loading and active error states.

## QA Verdict

`ACCEPT`

The Team 10 high finding is fixed, the required UI smoke coverage now includes active loading and active error states, and the rework stayed inside the bounded Team 06 frontend/doc scope. Team 10 rereview can proceed.

## Authority And Evidence Reviewed

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SPL-02-qa-plan.md`
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
- `frontend/tests/ui/signal-position-ledger.spec.ts`

## Base And Scope Confirmation

- `git merge-base --is-ancestor ca31d79 HEAD` passed. Required dependency `ca31d79 feat: add signal position ledger read model` is present on the implementation base.
- Rework inspection matched the Team 06 bounded rework list:
  - `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts`
  - `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx`
  - `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx`
  - `frontend/tests/ui/signal-position-ledger.spec.ts`
  - Team 06 handoff/outbox docs
- No rework widening was found into backend source/tests/routes, route/navigation, other feature folders, shared UI/context, schema/migrations/generated files, package manifests/lockfiles, provider/live/startup/scheduler files, or Closed History API/data/detail scope.
- Current branch still contains the earlier reviewed implementation surfaces for SPL-02, but this rerun found no new post-rejection widening beyond the allowed frontend/doc rework files.

## Rerun Findings

### 1. Team 10 high finding is fixed

- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts:47-85` now versions requests with `latestRequestRef`, invalidates stale responses on scope change, and projects non-current scope payloads to an empty scoped response.
- `frontend/src/features/signal-position-ledger/hooks/useSignalPositionLedgerActiveRows.ts:110-112` keeps the active surface in loading mode and suppresses stale-scope error display until the in-scope payload arrives.
- `frontend/src/features/signal-position-ledger/components/SignalPositionSummaryStrip.tsx:32-47` renders a scoped loading message instead of stale counts while active data is still loading for the selected scope.
- `frontend/src/features/signal-position-ledger/components/SignalPositionLedgerPage.tsx:61-74` continues to render the active summary/table path with the hook-provided loading state and keeps Closed History as placeholder-only.
- Playwright rerun passed `frontend/tests/ui/signal-position-ledger.spec.ts:190-253`, which asserts:
  - the scope label changes to `US / STOCK`;
  - `Loading active position summary for US / STOCK.` is visible during the delayed scoped response;
  - prior `IN / STOCK total` and `This page` counts are absent while the new scoped response is pending;
  - the final US empty state renders after the delayed response resolves.

### 2. Required active loading and active error smoke coverage now exists

- Playwright rerun passed the new loading-state scenario at `frontend/tests/ui/signal-position-ledger.spec.ts:190-253`.
- Playwright rerun passed the new active error-state scenario at `frontend/tests/ui/signal-position-ledger.spec.ts:256-269`.
- The error-state test proves scoped error messaging is rendered for `IN / STOCK`, a retry control is visible, and no fallback rows or empty-state copy are shown.

### 3. Closed History remained deferred

- No closed-history API client, route, rows, counts, detail route, or data expansion was added in the rework files.
- The existing smoke scenario still verifies zero calls to `history`/`closed` URLs and placeholder-only Closed History behavior.

## Commands Run

Memory checks before heavy commands:

1. `Get-Counter '\Memory\% Committed Bytes In Use'` -> `79.1223745046003`
2. `Get-Counter '\Memory\% Committed Bytes In Use'` -> `77.235140622881`
3. `Get-Counter '\Memory\% Committed Bytes In Use'` -> `75.787719729307`
4. `Get-Counter '\Memory\% Committed Bytes In Use'` -> `81.1796980400522`

Verification commands:

1. `cd frontend && npm.cmd run build`
   - pass
   - note: pre-existing Vite large-chunk warning remains
2. `cd frontend && npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
   - sandboxed run failed with `EPERM` on `frontend/test-results/.last-run.json`
3. `netstat -ano | Select-String ':5173|:5174|:5175|:5180|:5181'`
   - local frontend listeners were present on multiple ports
4. `Invoke-WebRequest -Uri 'http://127.0.0.1:5181' -UseBasicParsing`
   - pass (`200`)
5. `Invoke-WebRequest -Uri 'http://127.0.0.1:5181/signal-position-ledger' -UseBasicParsing`
   - pass (`200`)
6. `cd frontend && $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5181'; npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
   - pass outside sandbox
   - result: `3 passed`
   - exact server used: `http://127.0.0.1:5181`
7. `rg -n -i '\b(active trade|active trades|open trade|open trades|closed trade|closed trades|buy|sell|target|profit target|price target|reward/risk|risk:reward|R:R|broker|execution|realized P/L|realized profit|financial advice|must buy|must sell)\b' backend/src/api/routes.ts backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger frontend/src/app/routes.tsx frontend/src/app/navigationMetadata.tsx frontend/src/features/signal-position-ledger frontend/tests/ui/signal-position-ledger.spec.ts`
   - no matches
8. `git diff --check`
   - pass
   - note: git emitted LF-to-CRLF normalization warnings only; no whitespace errors were reported

## Skipped Checks

- Backend focused tests/build were not rerun in this QA pass because the Team 10 rejection and Team 06 rework were frontend-only and this rerun was explicitly scoped to the rejected UI behavior and smoke coverage.
- No live-backend UI run was added; the Playwright rerun remained mock-backed for active-list responses.

## Residual Risks / Limitations

- The UI smoke proves the rejected scope-transition, loading, and error behavior through mocked active-list responses rather than a live backend-fed browser flow.
- Future reruns should continue recording an explicit `PLAYWRIGHT_BASE_URL` because the local environment has multiple active frontend listeners.
- Frontend build still emits the pre-existing Vite large-chunk warning.

## Next Gate

`ACCEPT` for QA rerun. Team 10 rereview can proceed.

# TEAM-04 QA Outbox - CF-W1-BT-04

Date: 2026-05-24

## Work Item

`CF-W1-BT-04` - backtesting saved-run freshness and current-proof labels.

## Verdict

`ACCEPT`

## Scope Summary

QA verified the Team06 candidate only in:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

`git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --` showed only the seven reserved implementation files. `git status --short` additionally showed the two Team06 handoff docs as untracked, which stays within the allowed BT-04 scope.

## Command Results

- Passed: `cd backend && npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand`
  - `1` suite passed, `22` tests passed
- Passed: `cd backend && npm.cmd run build`
- Passed: `cd frontend && npm.cmd run build`
  - existing large-chunk Vite warning remains
- Language scan:

```powershell
rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|Trade Plan" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab frontend/src/features/backtesting-strategy-lab frontend/tests/ui/backtesting-strategy-lab.spec.ts
```

  - no matches

## UI Smoke Status

Resolved runtime-support evidence accepted:

```powershell
$frontend='C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\frontend'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5224'
$vite = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5224','--strictPort','--force' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 8
try { npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1 } finally { Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue }
```

Outcome:

- passed
- `4` tests passed
- `36.4s`
- fresh Vite runtime on `http://127.0.0.1:5224` with `--force`

Historical blocker record preserved:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Outcome:

- sandbox run failed with `spawn EPERM`
- escalated rerun executed against Team06 frontend target `http://127.0.0.1:5174`
- auth proxy itself was healthy; login through `5174` returned `200` for `codex.test@example.com`
- Playwright still failed all four tests before module verification because the frontend crashed during bootstrap

Exact blocker:

- `Invalid hook call`
- `TypeError: Cannot read properties of null (reading 'useState')`
- shared runtime crash in `frontend/src/app/ThemeContext.tsx:17-26`
- result: blank page, no login heading, no `Log out` button, no module chrome

## Risk

- Existing large-chunk frontend build warning remains:
  - `assets/index-B4O_mItd.js` is still above the Vite warning threshold after minification
- Repository `listRuns` remains capped by the existing repository behavior noted in the Team06 handoff; it is outside the reserved BT-04 QA scope.

## Next Owner / Next Gate

- Next owner: `Team 10 review / lead validation`
- Next gate: QA accepted for `CF-W1-BT-04`

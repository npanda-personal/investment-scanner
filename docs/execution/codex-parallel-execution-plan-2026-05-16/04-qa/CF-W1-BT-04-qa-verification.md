# CF-W1-BT-04 QA Verification

Date: 2026-05-24

Owner: Team 04 QA Factory

## Work Item

`CF-W1-BT-04` - backtesting saved-run freshness and current-proof labels.

## Verdict

`ACCEPT`

The Team06 candidate is scope-clean, the focused backend and build reruns pass, and the previous feature-local UI smoke blocker is now closed by the Team00 runtime-support rerun recorded in the Team06 handoff/outbox. The QA packet moves from `CONDITIONAL` to `ACCEPT` with the original blocker history preserved below.

## Verification Target

- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04`
- Branch: `codex/team06-strategy-signal/CF-W1-BT-04`
- Required base: `8f984b198f155fb6b10bc330818fbdeaad8360d0`
- `git rev-parse HEAD`: `8f984b198f155fb6b10bc330818fbdeaad8360d0`
- Verified candidate shape: working-tree changes on top of the required base commit

## Files Verified

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Forbidden Scope Check

`git diff --name-only 8f984b198f155fb6b10bc330818fbdeaad8360d0 --` showed only the seven reserved implementation files above. `git status --short` additionally showed the two Team06 handoff docs as untracked:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-04-developer-handoff.md`

No forbidden repository, route, schema, shared UI, package, generated-file, provider/live-data, startup/backfill, or cross-module file was changed.

## Read-Only Findings Before Command Execution

- Backend list/detail normalization uses the same current-proof derivation path:
  - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:69-85`
  - `withCurrentProofMetadata()` and `deriveCurrentProof()` apply the additive packet for both list and detail:
    - `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts:1028-1181`
- The service mapping covers all required statuses:
  - `CURRENT_PROOF`
  - `STALE_PROOF`
  - `REPAIRED_HISTORICAL`
  - `LIMITED_HISTORICAL_PROOF`
  - `UNAVAILABLE_PROOF_BASIS`
- Focused backend tests cover the five required proof states and list/detail consistency:
  - `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts:643-767`
- Frontend keeps proof freshness additive to existing review/proof-basis surfaces:
  - fallback packet and label/chip helpers:
    - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:103-203`
  - saved-run list row keeps proof freshness, review disposition, and proof basis visible together:
    - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:525-557`
  - selected detail keeps proof freshness, review disposition, and proof basis visible together:
    - `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx:580-650`
- The feature-local UI smoke was extended to assert repaired-historical proof freshness and list/detail current/stale consistency:
  - `frontend/tests/ui/backtesting-strategy-lab.spec.ts:223-311`

## Language Safety Check

Command run:

```powershell
rg -n "price target|profit target|target price|reward/risk|R:R|buy now|sell now|must buy|must sell|guaranteed|financial advice|automated trade instruction|Trade Plan" backend/src/modules/backtesting-strategy-lab backend/tests/modules/backtesting-strategy-lab frontend/src/features/backtesting-strategy-lab frontend/tests/ui/backtesting-strategy-lab.spec.ts
```

Result:

- No matches in the verified scope.

## Environment Notes

- Memory check before heavy commands:

```powershell
typeperf "\Memory\% Committed Bytes In Use" -sc 1
```

- Result: `94.34%` committed bytes in use.
- Because this verification turn explicitly required the build/test commands, QA proceeded sequentially with one heavy process at a time and one Playwright invocation only.

## Commands Run And Results

### 1. Focused backend service test

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

Result:

- Passed
- `1` suite passed
- `22` tests passed

### 2. Backend build

```powershell
cd backend
npm.cmd run build
```

Result:

- Passed

### 3. Frontend build

```powershell
cd frontend
npm.cmd run build
```

Result:

- Passed
- Existing Vite large-chunk warning remains:
  - `assets/index-B4O_mItd.js` reported above the 500 kB warning threshold after minification

### 4. Feature-local UI smoke resolution evidence

QA accepted the resolved Playwright evidence already written into the Team06 handoff/outbox after Team00 runtime support cleared the shared frontend bootstrap failure. To avoid duplicating a passing browser run and to honor the one-Playwright-invocation-at-a-time constraint, QA did not perform another rerun in this pass.

Resolved runtime-support command:

```powershell
$frontend='C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\frontend'
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5224'
$vite = Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5224','--strictPort','--force' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 8
try { npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1 } finally { Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue }
```

Result:

- Passed
- `4` tests passed
- Duration: `36.4s`
- Runtime: fresh Vite dev server on `http://127.0.0.1:5224` with `--force`

### 5. Historical UI blocker record preserved from the previous conditional pass

Initial sandbox attempt:

```powershell
cd frontend
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Result:

- Blocked by sandbox worker spawn error: `Error: spawn EPERM`

Escalated rerun after starting the Team06 frontend on `http://127.0.0.1:5174`:

```powershell
Start-Process -FilePath npm.cmd -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5174' -WorkingDirectory 'C:\work\repo\investment-scanner-worktrees\team06-CF-W1-BT-04\frontend' -WindowStyle Hidden
```

Result:

- Team06 frontend dev target on `5174` served `200`
- Proxied auth login through `5174` returned `200` and a valid user/token payload for `codex.test@example.com`

Escalated Playwright rerun:

```powershell
cd frontend
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

Result:

- Executed outside sandbox
- `4` tests failed before module verification could begin
- Common failure point: `tests/ui/support/auth.ts` waiting for the authenticated `Log out` button

## Exact UI Blocker Record From Prior Pass

- `exact blocker`:
  - the Team06 frontend runtime on `http://127.0.0.1:5174` crashes during bootstrap before auth or module chrome render
  - Playwright trace captured:
    - repeated `@emotion/react` duplicate-load warnings
    - `Invalid hook call`
    - `TypeError: Cannot read properties of null (reading 'useState')`
    - crash site: `CustomThemeProvider` in `frontend/src/app/ThemeContext.tsx:17-26`
  - because the app crashes before route rendering, neither the login heading nor the `Log out` button becomes visible, and the screenshot artifact is a blank page
- `skipped command`:

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
```

  - This command was executed twice already (sandbox and escalated). Further reruns are skipped until the shared frontend bootstrap failure is cleared.
- `risk`:
  - user-visible proof-freshness chips and summaries for `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, `LIMITED_HISTORICAL_PROOF`, and `UNAVAILABLE_PROOF_BASIS` remain unverified in the live browser surface
  - list/detail consistency for the same run is verified by backend test coverage and UI spec intent, but not by a passing feature-local browser smoke
  - existing proof-basis, review-disposition, benchmark/coverage, realism-warning, exit-diagnostic, and calculation-audit surfaces remain unverified in a passing browser session
- `next owner`:
  - `Team 00 / runtime support` plus the shared frontend owner for the bootstrap failure in `frontend/src/app/ThemeContext.tsx`
  - return to `Team 04 QA` for a feature-local Playwright rerun after the runtime blocker is fixed

Resolved status:

- Closed by Team00 runtime-support rerun on `http://127.0.0.1:5224` with `--force`
- Recorded in:
  - Team06 handoff: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-BT-04-developer-handoff.md`
  - Team06 outbox: `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-BT-04-outbox.md`

## QA Assessment

- Backend acceptance intent is covered:
  - additive current-proof DTO fields exist in backend/frontend types
  - service classification covers all five required statuses, including the user-requested `UNAVAILABLE_PROOF_BASIS`
  - list/detail consistency is enforced in the same derivation path and covered by focused service assertions
- Scope control is clean:
  - no forbidden file drift
  - no route/schema/shared-component/package widening
- Language control is clean in the verified scope:
  - no target/R:R/Trade Plan-first/direct-advice wording found
- Required UI proof is now complete:
  - the reserved feature-local Playwright smoke passed in Team00 runtime support with a fresh `5224` Vite runtime and `--force`
  - the prior conditional blocker was a shared frontend bootstrap/runtime issue and is now closed
  - Team06 reserved BT-04 files remain acceptable for the requested scope

## Next Gate

`Team 10 review / lead validation`, with the QA gate satisfied for `CF-W1-BT-04`.

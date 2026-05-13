# QA Evidence - WP-2026-05-13-04A - 2026-05-13

## Decision

SIGN OFF `WP-2026-05-13-04A - Conservative Research Hub Actionability Adapter` after Architect rejection and revision.

## Verification Scope

- Verified the revised WP-04A handoff against Brief 4 and the Architect rejection anchors.
- Write scope respected: this QA pass edited only this evidence file.
- Source/test inspection stayed inside current Research Hub source, docs, and tests.
- Dirty worktree noted with unrelated active edits in other modules; no source/test work was reverted or modified.

## Architect Rejection Fix Verification

Architect rejection reason is fixed.

- Backend no longer passes market-gate `allowedActions` through to Research Hub `marketReadiness`; `marketReadiness.allowedActions` is always built as `[]` in `backend/src/modules/research-hub/research-hub.service.ts`.
- OPEN market headline is now `Market environment is open; confirm actionability evidence before reviewing setup readiness.` It no longer says `Environment is healthy: high-conviction setups allowed.` or equivalent permission language.
- `actionability.canReviewActionableSetups` remains `false` in the conservative adapter while Today Review, Trade Plan, Signal Quality, and Calibration readiness are not stable Research Hub inputs.
- UI renders `ActionabilitySummary` before `MarketReadinessHero`.
- UI suppresses market-gate action chips when `canReviewActionableSetups=false`; it shows `Market input only` and `Review actionability evidence` instead.
- UI derives the market hero headline from `actionability.dimensions.marketEnvironment.message` when setup readiness is unconfirmed, preventing stale/optimistic market copy from displaying.
- Research Hub docs now explicitly separate market environment readiness from actionable setup readiness and document suppression of market-gate allowance labels while setup readiness is unconfirmed.

## Commands Run By QA

Memory gate:

- `Get-Counter '\Memory\% Committed Bytes In Use'`
  - Before focused tests/builds: about `72%`.
  - Before UI smoke: about `73%`.
  - Result: below the 95% gate; focused verification was allowed.
- Initial `Get-CimInstance Win32_OperatingSystem` memory query was denied by Windows permissions, so QA used `Get-Counter`.

Backend:

- `backend`: `npm.cmd test -- research-hub --runInBand`
  - Result: passed, 1 suite / 8 tests.
  - Note: expected mocked market-gate error log appears in the partial-failure test.
- `backend`: `npm.cmd run build`
  - Result: passed.

Frontend:

- `frontend`: `npm.cmd run build`
  - First attempt timed out at the 120s command limit without a build result.
  - Rerun with a longer timeout passed.
  - Existing Vite large chunk warning remains.
- `frontend`: `npm.cmd run test:ui -- research-hub.spec.ts --workers=1`
  - First attempt failed before test execution with `EPERM: operation not permitted, rmdir '...frontend\test-results'`.
  - Rerun with approved escalation for Playwright test artifact cleanup passed, 2 tests.

## Evidence From Tests

Backend Research Hub tests now cover the exact rejected optimistic path:

- OPEN/HEALTHY market gate returns `marketReadiness.headline` with conservative market-environment wording.
- OPEN/HEALTHY market gate with upstream `allowedActions: ['NEW_LONG_TRADES_ALLOWED']` returns `marketReadiness.allowedActions: []`.
- Healthy market with unavailable Today Review and Trade Plan readiness returns:
  - `actionability.overallStatus = INSUFFICIENT_DATA`
  - `actionability.canReviewActionableSetups = false`
  - Today Review readiness `INSUFFICIENT_DATA`
  - Trade Plan readiness `INSUFFICIENT_DATA`
- Full serialized Research Hub response does not contain `setups allowed` or `NEW_LONG_TRADES_ALLOWED`.

Focused UI smoke verifies:

- `Actionability` appears before market readiness in the page flow.
- `Reviewable setups not confirmed` is visible.
- Market environment copy says it does not prove actionable setup readiness.
- Stale optimistic API fixture values, including `Environment is healthy: high-conviction setups allowed.` and `NEW_LONG_TRADES_ALLOWED`, are not rendered when `canReviewActionableSetups=false`.
- Research-only/proof-driven page structure and current module links still render.

## Conservative Semantics

PASS.

- Research Hub preserves a separate market environment dimension; OPEN market can make only `marketEnvironment` ready.
- Missing or unstable Signal Quality, Calibration, Today Review, and Trade Plan evidence remains `LIMITED` or `INSUFFICIENT_DATA`, not optimistic `READY`.
- No live-trading, order-placement, buy/sell, or execution readiness language was found in the revised Research Hub actionability path.
- Existing Research Hub priority behavior remains intact: framework-backed candidates may remain review candidates, but they do not make actionable setup readiness confirmed.

## Skipped Checks

- Authenticated local live API check was not rerun in this pass. Reason: the Architect rejection was specific to deterministic backend/UI copy and action-chip behavior, which is now covered by focused source inspection, backend unit coverage, build checks, and mocked UI smoke. Prior QA had already performed an authenticated local API check for the conservative backend actionability response.
- Full test suite was not run. Reason: WP-04A verification is narrow, the worktree contains active unrelated edits from other packets, and focused checks directly cover the rejection.

## Blockers

None.

## Final Handoff

SIGN OFF.

- Architect rejection reason is fixed.
- No optimistic actionability/setup permission appears when actionability is not confirmed.
- Conservative Research Hub semantics remain intact.
- No commit or push was performed.

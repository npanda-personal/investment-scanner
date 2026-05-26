# CF-W2-DOV-02 Dependency Integration Base Evidence

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Result

`DEPENDENCY BASE VERIFIED`

This is a routine integration-base checkpoint, not a Product Owner consent blocker.

## Branch / Worktree

- Integration branch: `codex/team00-integration/CF-W2-DOV-02-dependency-base`
- Integration worktree: `C:\work\repo\investment-scanner-worktrees\team00-CF-W2-DOV-02-dependency-base`
- Verified integration HEAD: `50bccc8 feat: add daily overview dashboard`

## Base Construction

Team 00 created the integration branch from accepted `CF-W2-CAL-02A`:

- `1be7d1a feat: add calibration evidence basis`

Then Team 00 replayed only the accepted `CF-W2-DOV-01` commit:

- `a371e2f feat: add daily overview dashboard`

Replay result:

- new integration commit `50bccc8 feat: add daily overview dashboard`
- no merge conflicts
- no full DOV-01 branch-history merge
- no Signal Calibration conflict resolution needed

Team 00 attempted to merge current `dev` docs into the integration branch, but aborted because it reintroduced the expected Signal Calibration conflicts. The DOV-02 implementation handoff must therefore read latest active docs from the main workspace while using the verified integration worktree for source implementation.

## Validation

Memory gate:

- `Get-Counter '\Memory\% Committed Bytes In Use'` -> `78.34%`

Commands run on `C:\work\repo\investment-scanner-worktrees\team00-CF-W2-DOV-02-dependency-base`:

- `cd backend; npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand` -> pass, `1` suite / `27` tests
- `cd backend; npm.cmd run build` -> pass
- `cd frontend; npm.cmd run build` -> pass with existing Vite chunk-size warning
- `cd frontend; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5180'; npm.cmd run test:ui -- signal-calibration-engine.spec.ts --workers=1` -> pass, `2` tests
- `cd frontend; $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5180'; npm.cmd run test:ui -- daily-overview-dashboard.spec.ts --workers=1` -> pass, `4` tests

Important note:

- An initial Signal Calibration UI smoke run against the default `5173` server failed because that server was not serving the integration worktree. Team 00 started a dedicated Vite server on `127.0.0.1:5180` for this integration worktree and reran the smoke successfully.

## Promotion Decision

`CF-W2-DOV-02` can now be promoted to a bounded Team 08 frontend-only implementation slice on a dedicated branch based on `50bccc8`.

Implementation branch:

- `codex/team08-ux-research/CF-W2-DOV-02`

Implementation worktree:

- `C:\work\repo\investment-scanner-worktrees\team08-CF-W2-DOV-02`

No schema, route registry, shared UI, backend, provider/live, startup/backfill, package, generated, or Signal Calibration source/test changes are approved.

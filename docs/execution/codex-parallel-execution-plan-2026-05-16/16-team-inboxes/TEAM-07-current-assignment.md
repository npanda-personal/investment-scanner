# TEAM-07 Current Assignment

Date: 2026-05-18

Team: TEAM-07 - Portfolio / Watchlist / Alerts

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-07-portfolio-watchlist-alerts.md`

## Assignment

Pull `CF-W1-L3-ALERT-01` for bounded implementation.

State: Ready for Implementation after Team 00 promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-ALERT-01`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-ALERT-01`
- Base: current local `dev` after the Team 00 Ready-promotion docs update.

Record the branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-07-outbox.md`.

## Work Item

`CF-W1-L3-ALERT-01` - alert readiness suppression for action-like alert event creation.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-L3-ALERT-01-alert-readiness-suppression-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-ALERT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-ALERT-01-alert-readiness-suppression-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-ALERT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`

Optional only if ownership-sensitive behavior is touched:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- Portfolio Management source/tests
- watchlist-management source/tests
- portfolio-intelligence source/tests
- frontend files
- notifications-delivery or copilot digest consumers
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Do not run providers, startup/backfill flows, live provider calls, Prisma migrations, package installs, broad services, or UI smoke tests for this slice.

## Implementation Requirements

- Consume `DataQualityEngineService` through the public Data Quality module export.
- Suppress stock, portfolio, and watchlist alert events unless the instrument has `READY` alert readiness.
- Prefer `automation` use-case tier `READY` when available.
- Fallback only when `automation` tier is absent: use `signal` tier `READY`, or `signalReadinessStatus = READY && eligibleForSignals = true` when tiers are absent.
- Treat `LIMITED`, missing DQ, `NOT_READY`, blocked tier, stale hard blocker, unsupported, scope mismatch, provider gap, and `UNUSABLE` as suppressed.
- Add readiness suppression evidence to `AlertEvaluationResult`.
- Add Data Quality evidence to created event metadata.
- Preserve duplicate suppression.
- Preserve parent-rule event ownership behavior from `CF-W1-L3-AUTH-02`.
- Keep wording research-support oriented; do not introduce advice, buy/sell, guarantee, target-price, or trade-instruction wording.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.validation.test.ts --runInBand
```

If the focused command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- Data Quality Engine source or public export changes
- shared DTO/helper files
- portfolio-management, watchlist-management, portfolio-intelligence, notifications, copilot, frontend, route, Prisma, provider, startup/backfill, package, generated-file, or live-data changes
- creating alert events from `LIMITED` or missing/non-ready DQ
- changing alert ownership model or direct `AlertEvent.userId`
- using live provider calls, paid services, broker credentials, cloud services, external telemetry, or provider-heavy startup behavior
- editing a file outside the allowed list

## Expected Outbox

Update `17-team-outboxes/TEAM-07-outbox.md` with:

- exact branch/worktree used
- starting commit
- exact files changed
- exact files inspected
- behavior changed
- tests run and results
- tests skipped and reasons
- forbidden files confirmed untouched
- assumptions, risks, blockers
- next gate: Developer Validation, Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, or Team 00 blocker routing

# TEAM-07 Current Assignment

Date: 2026-05-18

Team: TEAM-07 - Portfolio / Watchlist / Alerts

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-07-portfolio-watchlist-alerts.md`

## Assignment

Pull `CF-W1-L3-PORT-01A` for bounded implementation.

State: Ready for Implementation after Team 00 promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team07-portfolio-alerts/CF-W1-L3-PORT-01A`
- Worktree: `../investment-scanner-worktrees/team07-CF-W1-L3-PORT-01A`
- Base: latest local `dev` after the Team 00 Ready-promotion docs commit.

Record the branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-07-outbox.md`.

## Work Item

`CF-W1-L3-PORT-01A` - portfolio-management readiness DTOs.

Implement only the portfolio-management child slice from the parent Lane 3 readiness DTO contract.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-L3-PORT-01A-portfolio-readiness-dto-requirement.md`
- Architecture review: `03-architecture/CF-W1-L3-PORT-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-L3-PORT-01-portfolio-watchlist-readiness-dto-contract.md`
- Work packet: `08-work-packets/CF-W1-L3-PORT-01-work-packet.md`
- QA plan: `04-qa/CF-W1-L3-PORT-01-qa-plan.md`
- Team 03 reservation matrix: `03-architecture/team03-near-ready-file-reservation-matrix-2026-05-18.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/portfolio-management/portfolio-management.service.ts`
- `backend/src/modules/portfolio-management/portfolio-management.types.ts`
- `backend/src/modules/portfolio-management/portfolio-management.md`
- `backend/tests/modules/portfolio-management/portfolio-management.service.test.ts`

## Forbidden Files

Do not edit:

- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- Data Quality Engine source or public exports
- watchlist-management source/tests
- alerts-monitoring source/tests
- portfolio-intelligence source/tests
- frontend files
- providers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

Do not run providers, startup/backfill flows, live provider calls, Prisma migrations, package installs, broad services, or UI smoke tests for this slice.

## Implementation Requirements

- Add module-local portfolio readiness DTO fields to holding valuation output.
- Add a portfolio-level readiness summary to portfolio summary output.
- Preserve existing route paths and existing portfolio response fields, including `dataStatus`, price, valuation, and signal fields.
- Consume Data Quality through public service/type outputs only.
- Do not import `DataQualityEngineRepository`.
- Do not duplicate Data Quality scoring, stale thresholds, liquidity scoring, or coverage scoring.
- Use `DataQualityEvaluationDto.useCaseTiers` where available; do not request Data Quality export changes for `DataQualityUseCaseTiers`.
- Treat `READY` as trusted display/action eligibility only as defined by the accepted contract.
- Treat `LIMITED` as passive display only with visible reasons and blocked action eligibility.
- Treat missing, `NOT_READY`, `UNUSABLE`, stale hard blocker, unsupported, scope mismatch, or blocked tier evidence as blocked/untrusted.
- Ensure `dataStatus = COMPLETE` does not imply Data Quality trust.
- Keep wording research-support oriented; do not introduce advice, buy/sell, guarantee, target-price, or trade-instruction wording.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- portfolio-management.service.test.ts --runInBand
```

If the focused command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- Data Quality Engine source or public export changes
- shared DTO/helper files
- watchlist, alerts, portfolio-intelligence, notifications, copilot, frontend, route, Prisma, provider, startup/backfill, package, generated-file, or live-data changes
- treating `LIMITED` as action-ready
- breaking existing portfolio response compatibility
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
- next gate: Developer Validation, QA Verification, Code Review, Architect Signoff, or Team 00 blocker routing

# TEAM-09 Current Assignment

Date: 2026-05-18

Team: TEAM-09 - Platform / Auth / Subscription / Notifications

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md`

## Assignment

Pull `CF-W1-AUTH-SUB-01` for bounded implementation.

State: Ready for Implementation after Team 00 combined AUTH/SUB promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace and Team 07/Team 06 have separate implementation worktrees. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

This handoff intentionally combines `CF-W1-AUTH-01` and `CF-W1-SUB-01` under one Team 09 writer because they share subscription controller/test/doc files.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team09-platform/CF-W1-AUTH-SUB-01`
- Worktree: `../investment-scanner-worktrees/team09-CF-W1-AUTH-SUB-01`
- Base: current local `dev` after Team 00 Ready-promotion docs.

Record branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-09-outbox.md`.

## Evidence To Use

- Auth requirement: `10-requirements/CF-W1-AUTH-01-platform-auth-default-user-fallback-requirement.md`
- Subscription requirement: `10-requirements/CF-W1-SUB-01-local-manual-subscription-plan-policy-requirement.md`
- Auth contract: `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- Subscription contract: `06-contracts/CF-W1-SUB-01-manual-subscription-plan-policy-contract.md`
- Auth work packet: `08-work-packets/CF-W1-AUTH-01-work-packet.md`
- Subscription work packet: `08-work-packets/CF-W1-SUB-01-work-packet.md`
- Combined work packet: `08-work-packets/CF-W1-AUTH-SUB-01-combined-controller-policy-work-packet.md`
- Combined QA plan: `04-qa/CF-W1-AUTH-SUB-01-controller-policy-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts`
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

You may also update Team 09 reporting docs in the dedicated worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-AUTH-SUB-01-developer-handoff.md`

## Forbidden Files

Do not edit:

- auth-identity source/tests
- shared auth middleware
- subscription or notification routers
- subscription or notification services, repositories, providers, validation files, or unrelated tests
- unlisted subscription-billing source/tests outside the allowed controller and controller test
- Prisma schema or migrations
- backend or frontend route registries
- shared backend utilities or shared DTOs
- shared frontend components
- package manifests
- generated files
- frontend files
- backend/src/server.ts
- backend/.env.example
- external provider, SMTP implementation, provider startup, live provider, paid/cloud, broker, or telemetry flows

Do not install packages, run providers, start services, run SMTP/network flows, migrate Prisma, commit, or push.

## Implementation Requirements

- Protected subscription controller actions must fail closed when `req.user.id` is missing.
- Protected notification controller actions must fail closed when `req.user.id` is missing.
- Protected controllers must not call services with `default-user`.
- Authenticated controller actions must pass the actual `req.user.id`.
- Ordinary users must not self-change subscription plans.
- Ordinary users must not self-select `ADMIN`.
- Admin/manual plan update remains guarded by `ADMIN_API_KEY`.
- Preserve subscription reads, usage, feature limits, provider status, route paths, and notification provider behavior.
- Update module docs to describe fail-closed controller behavior, admin/manual subscription policy, and frontend subscription UI limitation.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- subscription-billing.controller.test.ts notifications-delivery.controller.test.ts --runInBand
npm.cmd run build
```

If the command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- new packages, hashing dependencies, SMTP implementation, network calls, or external provider work
- persisted event shape changes
- service/router/repository/provider/validation changes
- auth source or unlisted subscription source changes
- frontend/UI work
- Prisma/schema/migration, route registry, shared utility/UI, package, generated-file, server, env-example, provider/startup/live-data behavior
- paid/cloud, broker, telemetry, or credential use

## Expected Outbox

Update `17-team-outboxes/TEAM-09-outbox.md` with:

- exact branch/worktree used
- starting commit
- exact files changed and inspected
- behavior changed
- tests run and results
- tests skipped and reasons
- forbidden files confirmed untouched
- assumptions, risks, blockers
- next gate: Team 04 QA, Team 10 review, Architect Signoff, delegated PO acceptance, or Team 00 blocker routing

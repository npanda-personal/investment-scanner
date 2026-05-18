# TEAM-09 Current Assignment

Date: 2026-05-18

Team: TEAM-09 - Platform / Auth / Subscription / Notifications

Prompt file: `docs/execution/codex-parallel-execution-plan-2026-05-16/15-automation-prompts/AUTO-09-platform-auth-subscription-notifications.md`

## Assignment

Pull `CF-W1-NOTIF-02` for bounded implementation.

State: Ready for Implementation after Team 00 promotion.

You are not alone in the codebase. Other teams have active docs-only edits in the shared `dev` workspace and Team 07/Team 06 have separate implementation worktrees. Do not revert or overwrite edits made by others, and do not implement in the shared worktree.

`CF-W1-AUTH-01` and `CF-W1-SUB-01` remain out of this handoff. They should be combined or sequenced later under a single Team 09 writer because they share subscription controller/test/doc files.

## Branch / Worktree

Create and use this dedicated implementation branch/worktree:

- Branch: `codex/team09-platform/CF-W1-NOTIF-02`
- Worktree: `../investment-scanner-worktrees/team09-CF-W1-NOTIF-02`
- Base: current local `dev` after Team 00 Ready-promotion docs.

Record branch, worktree path, starting commit, and final status in `17-team-outboxes/TEAM-09-outbox.md`.

## Evidence To Use

- Requirement: `10-requirements/CF-W1-NOTIF-02-notification-log-redaction-requirement.md`
- Architecture review: `03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- Contract: `06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- Work packet: `08-work-packets/CF-W1-NOTIF-02-work-packet.md`
- QA plan: `04-qa/CF-W1-NOTIF-02-qa-plan.md`
- Team 09 readiness evidence: `17-team-outboxes/TEAM-09-outbox.md`
- Ready queue handoff: `12-ready-queue/ready-for-implementation.md`

## Allowed Files

You may edit only:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

You may also update Team 09 reporting docs in the dedicated worktree:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-NOTIF-02-developer-handoff.md`

## Forbidden Files

Do not edit:

- notification controller, service, repository, router, validation, or unrelated tests
- auth-identity source/tests
- subscription-billing source/tests
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

- Preserve `EMAIL_LOG` as the active delivery channel.
- Preserve local/free/no-network provider behavior.
- Preserve `smtpAvailable: false`.
- Preserve the existing `NotificationProviderResult` shape.
- Remove raw recipient email from `console.info`.
- Remove raw subject text from `console.info`.
- Remove raw message body and body preview from `console.info`.
- Avoid logging notification payload contents.
- Use minimized non-sensitive metadata only, such as provider/channel/message id, body length, subject length, and a redacted recipient marker.
- Preserve persisted notification event behavior.
- Update module docs to describe minimized/redacted local console logs.

## Focused Validation

Run after implementation:

```powershell
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

If the command cannot run, record the exact blocker, skipped command, risk, and next owner in the outbox.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- new packages, hashing dependencies, SMTP implementation, network calls, or external provider work
- persisted event shape changes
- controller/service/router/repository/validation changes
- auth/subscription source changes
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

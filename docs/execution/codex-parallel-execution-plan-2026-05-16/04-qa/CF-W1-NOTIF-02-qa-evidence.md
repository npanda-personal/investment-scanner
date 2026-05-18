# CF-W1-NOTIF-02 QA Evidence

Date: 2026-05-18

Owner: Team 04 QA Factory

## Work Item

`CF-W1-NOTIF-02` - notification local log redaction in `notifications-delivery`.

## Source Under Test

- Branch: `codex/team09-platform/CF-W1-NOTIF-02`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-NOTIF-02`
- Developer handoff under test: `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-NOTIF-02-developer-handoff.md`

## Files Reviewed

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-NOTIF-02-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-NOTIF-02-notification-log-redaction-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-NOTIF-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-09-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`

## Scope Confirmation

Team 04 reviewed Team 09 worktree status and diff scope.

Changed application/test files remain inside the approved reservation:

- `backend/src/modules/notifications-delivery/notifications-delivery.provider.ts`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

Observed additional Team 09 worktree reporting docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-NOTIF-02-developer-handoff.md`

Forbidden application scope remained untouched in the reviewed worktree status: notification controller/service/repository/router/validation, auth/subscription source/tests, Prisma/migrations, route registries, shared backend utilities/DTOs, shared UI, package manifests, generated files, frontend, `backend/src/server.ts`, `backend/.env.example`, SMTP/provider startup, network/provider flows, paid/cloud, broker, and telemetry paths.

## Memory Gate

Team 04 attempted to measure memory before running the focused backend command:

```powershell
$os = Get-CimInstance Win32_OperatingSystem
```

Result: blocked by local permissions (`Access denied`). No reliable memory percentage was available from this call in the sandbox.

## Commands Run

Run from `C:\work\repo\investment-scanner-worktrees\team09-CF-W1-NOTIF-02\backend`:

```powershell
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

Result:

- failed immediately because `jest` is unavailable in the Team 09 worktree backend (`'jest' is not recognized as an internal or external command`).

Read-only no-install fallback attempted:

```powershell
$env:NODE_PATH='C:\work\repo\investment-scanner\backend\node_modules'
& 'C:\work\repo\investment-scanner\backend\node_modules\.bin\jest.cmd' notifications-delivery.service.test.ts --runInBand --config 'C:\work\repo\investment-scanner-worktrees\team09-CF-W1-NOTIF-02\backend\jest.config.js'
```

Fallback result:

- failed during TypeScript/Jest resolution in the Team 09 worktree test environment;
- `@types/jest` could not be resolved for `tests/modules/notifications-delivery/notifications-delivery.service.test.ts`;
- Jest globals such as `jest`, `describe`, `it`, and `expect` were therefore unavailable to the test compiler;
- no package installation or worktree mutation was performed.

## Static Scenario Coverage

| Scenario | QA result |
| --- | --- |
| Provider status preserved | Passed by static review. [`notifications-delivery.provider.ts`] keeps `activeChannel: 'EMAIL_LOG'`, `providerName: 'log-email-provider'`, and `smtpAvailable: false` at lines 11-21. |
| Provider factory preserved | Passed by static review. `createNotificationProvider()` still returns `new LogEmailProvider()` at lines 43-44. |
| Send email result preserved | Passed by static review. `sendEmail()` still returns `channel: 'EMAIL_LOG'`, `status: 'SENT'`, `providerName: 'log-email-provider'`, and a `log-*` message id at lines 24-39. |
| Raw recipient removed from logs | Passed by static review. The `console.info` payload at lines 26-32 has no `to` field. The focused test now asserts both payload shape absence and serialized-call absence at lines 128-138 of `notifications-delivery.service.test.ts`. |
| Raw subject removed from logs | Passed by static review. Provider logging now records `subjectLength` only, not `subject`, at lines 26-32. Test assertions explicitly reject raw subject content at lines 130 and 137. |
| Raw body and body preview removed from logs | Passed by static review. Provider logging no longer emits `preview` or `body`; only `bodyLength` remains at lines 26-32. Test assertions reject `body`, `preview`, and the full body content at lines 131-138. |
| Raw payload contents not logged | Passed by static review. Provider logging does not include `payload` at lines 26-32, and the focused test explicitly rejects a `payload` property at line 133. |
| Minimized metadata only | Passed by static review. Logged fields are limited to `providerName`, `channel`, `messageId`, `recipientRedacted`, `subjectLength`, and `bodyLength` at lines 26-32. |
| Persisted event behavior preserved | Passed by static review. `NotificationsDeliveryService.deliver()` still persists the original event `title`, `message`, and payload behavior at lines 124-181 of `notifications-delivery.service.ts`; the redaction slice does not alter persistence paths. |
| Existing service scenarios retained | Passed by static review. Existing tests for test email, alert digest, daily digest, weekly digest, preference skip, missing email, and SMTP fallback remain in place at lines 144-185; Team 09 only extended the provider logging test at lines 104-142. |
| Local/free/no-network behavior preserved | Passed by static review. No SMTP transport, no external provider, and no network path were introduced. Module docs now describe redacted local metadata logging at lines 35-37 and 53 of `notifications-delivery.md`. |

## Skipped Checks

- Focused runtime backend verification did not complete because the Team 09 worktree lacks runnable local Jest resolution.
- Backend build/typecheck were not run because the assignment required the focused notification test only and no safe dependency-complete worktree runner was available.
- UI smoke tests were not run because this is a backend-only provider slice.
- SMTP/network/provider startup checks were not run because they are explicitly forbidden for this packet.

## Risks / Blockers

- Primary blocker: the Team 09 worktree backend is not dependency-complete for Jest execution, so the required focused test could not be run to completion.
- Residual risk: low functional risk from static inspection because the change is isolated to provider log metadata and matching assertions, but runtime verification remains outstanding.
- Assumption confirmed as acceptable for this QA pass: `recipientRedacted: 'configured'` is consistent with the accepted contract's redacted-marker guidance.

## QA Result

Reject on QA at this gate.

The scoped implementation appears correct by static inspection and stays inside the approved file reservation, but the required focused backend automation did not execute successfully in the Team 09 worktree. This packet should not be marked QA-passed until the focused notification test can run in a dependency-complete environment without package installation.

Team 10 review can proceed with the QA blocker noted, but release acceptance should remain blocked pending a successful focused test rerun.

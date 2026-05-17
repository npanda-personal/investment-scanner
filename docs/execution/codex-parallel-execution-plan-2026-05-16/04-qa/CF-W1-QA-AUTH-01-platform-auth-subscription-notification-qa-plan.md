# CF-W1-QA-AUTH-01 - Platform Auth / Subscription / Notification QA Plan

Date: 2026-05-17

Owner: Team 09 Platform / Auth / Subscription / Notifications with QA Factory review

Status: QA planning only; not executable until decisions and file reservations are accepted

## Scope

Validate the next Team 09 platform slices:

- `CF-W1-AUTH-01`: authenticated controller fallback policy
- `CF-W1-SUB-01`: local/manual subscription plan-change policy
- `CF-W1-NOTIF-02`: notification local log redaction

## Preconditions

- `CF-W1-AUTH-01` tests require its Product Owner/Architect/QA decision to be resolved first.
- `CF-W1-SUB-01` tests require its Product Owner/Architect/QA decision to be resolved first.
- `CF-W1-NOTIF-02` does not require the auth/subscription decisions, but does require exact notification provider/test/doc file reservations before source work.
- No Prisma, route registry, package, shared UI, or external provider work is included.

## Focused Backend Test Scenarios

### Auth Fallback

- Protected subscription controller actions use authenticated `req.user.id`.
- Protected notification controller actions use authenticated `req.user.id`.
- Missing `req.user` in a protected controller path fails closed after the accepted policy.
- Existing `requireAuth` missing-token and invalid-token tests remain valid.
- Service-level defaults, if retained, are documented as explicit internal/test compatibility only.

### Subscription Policy

Scenario set depends on the Product Owner decision:

- Admin/manual only:
  - normal `POST /subscription/change-plan` is rejected or disabled for ordinary users.
  - admin `PATCH /subscription/users/:userId/plan` remains guarded by `ADMIN_API_KEY`.
  - plan limits still read the authenticated user's current subscription.
- Self-service `FREE`/`PRO`, admin-only `ADMIN`:
  - ordinary users can select `FREE` and `PRO`.
  - ordinary users cannot select `ADMIN`.
  - admin endpoint can assign `ADMIN` with the configured key.
- Current behavior retained:
  - tests document that self-selection is local-validation-only and not production billing.

### Notification Redaction

- `LogEmailProvider.status()` still reports `EMAIL_LOG`, `smtpAvailable: false`.
- `createNotificationProvider()` still returns local log provider.
- `sendEmail()` returns `SENT` without network calls.
- `console.info` does not receive raw recipient email.
- `console.info` does not receive raw subject text.
- `console.info` does not receive raw body preview.
- `console.info` does not receive raw payload content.
- Delivery event persistence remains unchanged unless a separate contract approves changes.

### Cross-User Isolation

- User A notification preferences are not returned to User B.
- User A notification events are not returned to User B.
- User A subscription usage counters are not returned to User B.
- Alert digest generation must pass the current user id into alert event reads before it can be considered isolated.

## Suggested Focused Commands

Run only after implementation files are reserved:

```text
npm.cmd test -- auth-identity subscription-billing notifications-delivery --runInBand
```

If route-level tests are updated:

```text
npm.cmd test -- subscription-billing.routes notifications-delivery.routes --runInBand
```

## Skipped Checks

- No Playwright unless frontend subscription or notification UI is explicitly approved.
- No live SMTP, network, or provider checks.
- No Prisma migration checks unless a future approved slice changes schema.
- No full backend build until implementation scope is accepted; focused tests first.

## QA Rejection Criteria

- A protected route silently uses `default-user` after Option A auth policy approval.
- Ordinary users can self-select `ADMIN` after any policy that forbids it.
- Notification provider logs raw email address or body preview after redaction approval.
- Notification provider logs raw subject text or payload content after redaction approval.
- Tests only check that pages/routes load and do not prove user isolation or policy behavior.

## Current Blockers

- `CF-W1-AUTH-01` Product Owner/Architect decision is open.
- `CF-W1-SUB-01` Product Owner/Architect decision is open.
- `CF-W1-NOTIF-02` needs Ready promotion and exact notification provider/test/doc file reservation before source work.

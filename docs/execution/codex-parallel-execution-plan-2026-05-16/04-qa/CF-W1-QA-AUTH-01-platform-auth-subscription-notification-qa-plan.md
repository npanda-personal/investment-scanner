# CF-W1-QA-AUTH-01 - Platform Auth / Subscription / Notification QA Plan

Date: 2026-05-18

Owner: Team 09 Platform / Auth / Subscription / Notifications with QA Factory review

Status: Option A QA refresh prepared for `CF-W1-AUTH-01` and `CF-W1-SUB-01`; `CF-W1-NOTIF-02` remains covered by its focused redaction plan. Not executable until exact Team 09 backend reservations and Team 00 implementation handoffs are accepted.

## Scope

Validate the next Team 09 platform slices:

- `CF-W1-AUTH-01`: protected Team 09 controller fail-closed behavior when `req.user.id` is missing
- `CF-W1-SUB-01`: local/manual admin-only subscription plan-change policy
- `CF-W1-NOTIF-02`: notification local log redaction

Decision references:

- `07-decisions/DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`
- `07-decisions/DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`

## Preconditions

- `CF-W1-AUTH-01` policy is resolved as Option A; tests still require exact subscription/notification controller and test reservations and Team 00 implementation handoff.
- `CF-W1-SUB-01` policy is resolved as Option A; tests still require exact backend reservations, known frontend limitation notes if existing UI is mismatched, and Team 00 implementation handoff.
- `CF-W1-NOTIF-02` does not require the auth/subscription decisions, but does require exact notification provider/test/doc file reservations before source work.
- No Prisma, route registry, package, shared UI, or external provider work is included.

## Focused Backend Test Scenarios

### Auth Fallback

- Protected subscription controller actions use authenticated `req.user.id`.
- Protected notification controller actions use authenticated `req.user.id`.
- Missing `req.user` in a protected controller path fails closed after the accepted policy.
- Protected controllers do not use `default-user` fallback when `requireAuth` should have supplied user context.
- Existing `requireAuth` missing-token and invalid-token tests remain valid.
- Service-level defaults, if retained, are documented as explicit internal/test compatibility only.

### Subscription Policy

- Ordinary users cannot self-change their own subscription plan.
- Ordinary users cannot self-select `ADMIN`.
- Admin/manual plan path remains guarded by `ADMIN_API_KEY` if already present and safe.
- Plan limits still read the authenticated user's current subscription.
- If a frontend subscription action still implies user self-change, QA records it as a limitation or routes it to a separate UX work item rather than expanding this backend slice.

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

Run only after implementation files are reserved.

Auth fallback focused validation:

```text
cd backend
npm.cmd test -- subscription-billing.routes.test.ts notifications-delivery.routes.test.ts --runInBand
```

Subscription policy focused validation:

```text
cd backend
npm.cmd test -- subscription-billing.service.test.ts subscription-billing.routes.test.ts --runInBand
```

Notification redaction focused validation:

```text
cd backend
npm.cmd test -- notifications-delivery.service.test.ts --runInBand
```

## Skipped Checks

- No Playwright unless frontend subscription or notification UI is explicitly approved.
- No live SMTP, network, or provider checks.
- No Prisma migration checks unless a future approved slice changes schema.
- No full backend build until implementation scope is accepted; focused tests first and build only after Team 00 validation approval/resource gate.

## QA Rejection Criteria

- A protected route silently uses `default-user` after Option A auth policy approval.
- Ordinary users can self-select `ADMIN` after any policy that forbids it.
- Notification provider logs raw email address or body preview after redaction approval.
- Notification provider logs raw subject text or payload content after redaction approval.
- Tests only check that pages/routes load and do not prove user isolation or policy behavior.

## Current Blockers

- `CF-W1-AUTH-01` needs exact controller/test reservations and Team 00 Ready promotion.
- `CF-W1-SUB-01` needs exact backend reservations, frontend limitation handling, and Team 00 Ready promotion.
- `CF-W1-NOTIF-02` needs Ready promotion and exact notification provider/test/doc file reservation before source work.

Refresh result: Option A policy assertions are now recorded for `CF-W1-AUTH-01` and `CF-W1-SUB-01`; executable QA remains blocked until exact implementation handoffs exist.

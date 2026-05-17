# Decision Needed

Decide whether authenticated platform routes may retain controller-level `default-user` fallback behavior when `requireAuth` is already mounted.

# Context

Team 09 refreshed the platform/auth/subscription/notification audit on 2026-05-17.

`subscription-billing` and `notifications-delivery` routers both mount `requireAuth`, but their controllers still resolve the current user as:

```text
req.user?.id || 'default-user'
```

That means a future routing, middleware, or test harness error could silently route protected user-owned behavior into `default-user` instead of failing closed.

# Affected Workstream

Workstream: `CF-W1-AUTH-01`  
Module/team: Team 09 Platform / Auth / Subscription / Notifications  
Lane: Platform auth policy

# Affected Files

No source files may be modified until this decision is resolved and Team 00 promotes a bounded implementation packet.

Likely future bounded source/test files:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/**`
- `backend/tests/modules/notifications-delivery/**`
- related module docs only if behavior changes

Forbidden without separate approval:

- `backend/src/modules/auth-identity/**`
- shared auth middleware behavior
- backend route registry
- Prisma schema or migrations
- package manifests
- frontend routes or shared UI

# Evidence Inspected

- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.router.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/src/modules/auth-identity/auth-identity.service.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-platform-auth-subscription-notifications.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-09-platform-auth-subscription-notifications-2026-05-17.md`

# Options

Option A: fail closed in authenticated controllers.

Protected Team 09 controllers require `req.user.id` and return an authentication/authorization error if it is missing. Service-level defaults remain only for explicit internal/test compatibility until separate migration work removes them.

Option B: keep controller fallback and document it as legacy local compatibility.

Protected Team 09 controllers continue to fall back to `default-user` when `req.user` is missing.

Option C: remove all `default-user` defaults across controller, service, repository, and downstream consumers in one broader migration.

This would be wider than Team 09 and likely affects portfolio, watchlist, alerts, copilot, subscription gates, and tests.

# Codex Recommendation

Option A.

It is the smallest safe platform fix: authenticated route behavior fails closed without changing auth middleware, Prisma, route registries, or broad legacy nullable-owner compatibility.

# Risk If Approved

Some tests or local callers that instantiate controllers without `req.user` will need focused updates. Any discovered dependency on controller fallback should be treated as a test/setup issue, not as product behavior.

# Risk If Rejected

Authenticated platform routes can continue to mask missing auth context as `default-user`, making two-user isolation bugs harder to detect.

# Impact On Parallel Work

Only Team 09 platform auth-fallback work is blocked. Lane 3 alert ownership already uses parent rule owner in the accepted `CF-W1-L3-AUTH-02` slice and should not be reopened by this decision.

# Exact Consent Needed

Product Owner: approve Option A, B, C, or another exact policy for authenticated route fallback behavior.

Architect: confirm whether the selected policy can be implemented in module-local controller/test files without shared auth middleware, route registry, Prisma/schema, package, or frontend changes.

QA: confirm focused two-user and missing-auth-context tests are sufficient for the selected policy.

# Safe Next Step If No Decision Yet

Do not edit Team 09 controllers. Keep `CF-W1-AUTH-01` out of Ready for Implementation and continue docs-only QA planning.

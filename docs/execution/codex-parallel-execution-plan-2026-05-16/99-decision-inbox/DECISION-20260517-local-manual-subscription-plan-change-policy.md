# Decision Needed

Decide whether ordinary authenticated users may change their own local subscription plan during personal validation.

# Context

Team 09 refreshed the subscription audit on 2026-05-17.

Current behavior:

- `/api/v1/subscription/change-plan` is protected by `requireAuth`.
- Any authenticated user can post `FREE`, `PRO`, or `ADMIN`.
- The frontend subscription page shows all active plans and calls the same endpoint.
- The billing provider status says external billing is disabled and plans are changed manually through admin-ready APIs.

This is local-first and has no paid provider, but it creates policy drift: normal users can self-select `ADMIN` and bypass plan-limit validation.

# Affected Workstream

Workstream: `CF-W1-SUB-01`  
Module/team: Team 09 Platform / Auth / Subscription / Notifications  
Lane: Subscription policy

# Affected Files

No source files may be modified until this decision is resolved and Team 00 promotes a bounded implementation packet.

Likely future bounded source/test files:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/subscription-billing/subscription-billing.service.ts`
- `backend/src/modules/subscription-billing/subscription-billing.validation.ts`
- `backend/tests/modules/subscription-billing/**`
- `backend/src/modules/subscription-billing/subscription-billing.md`

Optional future UI files only after explicit UI scope approval:

- `frontend/src/features/subscription-billing/**`

Forbidden without separate approval:

- payment providers
- paid services
- Prisma schema or migrations
- route registries
- package manifests
- shared UI

# Evidence Inspected

- `backend/src/modules/subscription-billing/subscription-billing.router.ts`
- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/subscription-billing/subscription-billing.service.ts`
- `backend/src/modules/subscription-billing/subscription-billing.validation.ts`
- `backend/src/modules/subscription-billing/subscription-billing.provider.ts`
- `frontend/src/features/subscription-billing/components/SubscriptionBillingPage.tsx`
- `frontend/src/features/subscription-billing/api/subscriptionBillingService.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.service.test.ts`

# Options

Option A: admin/manual only.

Disable ordinary self-service plan changes. Only the admin plan endpoint with `ADMIN_API_KEY` may change a user plan. The normal billing page becomes read-only until a separate UX scope is approved.

Option B: self-service `FREE` and `PRO`, admin-only `ADMIN`.

Keep local validation convenience for non-admin plans, but prevent ordinary users from self-selecting `ADMIN`.

Option C: retain current behavior for local validation.

Any authenticated user may choose `FREE`, `PRO`, or `ADMIN`, with documentation making clear this is a local validation harness, not real billing.

# Codex Recommendation

Option A.

It best matches the current local/manual billing language and avoids a hidden access-control bypass. Option B is acceptable if the Product Owner values quick local plan-limit testing more than strict manual policy.

# Risk If Approved

The existing frontend plan-selection buttons will no longer match backend behavior unless a separate UI scope updates the page to read-only/manual wording. Backend-only implementation should either leave the UI as a known limitation or block UI scope until UX approval.

# Risk If Rejected

Plan-limit and access behavior can be bypassed by ordinary authenticated users, and tests may accidentally encode self-admin behavior as intended policy.

# Impact On Parallel Work

Only Team 09 subscription policy work is blocked. Existing portfolio/watchlist/alert subscription gate callers can continue using the centralized service.

# Exact Consent Needed

Product Owner: approve Option A, B, C, or another exact local/manual subscription policy.

Architect: confirm whether the selected policy can be implemented backend-only first, and whether frontend subscription UI must be blocked until a separate UX scope.

QA: confirm required tests for user self-change, admin change, and plan-limit behavior.

# Safe Next Step If No Decision Yet

Do not edit subscription source or UI. Keep `CF-W1-SUB-01` out of Ready for Implementation.

# Team 03 Post-Decision Readiness Refresh

Date: 2026-05-18

Owner: Team 03 Architecture Factory

Status: Architecture/work-packet refresh complete for newly resolved decisions. No item is Ready for Implementation.

## Evidence Sync

- Branch/worktree: `dev` / `C:\work\repo\investment-scanner`
- Latest commit observed: `a20f5e8 docs: resolve current decision inbox items`
- Ready queue: no active application-code item is Ready.
- Decision Inbox: no open decisions.
- Dirty worktree before Team 03 edits: `17-team-outboxes/TEAM-01-outbox.md` only, outside Team 03 scope.
- Current post-edit check also shows unrelated concurrent Team 04/06/07/09/10 docs changes. Team 03 did not stage, revert, or overwrite those files.

## Resolved Decision Inputs

- `DECISION-20260517-platform-auth-default-user-fallback-policy-resolution.md`
- `DECISION-20260517-local-manual-subscription-plan-change-policy-resolution.md`
- `DECISION-20260517-copilot-trust-ux-policy-resolution.md`
- `DECISION-20260517-ux-product-language-status-policy-resolution.md`
- `DECISION-20260517-market-data-validation-hardening-policy-resolution.md`

## Readiness Matrix

| Candidate | Team 03 architecture result | Exact allowed files after Team 00 promotion | Shared/high-risk request | Current blocker | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `CF-W1-AUTH-01` | Backend-only Team 09 controller fail-closed slice is contract-ready for Ready review. The focused controller test files are exact new-file additions because this repo does not currently have Team 09 controller tests. | `backend/src/modules/subscription-billing/subscription-billing.controller.ts`; `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`; `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new); `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts` (new); `backend/src/modules/subscription-billing/subscription-billing.md`; `backend/src/modules/notifications-delivery/notifications-delivery.md` | None if implementation stays in controllers/tests/docs and does not touch auth middleware, routers, route registry, Prisma, shared utilities, packages, generated files, or frontend. | Team 00 Ready promotion and Team 09 implementation handoff. | Can promote as a backend-only controller policy slice, but the shared-file overlap with `CF-W1-SUB-01` makes a combined handoff cleaner. |
| `CF-W1-SUB-01` | Backend-only ordinary-user plan-change blocking is contract-ready for Ready review. The focused subscription controller test file is an exact new-file addition because this repo currently has only route/service/validation tests for this module. | `backend/src/modules/subscription-billing/subscription-billing.controller.ts`; `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new); `backend/src/modules/subscription-billing/subscription-billing.md` | None if public self-change is blocked at controller boundary and admin/manual path remains local. | Team 00 Ready promotion and Team 09 implementation handoff. | Prefer combining with `CF-W1-AUTH-01` in one Team 09 controller-policy slice or sequence immediately after it; both need `subscription-billing.controller.ts`. |
| `CF-W1-UX-02` | Option B removes Product Owner blocker; Copilot-only contract/work packet is refreshed. | Existing Copilot-only backend/frontend/test reservations in `CF-W1-UX-02-work-packet.md`. | No shared UI, route/navigation, package, Prisma, provider, generated, external AI, telemetry, or Stock Research scope. | Team 08 source-supported trust-field mapping, Team 04 QA acceptance, Team 00 Ready promotion. | Promote only as Copilot-only. If `CF-W1-UX-05A` is included, record the combined write scope once. |
| `CF-W1-UX-05` | Option A removes Product Owner blocker; first child is Copilot-only copy cleanup. | Existing Copilot-only subset in `CF-W1-UX-05-work-packet.md`. | Shared `StatusBadge`, Research Hub, Market Data UI, navigation, route, package, provider, Prisma, and generated files remain forbidden. | Must sequence after or with `CF-W1-UX-02`. | Do not promote as a separate parallel slice while `CF-W1-UX-02` owns the same Copilot files. |
| `CF-W1-MD-01` | Market Data validation-only contract/work packet prepared under Option A. | `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`; `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`; `backend/src/modules/market-data-foundation/market-data-foundation.md` | None if durable storage, Prisma, repository, provider, startup/backfill, route registry, package, generated, shared utility, frontend, and live data remain excluded. | Team 05 validation-only readiness acceptance, Team 04 QA execution readiness, and Team 00 Ready promotion. The old Team 05 outbox decision blocker is stale after the 2026-05-18 policy resolution. | Promote only as validation source/test/doc slice; keep `CF-W1-MD-02` durable evidence separate. |

## Cross-Slice File Conflicts

- `CF-W1-AUTH-01` and `CF-W1-SUB-01` both need `backend/src/modules/subscription-billing/subscription-billing.controller.ts`, its focused controller test, and module doc. They should not be assigned to separate writers in parallel.
- `CF-W1-AUTH-01` and `CF-W1-SUB-01` also both assume the new file `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`. Team 00 should reserve that new test file to the same single writer.
- `CF-W1-UX-02` and `CF-W1-UX-05A` both need Copilot source/frontend/test files. They should be combined into one Copilot-only handoff or strictly sequenced.
- `CF-W1-MD-01` does not conflict with `CF-W1-MD-02` if it stays validation-only. Any durable evidence, repository, Prisma, or schema work re-enters the `CF-W1-MD-02` ADR path.

## Team 09 Combined Handoff Shape

If Team 00 wants to reduce controller-file churn, combine `CF-W1-AUTH-01` and `CF-W1-SUB-01` into one Team 09 backend controller-policy handoff with this exact write scope:

- `backend/src/modules/subscription-billing/subscription-billing.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts` (new)
- `backend/tests/modules/notifications-delivery/notifications-delivery.controller.test.ts` (new)
- `backend/src/modules/subscription-billing/subscription-billing.md`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`

That combined handoff remains backend-only. Routers, auth middleware, services, repositories, Prisma, frontend, shared utilities, and package/generated files stay forbidden.

## Decision Packets

No new Decision Packet is needed. The remaining blockers are readiness sequencing, exact handoff promotion, and file-conflict coordination.

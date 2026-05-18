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
| `CF-W1-UX-02` | Option B removes Product Owner blocker; Team 08 source mapping now narrows the first implementation shape to one combined Copilot-only `CF-W1-UX-02 + CF-W1-UX-05A` packet. | `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`; `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`; `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`; optional only if scope/query parsing is added: `backend/src/modules/ai-investment-copilot/ai-investment-copilot.validation.ts`; `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`; `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`; `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`; optional only if validation logic changes: `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts`; `frontend/src/features/ai-investment-copilot/types.ts`; `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`; `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`; `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`; `frontend/tests/ui/ai-investment-copilot.spec.ts` | No shared UI, route/navigation, package, Prisma, provider, generated/common fixtures, external AI, telemetry, or Research Hub / Stock Research / Market Data frontend scope. | Team 04 QA alignment for the combined packet and Team 00 Ready promotion. | Promote only as the combined Copilot-only packet. Do not split `CF-W1-UX-05A` into a separate copy-only slice. |
| `CF-W1-UX-05` | Option A removes Product Owner blocker, but Team 08 mapping shows the first child is viable only when folded into `CF-W1-UX-02`. | Same combined Copilot-only file set as `CF-W1-UX-02`. | Shared `StatusBadge`, Research Hub, Market Data UI, navigation, route, package, provider, Prisma, and generated files remain forbidden. | Combined packet sequencing with `CF-W1-UX-02`; not independently promotable. | Do not promote as a separate parallel slice. Treat `CF-W1-UX-05A` as part of the combined Copilot-only handoff. |
| `CF-W1-MD-01` | Market Data validation-only contract/work packet is now narrowed to a reject-only child under Option A and Team 05 readiness inspection. | `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`; `backend/tests/modules/market-data-foundation/market-data.validation.test.ts`; `backend/src/modules/market-data-foundation/market-data-foundation.md` | None if repository/provider/service/router/controller/types/readiness-storage tests, Prisma, generated, route registry, shared utility, package, frontend, and live data remain excluded. | Team 04 QA-plan narrowing and Team 00 Ready promotion. Missing-`adjustedClose` fallback evidence and zero/suspicious-volume warning evidence stay deferred. | Promote only as reject-only validation source/test/doc slice; keep `CF-W1-MD-02` durable evidence and any warning/evidence channel separate. |

## Cross-Slice File Conflicts

- `CF-W1-AUTH-01` and `CF-W1-SUB-01` both need `backend/src/modules/subscription-billing/subscription-billing.controller.ts`, its focused controller test, and module doc. They should not be assigned to separate writers in parallel.
- `CF-W1-AUTH-01` and `CF-W1-SUB-01` also both assume the new file `backend/tests/modules/subscription-billing/subscription-billing.controller.test.ts`. Team 00 should reserve that new test file to the same single writer.
- `CF-W1-UX-02` and `CF-W1-UX-05A` need the same Copilot source/frontend/test files. Team 08 now recommends one combined handoff rather than strict separate sequencing.
- `CF-W1-MD-01` does not conflict with `CF-W1-MD-02` if it stays a reject-only validation child. Any durable evidence, repository, Prisma, schema, or warning/evidence-channel work re-enters the `CF-W1-MD-02` ADR path or a later dedicated validation child.

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

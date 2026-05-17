# CF-W1-UX-05 - Product Language And Status Work Packet

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Blocked proposal. Not Ready for Implementation.

## Work Item

Prepare a staged product-language and status-color cleanup that keeps the product research-support oriented.

## Proposed First Slice

`CF-W1-UX-05A`: Copilot module-local copy cleanup after `CF-W1-UX-02` policy resolves.

Allowed files after Ready promotion:

- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

## Deferred Slices

- `CF-W1-UX-05B`: Research Hub copy and UI smoke assertions.
- `CF-W1-UX-05C`: Market Data unsupported asset visibility.
- `CF-W1-UX-05D`: shared `StatusBadge` semantics.

## Forbidden Without Separate Approval

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated/common fixtures
- provider/startup/backfill files

## Stop Conditions

- Product/UX priority decision is unresolved.
- Selected slice needs shared UI reservation.
- Copy changes would alter business semantics.
- UI tests would prove only page load.
- Dirty worktree cannot be staged safely.

## Next Gate

Resolve `DECISION-20260517-ux-product-language-status-policy`, then promote one child slice with exact file reservations.

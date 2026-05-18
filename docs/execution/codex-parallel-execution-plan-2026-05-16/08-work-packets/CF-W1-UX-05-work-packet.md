# CF-W1-UX-05 - Product Language And Status Work Packet

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Post-decision proposal refreshed for combined Copilot-only sequencing. Not Ready for Implementation.

## Work Item

Prepare product-language cleanup only as part of the combined Copilot-only `CF-W1-UX-02 + CF-W1-UX-05A` slice so copy and trust-state semantics land together.

## Proposed First Slice

`CF-W1-UX-05A`: Copilot module-local copy cleanup folded into the same implementation pass as `CF-W1-UX-02`.

Allowed files after Ready promotion:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.validation.ts` only if scope/query parsing is added
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts` only if validation logic changes
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

## Deferred Slices

- `CF-W1-UX-05B`: Research Hub copy and UI smoke assertions.
- `CF-W1-UX-05C`: Market Data unsupported asset visibility.
- `CF-W1-UX-05D`: shared `StatusBadge` semantics.

## Forbidden Without Separate Approval

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/market-data-foundation/**`
- `frontend/src/features/stock-research-workbench/**`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated/common fixtures
- provider/startup/backfill files
- external AI / telemetry / paid service

## Stop Conditions

- Selected slice needs shared UI reservation.
- Copy changes would alter business semantics.
- UI tests would prove only page load.
- Dirty worktree cannot be staged safely.

## Next Gate

Fold `CF-W1-UX-05A` into the same implementation pass as `CF-W1-UX-02`, then promote one combined Copilot-only child slice with exact file reservations.

## Post-Decision Refresh - 2026-05-18

Option A is resolved. This packet remains Copilot-only, and shared `StatusBadge`, Research Hub, and Market Data UI work remain future. Team 08 source mapping now makes `CF-W1-UX-05A` Ready-recommendable only when folded into the same implementation pass as `CF-W1-UX-02`.

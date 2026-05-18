# CF-W1-UX-05 - Product Language And Status Contract

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Post-decision contract refreshed for combined Copilot-only sequencing. Not Ready for Implementation.

## Contract Goal

Define how user-facing labels and status colors should distinguish evidence, readiness, and risk without creating direct advice or implied trade instructions.

## Policy Candidates

Preferred language:

- `supportive evidence`
- `risk or limitation evidence`
- `review candidate`
- `trigger evidence`
- `data readiness`
- `not enough trusted evidence`
- `research-only`

Restricted language unless explicitly justified by a rule contract:

- `Generate Report`
- `Bullish Factors`
- `appears strong`
- `high-scoring names`
- `profit target`
- `price target`
- `must buy`
- `must sell`
- `guaranteed`

## Status Color Rules

Future implementation should avoid global color semantics where:

- `BULLISH` means success,
- `BEARISH` means error,
- `HIGH` means success,
- `LOW` means error,
- `ACCUMULATION` means success,
- `DISTRIBUTION` means error.

Safer options:

- Use neutral/default color for directional market states.
- Use success/error only for readiness, validation, or system execution outcomes.
- Pair every color-coded status with text explaining what the state means.
- Keep lifecycle states and data quality states separate from directional evidence.

## Scope Options

Option A: Copilot-only copy changes after `CF-W1-UX-02`.

Option B: Research Hub copy pass with UI smoke assertions.

Option C: Market Data unsupported asset visibility copy/policy.

Option D: Shared `StatusBadge` mapping change.

## Recommended First Slice

Start with Option A only as part of the same combined Copilot-only implementation pass as `CF-W1-UX-02`.

Defer Option D until Product/UX/Architect approve shared UI reservation.

## File Reservation Candidates

Copilot-only when folded into `CF-W1-UX-02 + CF-W1-UX-05A`:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.validation.ts` only if scope/query parsing is added
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts` only if validation logic changes
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

Shared UI, approval required:

- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/shared/components/index.ts`

Market Data, separate approval:

- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/AddInstrumentPage.tsx`

Research Hub, separate approval:

- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Post-Decision Scope

Product Owner approved Option A in `07-decisions/DECISION-20260517-ux-product-language-status-policy-resolution.md`.

The first child is Copilot-only copy cleanup only when folded into the same implementation pass as `CF-W1-UX-02`. Shared `StatusBadge`, Research Hub, Market Data UI, route/navigation, package, provider, Prisma, and generated-file changes are not approved.

Team 08 source mapping narrows this further: `CF-W1-UX-05A` should not be promoted separately. It is Ready-recommendable only when folded into the same Copilot-only implementation pass as `CF-W1-UX-02`.

## Blockers

- `CF-W1-UX-05A` must be folded into the same implementation pass as `CF-W1-UX-02` because both need the same Copilot files.
- Shared UI reservation is required for any future `StatusBadge` work.
- Team 00 must promote an exact Copilot-only handoff before implementation.

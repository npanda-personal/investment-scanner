# CF-W1-UX-05 - Product Language And Status Contract

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Draft contract. Not Ready for Implementation.

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

Start with Option A because it is module-local and already linked to an open Copilot trust policy decision.

Defer Option D until Product/UX/Architect approve shared UI reservation.

## File Reservation Candidates

Copilot-only:

- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
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

## Blockers

- Product/UX priority decision is required.
- Shared UI reservation is required for `StatusBadge`.
- Route/navigation changes are excluded unless separately approved.

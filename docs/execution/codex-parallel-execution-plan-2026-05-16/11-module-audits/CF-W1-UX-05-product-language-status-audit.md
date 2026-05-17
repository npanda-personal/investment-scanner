# CF-W1-UX-05 - Product Language And Status Color Audit

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Audit complete. Not Ready for Implementation.

## Scope

Read-only audit of advisory-feeling labels, trust-state wording, status color mapping, and unsupported scope visibility across:

- `frontend/src/features/ai-investment-copilot/**`
- `backend/src/modules/ai-investment-copilot/**`
- `frontend/src/features/research-hub/**`
- `frontend/src/features/stock-research-workbench/**`
- `frontend/src/features/market-data-foundation/**`
- `frontend/src/shared/components/StatusBadge.tsx`

No application code, tests, routes, shared UI, packages, providers, Prisma, servers, or data workflows were changed.

## Findings

1. `StatusBadge` maps investment-domain words to recommendation-like colors.

   Evidence: `frontend/src/shared/components/StatusBadge.tsx` maps `BULLISH`, `HIGH`, and `ACCUMULATION` to success; `BEARISH`, `LOW`, and `DISTRIBUTION` to error.

   Risk: shared status colors can imply good/bad recommendations instead of evidence categories.

2. Copilot copy still has advisory-feeling labels.

   Evidence:

   - `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx` uses `AI Investment Copilot`, `Generate Report`, `Bullish Factors`, and `Bearish / Risk Factors`.
   - `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts` emits `appears strong`, `appears weak`, and `high-scoring names`.

   Risk: summaries can look like black-box advice unless trust-state evidence and safer copy are implemented.

3. Research Hub is mostly research-support oriented, but still mixes market/action labels with strong visual cues.

   Evidence:

   - `ResearchOverviewPage.tsx` shows `Market is OPEN`, `Reviewable setups confirmed`, `Review Candidates`, `Exit / Reduce Risk`, `Signal Pulse`, `Bullish`, `Bearish`, `Proven`, and `Unproven`.
   - Existing UI test asserts high-conviction setup text is hidden when actionability is not confirmed.

   Risk: the current guard is useful, but shared copy policy is needed so future labels do not drift toward direct trade instructions.

4. Market Data UI exposes future/unapproved asset classes.

   Evidence:

   - `MarketDataFoundationPage.tsx` and `AddInstrumentPage.tsx` expose `FUTURE`, `FOREX`, `COMMODITY`, `FUND`, `OTHER`, and `UNKNOWN` alongside currently targeted asset classes.

   Risk: users may infer unsupported asset-class readiness.

5. Stock Research Workbench uses local status chips but does not explain readiness blockers.

   Evidence:

   - `StockResearchWorkbenchPage.tsx` maps `COMPLETE` to success, `ERROR` to error, and all other states to warning.
   - The page shows source/timestamp/status, but not DQ readiness blockers, stale reasons, or downstream eligibility.

   Risk: a green section chip can overstate trust if downstream readiness is unknown.

## Safe Copy Direction

Prefer:

- `supportive evidence`
- `risk or limitation evidence`
- `research summary`
- `review candidate`
- `entry trigger`
- `exit trigger`
- `data readiness`
- `not enough trusted evidence`
- `local deterministic summary`

Avoid:

- `Generate Report`
- `Bullish Factors`
- `appears strong`
- `high-scoring names`
- status colors that treat `BULLISH`, `HIGH`, or `ACCUMULATION` as success without context
- exposing unsupported asset types as selectable without limitation text

## Required Decision

`CF-W1-UX-05` needs Product Owner / UX / Architect policy for the first copy/status target:

- Copilot-only labels,
- Research Hub labels,
- shared `StatusBadge` mapping,
- Market Data unsupported asset visibility,
- or Stock Research trust status wording.

Shared UI changes require explicit reservation.

## Recommendation

Approve a staged approach:

1. First, complete `CF-W1-UX-02` Copilot trust UX with module-local copy changes.
2. Next, run a `CF-W1-UX-05A` copy-only audit/test slice that avoids shared UI.
3. Later, reserve `frontend/src/shared/components/StatusBadge.tsx` for a shared status-semantics slice after Product/UX policy is accepted.

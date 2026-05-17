# TEAM-08 UX / Research / Copilot Outbox - 2026-05-17

Mode: read-only audit/refinement.

Files changed: none by Team 08.

Tests, services, providers, staging, and commits: none.

## Current Readiness

No Team 08 application-code item is ready. `CF-W1-UX-02` remains Product/UX/Architect refinement work.

## Key Gaps

- Copilot summary contracts expose `COMPLETE | PARTIAL | MISSING | ERROR`, source modules, and data gaps, but not DQ readiness, use-case tier, stale blockers, latest trusted data date, or deterministic/no-external proof.
- Copilot is currently local/deterministic in code, but the proof is not visible in UX.
- Product-language risk remains around `AI Investment Copilot`, `AI Copilot`, `Generate Report`, `Bullish Factors`, `appears strong`, and `high-scoring names`.
- Copilot frontend passes `region` for market brief, but backend ignores query scope. Stock Research API sends only `range`, not `region` or `assetType`.
- Stock Research Workbench shows source/timestamp/status chips, but not readiness blockers or downstream eligibility.
- Shared status coloring may imply recommendations because labels such as `BULLISH`, `HIGH`, and `ACCUMULATION` map to success colors.
- Market Data UX exposes future/unapproved asset classes such as `FUTURE`, `FOREX`, and `COMMODITY`.
- UI tests are missing for copilot and stock-research trust states.

## Candidate Requirements

- `CF-W1-UX-02`: Copilot trust UX contract.
- `CF-W1-UX-01`: Stock Research Workbench trust surfaces and downstream eligibility controls.
- `CF-W1-UX-03`: market-scope refresh/clear behavior for research and copilot.
- `CF-W1-UX-05`: product-language copy pass across copilot, research, and shared status labels.
- `CF-W1-QA-UI-01`: Playwright trust-state tests for copilot and stock research after UI scope approval.

## Future Reservations

Docs first:

- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md`
- `04-qa/CF-W1-QA-UI-01-copilot-research-trust-states-qa-plan.md`
- `08-work-packets/CF-W1-UX-02-work-packet.md`

Implementation later, only after approval:

- `backend/src/modules/ai-investment-copilot/**`
- `backend/tests/modules/ai-investment-copilot/**`
- `frontend/src/features/ai-investment-copilot/**`
- `frontend/src/features/stock-research-workbench/**`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`
- `frontend/tests/ui/stock-research-workbench.spec.ts`

Shared/high-risk reservations if needed:

- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/shared/components/StatePanels.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`

## Recommendation

Prepare `CF-W1-UX-02` as documentation-only requirement, UX contract, and QA plan. Route naming/trust-surface decisions through the active decision flow before any UI or backend changes.

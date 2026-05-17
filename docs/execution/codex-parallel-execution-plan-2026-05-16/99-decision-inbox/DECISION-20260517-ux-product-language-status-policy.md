# Decision Needed

Decide the first target and policy for product-language and status-color cleanup across research/copilot surfaces.

# Context

Team 08 audited user-facing research/copilot language and shared status-color mapping. Several labels and color mappings can make evidence look like direct recommendation quality, especially when DQ readiness is missing or unknown.

# Affected Workstream

`CF-W1-UX-05` - Product language and trust copy cleanup.

# Affected Files

Potential future files, depending on selected scope:

- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/AddInstrumentPage.tsx`
- `frontend/src/shared/components/StatusBadge.tsx`
- related focused backend/UI tests

# Evidence Inspected

- `frontend/src/shared/components/StatusBadge.tsx`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/AddInstrumentPage.tsx`
- `11-module-audits/CF-W1-UX-05-product-language-status-audit.md`

# Options

Option A: Start with Copilot-only copy cleanup after `CF-W1-UX-02` resolves. Avoid shared UI.

Option B: Start with Research Hub copy/status labels and UI smoke assertions.

Option C: Start with Market Data unsupported asset visibility.

Option D: Start with shared `StatusBadge` color mapping for directional investment terms.

# Codex Recommendation

Option A first, then defer Option D until shared UI reservation is explicit.

# Risk If Approved

Copilot copy improves first, but shared status colors and Market Data unsupported asset visibility remain unresolved until later slices.

# Risk If Rejected

Advisory-feeling labels and status colors may continue to overstate trust or imply recommendation quality.

# Impact On Parallel Work

Other teams can continue unrelated implementation. Team 08 can continue docs-only audit/refinement, but no `CF-W1-UX-05` implementation should start until the first target surface is selected.

# Exact Consent Needed

Product Owner / UX / Architect decision:

Choose the first target surface and confirm whether shared UI files may be reserved.

# Safe Next Step If No Decision Yet

Keep `CF-W1-UX-05` in refinement. Do not edit UI/source files.

# Decision Needed

Decide the Copilot trust UX policy for naming, blocked-summary visibility, trust-field requirements, and Stock Research inclusion.

# Context

Team 08 prepared `CF-W1-UX-02` for future implementation. Current Copilot summaries are local and deterministic, but the UI and DTOs do not visibly prove DQ readiness, stale blockers, latest trusted data date, use-case tier, or no-external-LLM status. Current copy also contains advisory-feeling labels.

# Affected Workstream

`CF-W1-UX-02` - Copilot Trust UX, Team 08 UX / Research / Copilot.

# Affected Files

Future implementation may affect:

- `backend/src/modules/ai-investment-copilot/**`
- `backend/tests/modules/ai-investment-copilot/**`
- `frontend/src/features/ai-investment-copilot/**`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

Potentially excluded or separately approved:

- `frontend/src/features/stock-research-workbench/**`
- `frontend/src/shared/**`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/app/routes.tsx`

# Evidence Inspected

- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`
- `04-qa/CF-W1-UX-02-qa-plan.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `17-team-outboxes/TEAM-08-ux-research-copilot-2026-05-17.md`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/stock-research-workbench/api/stockResearchWorkbenchService.ts`

# Options

Option A: Keep `AI Investment Copilot`, allow blocked summaries to show generated text as diagnostic context, include Stock Research Workbench trust surfaces, and allow shared UI/navigation reservation.

Option B: Rename visible Copilot copy to `Local Research Copilot` or `Research Copilot`, hide generated narrative for blocked states, keep first slice Copilot-only, avoid shared UI/navigation changes, and split Stock Research Workbench to `CF-W1-UX-01`.

Option C: Defer all Copilot UI/backend changes and perform only a documentation/copy audit until upstream DQ trust evidence is more mature.

# Codex Recommendation

Option B.

# Risk If Approved

The first slice will improve Copilot trust clarity without solving Stock Research Workbench trust gaps or shared status-color language. Those remain separate backlog items.

# Risk If Rejected

Copilot may continue to look more trustworthy than the evidence supports, and Team 08 cannot safely implement trust states without risking advisory language or unsupported readiness claims.

# Impact On Parallel Work

Other teams can continue unrelated implementation and docs work. Team 08 can continue audits and requirements, but `CF-W1-UX-02` implementation and `CF-W1-QA-UI-01` Playwright work remain blocked.

# Exact Consent Needed

Product Owner / UX / Architect decision:

Approve one option for:

- user-facing Copilot label,
- whether blocked summaries hide or show generated text,
- mandatory trust fields,
- whether Stock Research Workbench is included in `CF-W1-UX-02` or split,
- whether shared UI/navigation files are in scope.

# Safe Next Step If No Decision Yet

Keep `CF-W1-UX-02` out of Ready for Implementation. Continue Team 08 docs-only audit/refinement and do not change application source or UI tests.

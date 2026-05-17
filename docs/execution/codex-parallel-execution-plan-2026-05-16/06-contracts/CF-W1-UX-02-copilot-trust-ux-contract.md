# CF-W1-UX-02 - Copilot Trust UX Contract

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Draft contract. Not Ready for Implementation.

This contract prepares the future Copilot trust UX slice. It does not authorize application source, test, shared UI, route, package, provider, Prisma, startup, or Playwright changes.

## Requirement Source

- `10-requirements/CF-W1-UX-02-copilot-trust-ux-requirement.md`
- `04-qa/CF-W1-UX-02-qa-plan.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `17-team-outboxes/TEAM-08-ux-research-copilot-2026-05-17.md`

## Current Evidence

Current Copilot response types expose:

- `title`
- `summary`
- `keyTakeaways`
- `bullishFactors`
- `bearishFactors`
- `riskFactors`
- `dataGaps`
- `suggestedNextReviews`
- `sourceModules`
- `generatedAt`
- `dataStatus`

Current gaps:

- No explicit DQ readiness evidence.
- No use-case tier or readiness consumer policy.
- No blocker list, stale-data reason, or latest trusted data date.
- No visible local deterministic / no-external-LLM proof beyond copy.
- Market brief frontend passes `region`, but the backend controller currently ignores query scope.
- Stock Research Workbench requests only `range`, not `region` or `assetType`.
- Current product copy includes advisory-feeling labels such as `AI Investment Copilot`, `Generate Report`, `Bullish Factors`, `appears strong`, and `high-scoring names`.

## Proposed Scope Boundary

First implementation slice should be Copilot-only unless Product Owner explicitly includes Stock Research Workbench.

Included if approved:

- Backend `ai-investment-copilot` DTO trust fields.
- Backend deterministic trust-state assembly from already available module evidence.
- Frontend `ai-investment-copilot` trust panel, blocked/limited state, and safer copy.
- Backend focused tests for trusted, limited, blocked, stale, scoped, source-gap, and safe-language behavior.
- One focused Playwright spec for Copilot trusted and blocked states after UI scope approval.

Excluded from first slice unless separately approved:

- `stock-research-workbench` UI changes.
- Shared UI status badge/color changes.
- Navigation or route label changes.
- Prisma/schema/migration changes.
- Provider, startup, sync, import, backfill, Angel One, paid AI, broker, cloud, telemetry, or external LLM behavior.

## Trust Presentation Contract

Future Copilot summaries should expose an additive trust object. Existing fields should remain backward-compatible until callers migrate.

Proposed additive shape:

```ts
type CopilotTrustState = 'TRUSTED_RESEARCH' | 'LIMITED_RESEARCH' | 'BLOCKED_RESEARCH' | 'ERROR';

interface CopilotTrustEvidence {
  trustState: CopilotTrustState;
  researchSupportOnly: true;
  localOnly: true;
  deterministic: true;
  externalLlmUsed: false;
  paidProviderUsed: false;
  dataQualityStatus: 'READY' | 'LIMITED' | 'NOT_READY' | 'BLOCKED' | 'UNKNOWN';
  useCaseTier: 'COPILOT_RESEARCH_SUMMARY';
  summaryVisibility: 'VISIBLE' | 'LIMITED' | 'HIDDEN';
  latestTrustedDataDate: string | null;
  scope: {
    region: string;
    assetType: string;
  };
  blockerReasons: string[];
  warningReasons: string[];
  sourceModules: string[];
  dataGaps: string[];
}
```

Rules:

- `TRUSTED_RESEARCH` may show normal summary content only when required evidence is ready enough under the accepted policy.
- `LIMITED_RESEARCH` may show summary content with visible limitations, no action-like wording, and no reliability overclaim.
- `BLOCKED_RESEARCH` must show blockers before any summary text. Generated narrative should be hidden unless Product Owner chooses diagnostic display in the decision packet.
- `ERROR` must show local error state and no reliability claim.
- The frontend must not rely on color alone; state label and reasons are mandatory.
- The backend must not invent DQ readiness if source modules do not provide it. Unknown readiness must be represented as `UNKNOWN`, `LIMITED`, or `BLOCKED` according to the approved policy.

## Product Language Contract

Preferred labels for future implementation:

- Page title: `Local Research Copilot` or `Research Copilot`.
- Primary action: `Prepare Research Summary`.
- Positive evidence section: `Supportive Evidence`.
- Negative/risk evidence section: `Risk And Limitation Evidence`.
- Empty positive evidence: `No supportive evidence passed the current local checks.`

Avoid:

- `AI Investment Copilot`
- `Generate Report`
- `Bullish Factors`
- `appears strong`
- `high-scoring names`
- `buy`, `sell`, `must`, `guaranteed`, `profit target`, `price target`

Final labels are blocked on `DECISION-20260517-copilot-trust-ux-policy`.

## Scope Contract

- Frontend Copilot must preserve current market scope from `useMarketScope()`.
- Backend market brief must either consume `region` and `assetType`, or clearly return `UNKNOWN` scope evidence until scoped backend support is added.
- Stock, portfolio, watchlist, and alert summaries must not pretend to be globally scoped if their upstream services are not scoped.
- Unsupported asset classes must produce a clear limited or blocked state, not a trusted summary.

## File Reservations Proposed After Approval

Allowed files for first Copilot-only implementation:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.types.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.validation.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.routes.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.validation.test.ts`
- `frontend/src/features/ai-investment-copilot/types.ts`
- `frontend/src/features/ai-investment-copilot/api/aiInvestmentCopilotService.ts`
- `frontend/src/features/ai-investment-copilot/hooks/useAiInvestmentCopilot.ts`
- `frontend/src/features/ai-investment-copilot/components/AiInvestmentCopilotPage.tsx`
- `frontend/tests/ui/ai-investment-copilot.spec.ts`

Forbidden without separate reservation:

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/stock-research-workbench/**`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated/common fixtures
- provider/startup/backfill files

## Architecture Gate

Implementation is blocked until Product Owner / UX / Architect resolve:

- Copilot naming.
- Blocked-summary visibility.
- Required trust fields and fallback behavior for unknown DQ evidence.
- Whether Stock Research Workbench is included or split.
- Whether shared UI/navigation changes are in scope.

## Recommendation

Approve a narrow Copilot-only first slice:

- Rename visible page-level copy to research-support language without changing route paths.
- Add additive trust evidence to Copilot DTOs.
- Hide generated narrative for blocked summaries.
- Split Stock Research Workbench trust surfaces to `CF-W1-UX-01`.
- Avoid shared UI/navigation changes in this slice.

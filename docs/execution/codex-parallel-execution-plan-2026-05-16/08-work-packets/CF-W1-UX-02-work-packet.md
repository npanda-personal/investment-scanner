# CF-W1-UX-02 - Copilot Trust UX Work Packet

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Post-decision work-packet proposal refreshed. Not Ready for Implementation.

## Work Item

Prepare a narrow Copilot-only implementation slice that makes deterministic local summaries visibly trust-gated and research-support oriented.

## Current State

No Team 08 application-code item is Ready.

Current blockers:

- Team 08 must confirm source-supported trust-field mapping and fallback behavior.
- Team 04 must accept focused Copilot-only QA handoff.
- Team 00 must promote exact backend/frontend/test reservations.
- Shared UI/navigation changes are not reserved.
- Stock Research Workbench is excluded from the first slice.
- Worktree contains unrelated dirty docs from other teams.

## Proposed Implementation After Approval

Backend:

- Add additive Copilot trust evidence DTO fields.
- Map missing or unknown readiness to limited/blocked states without inventing DQ evidence.
- Preserve deterministic local behavior.
- Preserve backward-compatible existing summary fields.
- Tighten safe-language handling around direct-advice and certainty terms.

Frontend:

- Show trust state, blocker/warning reasons, latest trusted data date, current scope, source modules, data gaps, and local deterministic/no-external proof.
- Rename action and section copy to research-support language if approved.
- Hide generated narrative for blocked summaries unless Product Owner approves diagnostic display.
- Avoid route, navigation, and shared UI edits in first slice.

Tests:

- Add focused backend scenarios for trusted, limited, blocked, stale, scope, source-gap, no-external, and safe-language behavior.
- Add one Copilot Playwright smoke test after UI scope approval.

## Allowed Files After Ready Promotion

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

## Forbidden Files Without Separate Reservation

- `frontend/src/shared/**`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/stock-research-workbench/**`
- `backend/src/api/routes.ts`
- `backend/prisma/**`
- package manifests
- generated/common fixtures
- provider, startup, scheduler, sync, import, repair, or backfill files

## QA Plan

Use:

- `04-qa/CF-W1-UX-02-qa-plan.md`
- `04-qa/CF-W1-QA-UI-01-copilot-research-trust-states-qa-plan.md`

Minimum later validation:

- Focused backend Copilot tests.
- Focused Copilot UI smoke after dev-server and memory gate approval.
- Backend and frontend builds after implementation if resource gates pass.

## Stop Conditions

- Required trust fields cannot be derived without shared DQ/storage changes.
- Implementation requires shared UI, route, navigation, Prisma, package, provider, startup, or generated-file changes.
- UI smoke would only prove a page heading rather than trust/blocked states.
- Dirty worktree cannot be staged safely.

## Next Gate

Team 08/03/04 refresh the Copilot-only handoff after Option B, then Team 00 evaluates Ready promotion.

## Post-Decision Refresh - 2026-05-18

Option B is resolved: use `Local Research Copilot` or `Research Copilot`, hide generated narrative in blocked states, keep Stock Research Workbench out of scope, and avoid shared UI/navigation edits. `CF-W1-UX-05A` can be included in this same Copilot-only handoff if Team 00 records one writer and one file reservation set.

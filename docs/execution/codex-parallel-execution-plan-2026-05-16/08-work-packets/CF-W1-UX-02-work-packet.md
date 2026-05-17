# CF-W1-UX-02 - Copilot Trust UX Work Packet

Date: 2026-05-17

Owner: Team 08 UX / Research / Copilot

Status: Blocked work-packet proposal. Not Ready for Implementation.

## Work Item

Prepare a narrow Copilot-only implementation slice that makes deterministic local summaries visibly trust-gated and research-support oriented.

## Current State

No Team 08 application-code item is Ready.

Current blockers:

- Product/UX policy decision is open for Copilot naming and blocked-summary behavior.
- Architecture contract is draft-only.
- UI scope is not approved.
- Shared UI/navigation changes are not reserved.
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

- Copilot naming remains unresolved.
- Blocked-summary visibility remains unresolved.
- Required trust fields cannot be derived without shared DQ/storage changes.
- Implementation requires shared UI, route, navigation, Prisma, package, provider, startup, or generated-file changes.
- UI smoke would only prove a page heading rather than trust/blocked states.
- Dirty worktree cannot be staged safely.

## Next Gate

Resolve `DECISION-20260517-copilot-trust-ux-policy`, then route this packet through architecture/QA acceptance and Ready promotion.

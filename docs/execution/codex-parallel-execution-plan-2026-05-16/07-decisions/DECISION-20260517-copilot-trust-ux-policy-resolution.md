# DECISION-20260517 Copilot Trust UX Policy Resolution

Date: 2026-05-18

Status: Resolved by Product Owner

Decision Inbox source: `99-decision-inbox/DECISION-20260517-copilot-trust-ux-policy.md`

## Approved Option

Option B: Copilot-only trust UX slice with blocked narrative hidden.

## Approved Policy

- Rename visible Copilot copy to `Local Research Copilot` or `Research Copilot`.
- Blocked states should hide generated narrative text and show a blocked/trust explanation instead.
- The first implementation slice must be Copilot-only.
- Stock Research Workbench trust surfaces are split to a separate requirement and are not included in the first Copilot slice.
- Shared UI and navigation files are not in scope.
- Mandatory trust fields should include, where current source supports them:
  - trust state;
  - Data Quality readiness or missing-DQ marker;
  - blocked reason;
  - latest trusted data date when available;
  - no-external-LLM / local deterministic summary marker.
- Do not invent DQ evidence or trust fields if current source cannot prove them.
- If required fields cannot be provided without backend contract changes, create a Decision Packet or contract work item.

## Not Approved

This decision does not approve:

- shared UI changes;
- navigation changes;
- route registry changes;
- paid AI services or external LLM calls;
- providers or live-provider behavior;
- Prisma schema or migrations;
- package manifest changes.

## Queue Impact

The Decision Inbox blocker for `CF-W1-UX-02` is resolved.

`CF-W1-UX-02` is not automatically Ready for Implementation. Team 08, Team 03, and Team 04 must refresh the Copilot-only implementation contract, trust-field fallback behavior, focused QA plan, exact backend/frontend/test reservations, and source-evidence constraints before Team 00 can promote a bounded slice.

## Product Owner Action

No further Product Owner action is required for this Decision Inbox item.


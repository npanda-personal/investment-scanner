# Blocker Register

Use this register for blockers that stop or materially delay a work item.

| ID | Date | Work Item | Blocker Type | Owner | Escalation Path | Next Action | Review Date | Parallel Work Available | Status |
|---|---|---|---|---|---|---|---|---|---|
| BLK-0001 |  |  |  |  |  |  |  |  | Open |

## Blocker Types

- `PO_DECISION`
- `ARCHITECTURE_DECISION`
- `QA_ENVIRONMENT`
- `TEST_FAILURE`
- `DATA_QUALITY`
- `SHARED_FILE_CONFLICT`
- `DEPENDENCY_OR_TOOLING`
- `SECURITY_OR_SECRET`
- `MIGRATION_OR_DATA_RISK`

## Entry Rules

- Every blocker needs an owner and next action.
- Record whether other agents can continue non-conflicting work.
- Close only when the blocking condition is resolved or the Product Owner changes scope.
- Developer blockers escalate to Lead/Orchestrator first, then Architect, then Product Owner when needed.
- Shared-file conflicts pause competing edits until the Orchestrator assigns one owner.
- If a blocker cannot be resolved in the current Codex work session, keep it open with a review date before the owner pulls unrelated work.

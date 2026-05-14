# Blocker Register

Use this register for blockers that stop or materially delay a work item.

| ID | Date | Work Item | Blocker Type | Owner | Escalation Path | Next Action | Review Date | Parallel Work Available | Status |
|---|---|---|---|---|---|---|---|---|---|
| BLK-0002 | 2026-05-13 | C2-WP-01 Trusted Universe Repair Workbench | `QA_ENVIRONMENT` | Senior Fullstack Lead / Orchestrator runtime validation | QA -> Orchestrator -> Lane 1 developer if runtime proof fails | Runtime UI/API evidence completed; C2-WP-01 moved through QA, Lead validation, Architect signoff, and PO acceptance | 2026-05-13 | None needed for this blocker | Closed |
| BLK-0003 | 2026-05-13 | C2-WP-02 Raw Signal Generation Scope And Model-Version Audit | `QA_ENVIRONMENT` | Senior Fullstack Lead / Orchestrator runtime validation | QA -> Orchestrator -> Lane 2A or Signal Quality developer if runtime proof fails | Runtime UI/API/migration evidence completed; C2-WP-02 moved through QA, Lead validation, Architect signoff, and PO acceptance | 2026-05-13 | C2-WP-05 schema slot can be reconsidered after accepted C2-WP-01 through C2-WP-04 check-in | Closed |
| BLK-0004 | 2026-05-13 | C2-WP-03 Strategy Proof Registry And Evidence Index | `QA_ENVIRONMENT` | Senior Fullstack Lead / Orchestrator runtime validation | QA -> Orchestrator -> Lane 2B developer if runtime proof fails | Runtime UI evidence completed; C2-WP-03 moved through QA, Lead validation, Architect signoff, and PO acceptance | 2026-05-13 | None needed for this blocker | Closed |
| BLK-0005 | 2026-05-13 | C2-WP-04 Today Review Explainability And Exclusion Reasons | `QA_ENVIRONMENT` | Senior Fullstack Lead / Orchestrator runtime validation | QA -> Orchestrator -> Lane 3A developer if runtime proof fails | Runtime UI/API evidence completed; C2-WP-04 moved through QA, Lead validation, Architect signoff, and PO acceptance | 2026-05-13 | None needed for this blocker | Closed |
| BLK-0006 | 2026-05-14 | P0.1C Trusted Universe Operational Drain | `DATA_QUALITY` | Senior Fullstack Lead / Orchestrator runtime validation | QA -> Orchestrator -> Architect -> PO if source policy changes are needed | Run bounded MD-A5 drain cycles only after memory check; capture operation report and QA evidence; do not start new feature implementation until trusted baseline proof is recorded | 2026-05-14 | Board/docs reconciliation and read-only roadmap work only | Open |
| BLK-0007 | 2026-05-14 | P0.1E Evidence And Board Reconciliation | `SHARED_FILE_CONFLICT` | Senior Fullstack Lead / Orchestrator | Orchestrator -> Architect if plan state conflict remains | Stale MD-A5 active rows, resource cleanup state, and assumption-control rules reconciled; scoped docs check-in follows validation | 2026-05-14 | P0.1C can start after cleanup commit and memory check | Closed |

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

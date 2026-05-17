# First-Principles vs Legacy Delta

## What The Fresh Plan Recommended

- Refactor current project in place.
- Create a new active execution folder.
- Use module teams based on current backend/frontend modules.
- Run Sprint 0 as planning-only.
- Protect shared files with Orchestrator and Architect control.
- Start Sprint 1 with Market Data and Data Quality readiness.
- Keep GitHub push optional and disabled by default.

## What Changed After Legacy Review

| Area | Change | Justification |
|---|---|---|
| Legacy influence tracking | Added explicit register | Prevents old-plan bias and records rejected assumptions. |
| Market Data/DQ risk | Strengthened as Sprint 1 candidate | Dirty source state and old blocker both point to same risk. |
| Release checklist | Explicitly local-first | Old GitHub push rules conflict with current direction. |
| Old plan handling | Stronger archive/evidence-only language | Old board claims live authority. |

## What Did Not Change

- Recommendation remains refactor in place.
- Sprint 0 remains planning-only.
- New active folder remains recommended.
- Old active board remains non-authoritative.
- Old QA/PO/signoff evidence remains historical only.

## Old Assumptions Explicitly Rejected

- Old active board is not the new source of truth.
- Old team-operating-model does not define the new model.
- Old GitHub check-in requirements are not mandatory.
- Old QA evidence does not prove current correctness.
- Old PO acceptance does not replace current PO acceptance.
- Old work packets do not authorize implementation.

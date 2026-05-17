# Legacy Influence Register

| Legacy Source | Idea | Decision | Reason | Current Evidence | Risk If Retained | Risk If Ignored |
|---|---|---|---|---|---|---|
| old team/board docs | One-writer rule | migrated | Matches root rule | root `AGENTS.md` section 9 | low | high write conflicts |
| old team docs | Orchestrator shared-file control | migrated | Matches root cross-cutting ownership | root `AGENTS.md` section 8 | low | shared-file drift |
| old SDLC docs | QA/review before PO | migrated | Matches root review gates | root `AGENTS.md` sections 30-31 | low | self-approval risk |
| old board/team docs | Laptop resource gate | migrated | Matches root laptop safety | root `AGENTS.md` section 26 | low | local instability |
| old team docs | Model routing discipline | migrated | Current PO prompt requires it | current Product Owner direction | medium if overcomplicated | inefficient Codex usage |
| old blocker register | Market Data/DQ blocker | migrated as revalidation candidate | Dirty Market Data code supports concern | git status shows broad Market Data changes | stale data if trusted blindly | missing major data-risk clue |
| old active board | Live source of truth | archived/rejected | Current PO says historical only | current Product Owner direction | high | low |
| old release/check-in docs | Mandatory GitHub push | archived/rejected | Current PO says no commit/push | current Product Owner direction and root `AGENTS.md` | high | low |
| old QA evidence | Current correctness proof | retained as history only | Root requires current validation | root `AGENTS.md` testing/review gates | high | moderate loss of examples |
| old PO acceptance | Current acceptance proof | retained as history only | Acceptance must be current | root `AGENTS.md` review gates | high | low |
| old work packets | Active implementation authorization | retained as examples only | Sprint 0 only approved planning artifacts | current Product Owner direction | high | low |
| deleted `docs/AGENTS.md` | Nested instruction source | neutralize/delete later | Root is only authority | current Product Owner direction | high | low |

## Rule

No legacy idea becomes active unless it is supported by root `AGENTS.md`, current repo state, or current Product Owner direction.

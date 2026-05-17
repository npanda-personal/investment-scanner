# Decision Needed

Choose the alert event ownership model for `CF-W1-L3-AUTH-02`.

# Context

Team 03 and Team 04 prepared an alert event ownership requirement, contract draft, architecture readiness note, QA plan, and work packet draft. Implementation cannot safely start until ownership is defined for alert event list/read/dismiss/mark-all-read/summary paths.

# Affected Workstream

Workstream: `CF-W1-L3-AUTH-02`

Requirement: Alert Event Ownership

Module: `alerts-monitoring`

Lane: Lane 3 Portfolio / Watchlist / Alerts

# Affected Files

Current documentation-only files:

- `10-requirements/CF-W1-L3-AUTH-02-alert-event-ownership-requirement.md`
- `06-contracts/CF-W1-L3-AUTH-02-alert-event-ownership-contract.md`
- `03-architecture/CF-W1-L3-AUTH-02-architecture-readiness.md`
- `04-qa/CF-W1-L3-AUTH-02-qa-plan.md`
- `08-work-packets/CF-W1-L3-AUTH-02-work-packet.md`

Possible future implementation files if approved:

- `backend/src/modules/alerts-monitoring/**`
- `backend/tests/modules/alerts-monitoring/**`

Possible future schema files only if direct ownership is approved:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma/types

# Evidence Inspected

- Root `AGENTS.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-shared-file.md`
- `10-requirements/CF-W1-L3-AUTH-02-alert-event-ownership-requirement.md`
- `06-contracts/CF-W1-L3-AUTH-02-alert-event-ownership-contract.md`
- `03-architecture/CF-W1-L3-AUTH-02-architecture-readiness.md`
- `04-qa/CF-W1-L3-AUTH-02-qa-plan.md`
- `08-work-packets/CF-W1-L3-AUTH-02-work-packet.md`

# Options

Option A: direct event owner. Add a direct owner to each alert event. This likely requires Prisma schema, migration, generated types, and legacy/backfill policy.

Option B: rule-owner join. Treat an event as owned by the user who owns its parent `AlertRule`; event list/read/dismiss/mark-all-read/summary join/filter through the rule owner. No schema change is expected for the first bounded slice.

Option C: defer alert event inbox/digest implementation until schema and legacy ownership policy can be addressed in a larger migration.

# Codex Recommendation

Choose Option B for the first bounded implementation slice, with null-owner alert rules excluded from authenticated alert event inboxes unless a separate compatibility policy is explicitly approved.

# Risk If Approved

Rule-owner ownership depends on preserving the parent rule relation for event authorization. Deleted, orphaned, or null-owner rules need explicit fail-closed behavior so events do not leak.

# Risk If Rejected

Alert event inbox, summary, notification digest, and copilot digest work remain blocked because global event reads/mutations cannot be accepted.

# Impact On Parallel Work

Other workstreams can continue: requirement refinement, trigger contract prep, Lane 3 DQ policy prep, Market Data ADR prep, Trade Plan contract prep, and UX trust prep.

# Exact Consent Needed

Product Owner + Architect approval:

`Approve CF-W1-L3-AUTH-02 Option B: alert event ownership through parent AlertRule owner for the first bounded backend slice. Null-owner or orphan events must fail closed or remain hidden from authenticated user inboxes unless a separate compatibility policy is approved. No Prisma/schema/migration, route registry, shared utility, frontend/UI, provider, paid/cloud, startup/backfill, or package changes are approved.`

# Safe Next Step If No Decision Yet

Keep `CF-W1-L3-AUTH-02` out of Ready for Implementation and continue documentation-only prep for unrelated requirements.


# CF-W1-L3-DQ-01 Work Packet

Date: 2026-05-17

## Work Item

Lane 3 readiness consumer policy contract.

## State

Product policy accepted. Application implementation is blocked until child work packets are prepared.

## Owner / Lane / Modules

- Owner: Team 03 Architecture Factory for post-decision child contract preparation.
- Lane: Lane 3.
- Future consuming modules: portfolio-management, watchlist-management, alerts-monitoring, portfolio-intelligence, research/copilot surfaces as separately approved child slices.

## Current Allowed Files

Only active execution documentation under:

- `03-architecture/**`
- `06-contracts/**`
- `08-work-packets/**`

## Current Forbidden Files

- application source or tests
- `04-qa/**`
- `10-requirements/**`
- `backend/prisma/schema.prisma`
- route registries
- shared utilities/UI
- package manifests
- generated types
- providers, scheduler, startup, Angel One, broker, live-provider flows

## Policy Decisions Needed

Product Owner approved Option B:

- `READY` supports trusted display and action-like workflows.
- `LIMITED` may appear only in passive portfolio/watchlist/research contexts with visible warnings and no reliability/action labels.
- Alerts, action-like workflows, reliability labels, and trusted summaries require `READY`.
- Missing, stale hard blockers, unsupported, `NOT_READY`, and `UNUSABLE` remain blocked.

## Future Reservation Model

After policy acceptance, split implementation into child work packets. Do not reserve all Lane 3 modules in one implementation pass.

Candidate child reservations:

- Portfolio/watchlist DTO readiness: portfolio and watchlist module source/tests only.
- Alerts readiness suppression: alerts module source/tests only.
- Portfolio intelligence reliability gate: portfolio-intelligence module source/tests only.
- Copilot/research trust surface: copilot/research modules and UX-approved frontend files only.

## Decision Resolution Note

The display-vs-action Decision Packet was resolved on 2026-05-17 as Option B. Future Decision Packets are needed only if a child slice broadens the approved policy or needs forbidden/shared/high-risk scope.

## Acceptance Criteria For This Packet

- Contract records current blocker clearly.
- No implementation files are reserved for immediate source changes.
- Future work is split by module and single-writer ownership.
- Shared-file stop conditions are explicit.

## Team 03 Relaunch Update - 2026-05-17

Current state remains docs-only and blocked from app-code implementation.

Exact current write scope for this Team 03 pass:

- `03-architecture/next-contracts-to-prepare.md`
- `03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `17-team-outboxes/TEAM-03-architecture-factory.md`

Future implementation is not reserved. When policy is accepted, Team 00 should create child work packets with one writer per module and exact file lists.

Current blocker: child DTO fields, QA scenarios, exact file reservations, and module-specific implementation handoffs are not yet accepted.

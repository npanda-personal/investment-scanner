# CF-W1-L3-DQ-01 Work Packet

Date: 2026-05-17

## Work Item

Lane 3 readiness consumer policy contract.

## State

Docs-only contract draft prepared. Application implementation is blocked.

## Owner / Lane / Modules

- Owner: Team 03 Architecture Factory until policy is accepted.
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

Product Owner and Architect must decide:

- whether portfolio/watchlist passive displays may show `LIMITED` data,
- whether alerts are always blocked unless DQ is `READY`,
- which Data Quality use-case tier maps to each Lane 3 consumer,
- how missing DQ is represented in user-facing DTOs,
- whether frontend surfaces are required in the first implementation slice.

## Future Reservation Model

After policy acceptance, split implementation into child work packets. Do not reserve all Lane 3 modules in one implementation pass.

Candidate child reservations:

- Portfolio/watchlist DTO readiness: portfolio and watchlist module source/tests only.
- Alerts readiness suppression: alerts module source/tests only.
- Portfolio intelligence reliability gate: portfolio-intelligence module source/tests only.
- Copilot/research trust surface: copilot/research modules and UX-approved frontend files only.

## Decision Packet Note

A Decision Packet should be created later if the Product Owner is ready to choose the display-vs-action readiness policy. It was not created in this pass.

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

Current blocker: Product Owner and Architect must accept the Lane 3 display-vs-action readiness policy, including `LIMITED` behavior, alert/action block behavior, DTO fields, and child slice boundaries.

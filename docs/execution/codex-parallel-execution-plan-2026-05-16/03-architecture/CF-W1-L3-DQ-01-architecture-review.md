# CF-W1-L3-DQ-01 Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Docs-only architecture review prepared. Not Ready for Implementation.

This item remains blocked by Product Owner and Architect policy consent for Lane 3 display-only versus action-like readiness behavior.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- `04-qa/CF-W1-L3-DQ-01-qa-plan.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- current backend module structure for `portfolio-management`, `watchlist-management`, `alerts-monitoring`, `portfolio-intelligence`, and `data-quality-engine`

## Architecture Finding

Lane 3 consumers can safely continue policy preparation, but implementation is unsafe until the accepted policy defines:

- whether `LIMITED` DQ can be displayed in passive portfolio/watchlist contexts,
- whether action-like alerts require `READY` DQ and current session evidence,
- which Data Quality use-case tier each consumer must use,
- whether missing DQ produces an empty, warning, or blocked state,
- which DTO fields expose readiness status, reasons, blockers, and source freshness.

The Data Quality Engine already exposes public readiness DTOs and use-case tiers. Lane 3 consumers must use those outputs through public module exports and must not duplicate readiness scoring.

## Recommended Policy Option

Recommend a conservative parent policy for Product Owner/Architect review:

- `READY`: allowed for passive display and action-like workflows, subject to module-specific rules.
- `LIMITED`: allowed only for passive display/research context with visible warning and blocker reasons; not allowed for alert creation or reliability/action labels unless Product Owner explicitly approves a narrower exception.
- `NOT_READY`, `UNUSABLE`, stale hard blockers, missing DQ, unsupported scope, and scope mismatch: blocked for trusted display, alert creation, reliability labels, and action-like workflow states.

## File Reservations

No app-code files are reserved by this review.

Future child packets should reserve one module at a time:

- portfolio/watchlist DTO readiness child: `backend/src/modules/portfolio-management/**`, `backend/tests/modules/portfolio-management/**`, `backend/src/modules/watchlist-management/**`, `backend/tests/modules/watchlist-management/**`
- alerts readiness suppression child: `backend/src/modules/alerts-monitoring/**`, `backend/tests/modules/alerts-monitoring/**`
- portfolio intelligence reliability child: `backend/src/modules/portfolio-intelligence/**`, `backend/tests/modules/portfolio-intelligence/**`
- frontend display child: exact feature files only after UX acceptance

## Forbidden Files

- application source or tests during this docs-only pass
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- provider, scheduler, startup, Angel One, broker, and live-provider flows
- `04-qa/**`, `10-requirements/**`, `00-control/**`, `12-ready-queue/**`, and decision inbox files for this Team 03 assignment

## Blockers

- Product Owner and Architect have not accepted display-vs-action readiness policy.
- Exact DTO fields and child implementation reservations are not accepted.
- `LIMITED` readiness semantics remain ambiguous for action-like workflows.

## Readiness Result

Architecture-ready for docs-only policy decision prep. Blocked for app-code implementation.


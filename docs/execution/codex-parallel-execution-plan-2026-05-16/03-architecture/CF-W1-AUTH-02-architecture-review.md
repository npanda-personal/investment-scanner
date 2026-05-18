# CF-W1-AUTH-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Focused backend consumer-isolation architecture packet prepared. Not Ready for Implementation.

This requirement is a follow-on to accepted `CF-W1-L3-AUTH-02` alert event ownership. It must not reopen the committed event repository/rule-owner join slice unless a later regression packet proves that work is incomplete.

## Evidence Inspected

- `AGENTS.md`
- `00-control/risk-register.md`
- `10-requirements/CF-W1-AUTH-02-alert-inbox-user-isolation-requirement.md`
- `06-contracts/CF-W1-L3-AUTH-02-alert-event-ownership-contract.md`
- `06-contracts/CF-W1-AUTH-01-platform-auth-fail-closed-contract.md`
- `08-work-packets/CF-W1-AUTH-01-work-packet.md`
- `03-architecture/CF-W1-L3-AUTH-02-architecture-readiness.md`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.controller.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`

## Current Source Findings

- `alerts-monitoring` now scopes `listEvents`, `markRead`, `dismiss`, and `markAllRead` through `AlertRule.userId`.
- `notifications-delivery.service.ts` still builds alert digests by calling `alertsService.listEvents()` without passing the current user id.
- `ai-investment-copilot.service.ts` still builds alert digests by calling `alertsMonitoringService.listEvents()` without passing the current user id.
- `notifications-delivery.controller.ts` and `ai-investment-copilot.controller.ts` still fall back to `default-user` when `req.user?.id` is missing. That is related auth policy work, but it is not the narrow consumer-isolation bug in this requirement.
- Daily and weekly notification digests already pass `userId` into the Copilot service, so the remaining leak risk is the Copilot alert-digest implementation itself.

## Architecture Decision

Prepare `CF-W1-AUTH-02` as a consumer-isolation requirement, not as a second alert-event ownership rewrite.

The first safe implementation packet should:

- preserve the accepted `CF-W1-L3-AUTH-02` rule-owner event ownership model;
- require all alert digest consumers to pass the current user id into alert-event reads;
- forbid no-argument alert-event reads from notification and Copilot digest paths;
- fail closed to an empty or unavailable digest summary when the consumer cannot prove a current user id;
- keep route paths, Prisma/schema, alert repository semantics, and shared auth middleware out of scope.

## Implementation Split

Default split for future implementation:

1. Team 09 child: `notifications-delivery` alert digest propagation.
2. Team 08 child: `ai-investment-copilot` alert digest propagation.

These two child packets may run in parallel only if Team 00 records separate writers and keeps controller/auth policy work out of scope.

## Exact Future File Reservations

Team 09 child reservation:

- `backend/src/modules/notifications-delivery/notifications-delivery.service.ts`
- `backend/src/modules/notifications-delivery/notifications-delivery.md`
- `backend/tests/modules/notifications-delivery/notifications-delivery.service.test.ts`

Team 08 child reservation:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.service.ts`
- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.md`
- `backend/tests/modules/ai-investment-copilot/ai-investment-copilot.service.test.ts`

Optional only if Team 00 combines this requirement with a separate accepted fail-closed protected-route packet:

- `backend/src/modules/ai-investment-copilot/ai-investment-copilot.controller.ts`

## Forbidden Files

- `backend/src/modules/alerts-monitoring/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- auth middleware or `auth-identity` source/tests
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- notification provider files
- frontend Copilot or notification feature files
- providers, schedulers, startup/backfill, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- This requirement depends on accepted `CF-W1-L3-AUTH-02` ownership behavior and must not re-open it.
- Team 09 child conflicts with active `CF-W1-NOTIF-02` because both reserve `notifications-delivery.md` and `notifications-delivery.service.test.ts`.
- Team 08 child conflicts with `CF-W1-UX-02` and `CF-W1-UX-05` because all three reserve `ai-investment-copilot.service.ts` and `ai-investment-copilot.md`.
- Any broader fail-closed controller work should stay sequenced with `CF-W1-AUTH-01` or a separate Copilot auth packet rather than being silently folded into this slice.

## Required QA Scenarios

Focused backend QA should prove:

- notification alert digests read only the current user's alert events;
- Copilot alert digests read only the current user's alert events;
- neither consumer performs a no-argument `listEvents()` call;
- missing user context does not trigger a global alert-event read;
- existing digest payload shape remains backward-compatible.

## Readiness Result

Architecture packet prepared. Not Ready for Implementation.

The Team 09 and Team 08 child reservations are exact, but the requirement still needs Team 04 QA planning and Team 00 sequencing because of active file collisions with `CF-W1-NOTIF-02`, `CF-W1-UX-02`, and `CF-W1-UX-05`.

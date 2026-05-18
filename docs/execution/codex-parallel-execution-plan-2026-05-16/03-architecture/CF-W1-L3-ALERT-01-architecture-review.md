# CF-W1-L3-ALERT-01 Architecture Review

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Architecture child contract prepared. Not Ready for Implementation.

This child slice follows the accepted `CF-W1-L3-DQ-01` Option B policy and the completed `CF-W1-L3-AUTH-02` parent-rule alert event ownership slice.

## Evidence Inspected

- `AGENTS.md`
- `00-control/active-work-board.md`
- `03-architecture/CF-W1-L3-AUTH-02-architect-signoff.md`
- `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`
- `06-contracts/CF-W1-L3-AUTH-02-alert-event-ownership-contract.md`
- `06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `07-decisions/DECISION-20260517-alert-event-ownership-model-resolution.md`
- `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`
- `10-requirements/requirements-backlog.md`
- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `12-ready-queue/blocked-by-upstream-dependency.md`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.repository.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`
- Data Quality Engine public service/types inspected during `CF-W1-L3-PORT-01`

## Current Source Findings

- Alerts Monitoring creates stock price, stock signal, portfolio, and watchlist events without checking Data Quality readiness.
- `evaluate()` currently reports `evaluated`, `created`, `skippedDuplicates`, `errors`, and created events, but does not report readiness suppressions.
- Event metadata is already a JSON object and can carry Data Quality evidence without schema changes.
- Parent-rule ownership was accepted separately; this child must not alter event ownership behavior or schema.
- Portfolio and watchlist readiness DTO work is not implemented yet. Alert readiness suppression cannot depend on those DTOs being present.

## Architecture Decision

Prepare a backend-only alert readiness suppression contract.

Alerts are action-like workflows. Under accepted Option B, they require `READY` Data Quality evidence and must suppress events when readiness is missing, `LIMITED`, `NOT_READY`, stale, blocked, unsupported, or scope-mismatched.

The first implementation should consume `DataQualityEngineService` directly through the Data Quality public module export. It may later prefer approved portfolio/watchlist readiness DTOs, but it must not depend on `CF-W1-L3-PORT-01` implementation.

## Required Readiness Gate

For alert event creation, require the Data Quality `automation` use-case tier to be `READY` when available.

Fallback only when `automation` tier is absent:

- require `signal` tier `READY` when available;
- otherwise require `signalReadinessStatus = READY` and `eligibleForSignals = true`.

Any `LIMITED`, `BLOCKED`, `NOT_READY`, `UNUSABLE`, missing DQ, stale hard blocker, unsupported, or scope mismatch evidence must suppress event creation.

## Event And Suppression Evidence

Created events should carry minimal Data Quality evidence in metadata:

- source: `data-quality-engine`;
- required use-case tier;
- tier status used for gating;
- signal readiness status;
- coverage status;
- liquidity status;
- `eligibleForSignals`;
- reasons/blockers/warnings;
- `lastEvaluatedAt`.

Suppressed readiness cases should be visible in `AlertEvaluationResult` through additive fields, for example:

- `skippedReadiness`
- `readinessSuppressions`

These fields are additive and do not require route changes.

## Exact Future File Reservations

Allowed files after Ready promotion:

- `backend/src/modules/alerts-monitoring/alerts-monitoring.service.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.types.ts`
- `backend/src/modules/alerts-monitoring/alerts-monitoring.md`
- `backend/tests/modules/alerts-monitoring/alerts-monitoring.service.test.ts`

Optional only if implementation touches ownership-sensitive paths:

- `backend/tests/modules/alerts-monitoring/alerts-monitoring.ownership.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend route registry
- frontend route registry
- shared backend utilities
- shared frontend components
- package manifests
- generated types
- Data Quality Engine source or public export changes
- Portfolio Management source changes
- Watchlist Management source changes
- Portfolio Intelligence source changes
- frontend feature files
- notifications or copilot digest consumers
- providers, schedulers, startup/backfill, Angel One, broker, live-provider, paid/cloud, or telemetry flows

## Required QA Scenarios

Team 04 already has a draft QA plan. It should refresh the plan against this contract before implementation is pulled.

Minimum focused backend scenarios:

- Stock price alert creates an event only when DQ required tier is `READY`.
- Stock signal alert creates an event only when DQ required tier is `READY`.
- Portfolio alert suppresses a holding event when the holding instrument DQ is missing, `LIMITED`, `NOT_READY`, or blocked.
- Watchlist alert suppresses an item event when the item instrument DQ is missing, `LIMITED`, `NOT_READY`, or blocked.
- Suppressed events increment/add readiness suppression evidence.
- Created event metadata carries Data Quality readiness evidence.
- Duplicate suppression and parent-rule ownership behavior remain unchanged.

## Readiness Result

Architecture child contract is prepared for `CF-W1-L3-ALERT-01`.

Do not move this item to `Ready for Implementation` until Team 00 promotes the exact file reservation and implementation handoff. Team 04's child QA plan already exists in `04-qa/CF-W1-L3-ALERT-01-qa-plan.md`.

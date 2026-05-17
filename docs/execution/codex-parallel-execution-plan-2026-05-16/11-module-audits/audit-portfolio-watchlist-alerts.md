# Audit: Portfolio / Watchlist / Alerts

Date: 2026-05-17

Mode: Read-only Audit Team D.

Authority: root `AGENTS.md`; active execution docs only. `docs/AGENTS.md` is deleted/legacy and `docs/codex-agent-team-plan/**` is historical.

## Scope

- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/alerts-monitoring/**`
- related `backend/tests/modules/**`
- active execution docs

No tests, servers, live providers, schema changes, route changes, staging, commits, or file edits were run by the audit stream.

## Executive Finding

Lane 3 user workflows still leak untrusted market/signal data into portfolio summaries, portfolio intelligence, watchlist enrichment, and alert events. None of the audited modules consume `DataQualityEngineService` readiness outputs, and active docs still classify `portfolio-intelligence`, `watchlist-management`, and `alerts-monitoring` as blocked from trusted downstream use.

## DQ Leakage

- Portfolio Management marks `dataStatus` as `COMPLETE` if prices are non-null, not if DQ is `READY`.
- Watchlist Management enriches rows with current price, daily move, and latest signal, but returns no readiness status/blockers.
- Portfolio Intelligence calculates health score, status, review ranking, and `actionSuggestion` from portfolio summary fields; it carries only `summary.dataStatus`.
- Alerts Monitoring creates price, signal, portfolio, and watchlist events without checking instrument-level `READY` or preserving DQ evidence in metadata.

## Auth / User Ownership Issues

- Routers use `requireAuth`, but controllers and services still fall back to `default-user`.
- Portfolio child mutations/listing skip user ownership checks for some holding and transaction flows.
- Watchlist item mutations skip user ownership checks for some item flows.
- Alert event inbox actions are global; `listEvents`, `markRead`, `dismiss`, and `markAllRead` do not filter by current user.
- `AlertEvent` has no direct `userId`; filtering would need to go through `AlertRule` ownership unless schema changes are later approved.

## Candidate Stories

- `CF-W1-L3-DQ-01`: Define a Lane 3 readiness consumer contract for portfolio, watchlist, and alerts.
- `CF-W1-L3-ALERT-01`: Add backend-only alert readiness tests for missing, `LIMITED`, `NOT_READY`, stale, and blocked DQ states.
- `CF-W1-L3-AUTH-01`: Add ownership tests for portfolio holdings/transactions and watchlist items, then pass `userId` through child-resource methods.
- `CF-W1-L3-AUTH-02`: Scope alert evaluation and inbox actions by current user; validate portfolio/watchlist rule references belong to the rule owner.
- `CF-W1-L3-PORT-01`: Add portfolio/watchlist DTO readiness evidence from DQE public outputs without duplicating scoring logic.
- `CF-W1-L3-INTEL-01`: Gate Portfolio Intelligence reliability claims on portfolio-context readiness.
- `CF-W1-L3-ALERT-02`: Clarify alert rule semantics so price thresholds are monitoring thresholds and signal-direction rules do not overstate change detection.

## Risk

Downstream modules remain blocked from treating Market Data / DQ as trusted input until readiness consumer contracts, focused tests, implementation, QA, review, Architect signoff, and Product Owner acceptance exist.


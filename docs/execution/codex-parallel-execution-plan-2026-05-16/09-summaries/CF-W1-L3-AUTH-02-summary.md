# CF-W1-L3-AUTH-02 Summary

Date: 2026-05-17

## Status

Accepted for scoped local commit.

## Behavior

- Alert event reads and mutations are scoped through parent `AlertRule.userId`.
- Authenticated event summary uses current-user scoped events.
- Authenticated evaluation uses only current-user enabled rules.
- Portfolio/watchlist rule evaluation preserves the current user when reading referenced portfolio/watchlist resources.

## Tests

Focused command passed: 7 suites, 45 tests.

## Remaining Work

- Notification digest event ownership.
- Copilot digest event ownership.
- Direct event owner schema ADR, if ever needed.
- Lane 3 alert Data Quality readiness suppression.


# CF-W1-L3-AUTH-02 QA Evidence

Date: 2026-05-17

## Scope

Focused backend QA for rule-owner-scoped alert event ownership.

## Command

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts alerts-monitoring.routes.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
```

AUTH-02 relevant suites:

- `alerts-monitoring.service.test.ts`
- `alerts-monitoring.ownership.test.ts`
- `alerts-monitoring.routes.test.ts`

## Result

Pass.

```text
Test Suites: 7 passed, 7 total
Tests:       45 passed, 45 total
Snapshots:   0 total
```

## QA Checks

- Event list/read/dismiss/mark-all-read/summary paths pass current user through controller/service.
- Repository event reads and mutations are scoped through parent `AlertRule.userId`.
- Null-owner and cross-user events are not visible through authenticated event paths.
- Cross-user event actions return non-leaking not-found behavior.
- Evaluation endpoint runs only current-user enabled rules.
- Portfolio/watchlist rule evaluation preserves the rule owner when calling portfolio/watchlist services.
- Existing route registry and route paths are unchanged.
- No Prisma, schema, route registry, shared, frontend, package, generated, provider, startup, Angel One, broker, paid, or cloud files were changed.

## Skipped

Broad backend suites, frontend/UI, Prisma commands, app startup, providers/live data, notification digest, copilot digest, and Lane 3 Data Quality readiness suppression were skipped because they are outside this bounded slice.

## QA Decision

Accepted for the bounded `CF-W1-L3-AUTH-02` backend slice.


# CF-W1-L3-AUTH-03 QA Plan

Date: 2026-05-17

Owner: Team 07 Portfolio / Watchlist / Alerts

## Status

QA plan draft prepared. Not executable until architecture/contract acceptance, exact file reservation, and Team 00 Ready promotion exist.

## Scope

Backend-only validation for Alerts Monitoring rule target ownership.

This plan does not approve source edits, tests, Prisma/schema changes, route changes, shared utilities/UI, frontend work, providers, startup/backfill, Angel One, broker, paid/cloud services, UI smoke, broad suites, staging, commits, or pushes.

## Required QA Assertions

- Portfolio-scoped rule creation verifies portfolio ownership.
- Watchlist-scoped rule creation verifies watchlist ownership.
- Rule updates revalidate the effective target after merging existing and update payload values.
- Cross-user targets fail closed with non-leaking errors.
- Alert evaluation passes the rule owner into portfolio/watchlist lookups.
- Existing alert event ownership tests remain valid.
- No Data Quality readiness behavior is changed in this slice.

## Scenario Matrix

| Scenario | Expected result |
| --- | --- |
| User creates portfolio alert for owned portfolio | Rule persists. |
| User creates portfolio alert for another user's portfolio | Rule creation fails closed; repository create is not called. |
| User creates watchlist alert for owned watchlist | Rule persists. |
| User creates watchlist alert for another user's watchlist | Rule creation fails closed; repository create is not called. |
| User updates stock rule into portfolio rule | Effective portfolio target is ownership-checked before update. |
| User updates owned portfolio rule to another user's portfolio | Update fails closed; repository update is not called. |
| Evaluation of portfolio/watchlist rule | Portfolio/watchlist services receive the rule owner, not an unscoped default. |
| Event inbox regression | `CF-W1-L3-AUTH-02` event ownership behavior remains protected. |

## Focused Command Guidance

Run only after implementation handoff exists:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.ownership.test.ts --runInBand
```

Route tests only if controller behavior is touched:

```powershell
cd backend
npm.cmd test -- alerts-monitoring.routes.test.ts --runInBand
```

## Rejection Criteria

- Rule target validation imports portfolio/watchlist repositories directly.
- Cross-user target create/update persists a rule.
- Evaluation falls back to `default-user` for user-owned portfolio/watchlist resources.
- Implementation touches Prisma, route registries, shared auth utilities, frontend, notifications, copilot, package manifests, providers, startup/backfill, or generated files.
- Tests rely on live providers or broad suites.

## Evidence Required Later

- Exact changed-file list.
- Focused test output.
- Confirmation no forbidden paths were touched.
- Confirmation `CF-W1-L3-AUTH-02` ownership behavior remains intact.
- Skipped checks with reason and next owner.

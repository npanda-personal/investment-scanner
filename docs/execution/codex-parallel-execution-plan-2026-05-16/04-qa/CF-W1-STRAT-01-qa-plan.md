# CF-W1-STRAT-01 QA Plan

Date: 2026-05-17

## Status

Approved for bounded Strategy Decision Option B-Strict implementation.

## Scope

QA for the first approved Strategy Decision no-target / exit-invalidation compatibility slice.

## Focused Test Targets

Use focused backend tests only:

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
```

If exact test filenames differ, use the smallest Jest pattern that runs only Strategy Decision tests related to the changed files.

## QA Assertions

- Trusted Strategy Decision outputs do not contain arbitrary target-price claims.
- Trusted Strategy Decision outputs do not derive `riskPlan.targetPrice` from `latestPrice * 1.15`.
- Exit rules use rule/evidence language and do not include `Target price achieved.`
- Invalidation rules remain explicit.
- Rationale text avoids fixed expected upside language.
- Compatibility fields, if retained, are documented as non-advice limitations.
- Replacement output uses candidate/review/risk/evidence wording.
- Forbidden language is not introduced.
- No Data Quality, Market Data, Trade Plan, frontend, Prisma, route, shared utility, shared UI, package, generated/common fixture, provider, Angel One, live provider, startup, or UI behavior is required.

## Limitations

This QA plan does not validate Trade Plan target-geometry behavior, UI display language, or downstream consumer migration unless those scopes are separately approved.

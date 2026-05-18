# CF-W1-UX-02 QA Plan

Date: 2026-05-18

Owner: Team 04 QA Factory

Status: Option B QA refresh prepared. Copilot trust UX validation remains blocked until the Copilot-only contract, exact file reservations, and implementation handoff are accepted.

Current status refresh: Product Owner approved Option B on 2026-05-18. `CF-W1-UX-02` remains docs-only until Team 08/03/04 refresh the Copilot-only trust packet and Team 00 issues an implementation handoff.

## Scope

Validation plan for Copilot trust UX and supporting backend contract behavior.

Target surfaces after approval:

- Copilot summary DTO trust fields,
- stock, portfolio, watchlist, market, and alert summary behavior,
- blocked or limited states when DQ evidence is missing or stale,
- local deterministic/no-external proof,
- source module and data gap evidence,
- scoped market context where Copilot consumes scoped data,
- future UI smoke tests only after UI scope approval.

This plan does not approve backend source edits, frontend source edits, test edits, Prisma changes, routes, shared utilities/UI, packages, generated files, providers, services, startup/backfill, UI implementation, Playwright, builds, broad suites, or live data checks.

## Approved Product / UX Policy

Decision reference: `07-decisions/DECISION-20260517-copilot-trust-ux-policy-resolution.md`.

Product Owner approved Option B:

- visible copy changes to `Local Research Copilot` or `Research Copilot`;
- blocked summaries hide generated narrative and show blocked/trust explanation;
- first implementation slice is Copilot-only;
- Stock Research Workbench trust surfaces are split to a separate requirement;
- shared status components, navigation metadata, and route registry changes are out of scope;
- trust fields are mandatory where current source supports them and must not be invented.

Before implementation validation, the refreshed contract must still define:

- source-supported trust fields and fallback behavior when DQ evidence is missing;
- whether current `COMPLETE | PARTIAL | MISSING | ERROR` maps to readiness states;
- how `region` and `assetType` scope are passed, displayed, and refreshed;
- exact backend, frontend, and test file reservations.

## Required QA Assertions

- Copilot responses expose the accepted trust fields without inventing unsupported readiness claims.
- Missing DQ evidence produces a blocked or limited state before reliability claims.
- `NOT_READY`, `BLOCKED`, stale, unsupported, or scope-mismatched evidence prevents trusted summary presentation.
- `LIMITED` behavior follows the accepted display-vs-action policy and is visibly limited.
- Summary copy remains research-support oriented and avoids direct advice language.
- UI visibly proves summaries are local, deterministic, and have no external LLM or paid/cloud dependency.
- Source modules, data gaps, blocker reasons, latest trusted data date, and scope context are visible where available.
- Backend tests prove trusted, blocked, stale, scoped, missing-source, and safe-language scenarios.
- UI smoke tests, if approved later, prove trusted and blocked states rather than only page load or heading checks.
- Blocked summaries hide generated narrative and show blocked/trust explanation instead.
- No provider, Angel One, startup/backfill, Prisma mutation, paid/cloud, broker, telemetry, or external AI path is required.

## Scenario Matrix

| Scenario | Backend expected result | UI expected result after UI approval |
| --- | --- | --- |
| All required evidence `READY` | Summary may be returned with trust fields and source modules. | Trusted research state shows DQ readiness, source modules, latest trusted date, and local deterministic proof. |
| Missing DQ evidence | Blocked or limited response according to accepted policy. | Blocked/limited state appears before summary reliability claims. |
| `LIMITED` evidence | Limited response with reasons; no reliability overclaim. | Warning/limited state with reasons; no action-like language. |
| `NOT_READY` or `BLOCKED` evidence | Trusted summary suppressed or diagnostic-only according to contract. | Blocked state with blocker reasons and safe next local action if one exists. |
| Stale evidence | Stale blocker or limited state with latest trusted date. | Stale warning/blocker visible without relying on color alone. |
| Scope mismatch or unsupported asset type | Response refuses trusted summary or shows scoped empty state. | Current `region` and `assetType` are visible or preserved; unsupported scope is clear. |
| Source module unavailable | Data gap captured; no hidden external fallback. | Data gap list visible and summary status downgraded or blocked. |
| Unsafe advisory wording appears in source text | Sanitized or rejected according to safe-language policy. | UI contains research-support language only. |

## Focused Command Guidance

Commands below are guidance only. They were not run during this docs-only QA planning task.

Backend contract validation after accepted contract and implementation handoff:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.validation.test.ts ai-investment-copilot.routes.test.ts --runInBand
```

Focused downstream regression if alert digest, portfolio, watchlist, or stock research inputs are touched:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts alerts-monitoring.service.test.ts portfolio-management.service.test.ts portfolio-intelligence.service.test.ts watchlist-management.service.test.ts stock-research-workbench.service.test.ts --runInBand
```

UI smoke, approval-gated only after accepted UI implementation, local app startup plan, exact spec, Team 00 validation approval, and memory/resource check:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

If Stock Research Workbench is included by accepted scope:

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Approval-gated builds after accepted implementation, Team 00 validation approval, and memory/resource check:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Unsafe Or Broad Commands Excluded

Do not run by default:

- broad backend or frontend test suites with no file filters,
- Playwright before UI scope, local app startup plan, and memory/resource check,
- dev servers, live services, or provider services,
- startup, scheduler, repair, sync, import, or backfill flows,
- Prisma generate, migrate, db push, db execute, or any schema/data mutation,
- provider tests, Angel One, or live provider checks,
- external AI, paid/cloud, telemetry, broker, or real-money flows,
- UI implementation or shared UI/navigation/route edits without reserved scope.

## Stop Conditions

Stop QA and return to Product Owner/UX/Architect if:

- source-supported trust-field mapping remains ambiguous,
- required trust fields are unavailable from approved backend contracts,
- UI smoke would only prove page load instead of trusted and blocked states,
- implementation requires shared UI, navigation, route registry, Prisma, packages, providers, external AI, or generated files without reservation,
- copy implies direct financial advice or black-box recommendations,
- command scope broadens beyond focused backend Jest or approved single-spec Playwright patterns.

## Evidence Required Later

- Refreshed Product/UX/Architect trust contract aligned to Option B.
- Exact implementation handoff with changed files.
- Backend scenario matrix results for trusted, missing, limited, blocked, stale, scoped, source-gap, and safe-language cases.
- UI smoke evidence only after approved UI implementation.
- Confirmation no providers, services, startup/backfill, Prisma mutation, broad suites, Angel One, paid/cloud, broker, telemetry, external AI, or live data checks were used.
- Skipped checks with reason and next owner.

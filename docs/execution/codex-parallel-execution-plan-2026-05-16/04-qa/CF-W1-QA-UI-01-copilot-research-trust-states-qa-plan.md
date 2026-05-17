# CF-W1-QA-UI-01 - Copilot And Research Trust States QA Plan

Date: 2026-05-17

Owner: Team 08 QA subagent

Status: Draft QA plan. Not executable until Product/UX/Architect approve `CF-W1-UX-02` UI scope and work packet.

## Scope

Focused validation for Copilot trusted, limited, blocked, stale, scoped, deterministic-local, and safe-language states.

This QA plan does not authorize backend source edits, frontend source edits, Playwright execution, dev servers, providers, live data, Prisma, packages, route changes, shared UI changes, startup/backfill flows, or broad test suites.

## Required Preconditions

- `CF-W1-UX-02` Product/UX policy decision accepted.
- `06-contracts/CF-W1-UX-02-copilot-trust-ux-contract.md` accepted or revised by Architect.
- `08-work-packets/CF-W1-UX-02-work-packet.md` promoted to Ready with exact file reservations.
- UI implementation scope approved.
- Memory/resource check completed before Playwright or dev servers.

## Backend Scenario Matrix

| Scenario | Expected backend result |
| --- | --- |
| All required evidence ready | Trust state is `TRUSTED_RESEARCH`, local/deterministic/no-external flags are explicit, summary is visible. |
| Optional evidence missing | Trust state is `LIMITED_RESEARCH`, warning reasons and data gaps are visible, no reliability overclaim. |
| Required DQ evidence missing | Trust state is `BLOCKED_RESEARCH` or approved limited state, blocker reasons are visible before summary text. |
| Stale source evidence | Trust state is limited or blocked, latest trusted data date is returned, stale reason is present. |
| Unsupported or mismatched scope | Trusted summary is refused or downgraded; returned scope evidence matches request/fallback behavior. |
| Source module unavailable | Source module appears in data gaps; no hidden external fallback occurs. |
| Unsafe advisory wording in source text | Output avoids direct financial advice and certainty language. |

## UI Scenario Matrix

| Scenario | Expected UI result |
| --- | --- |
| Trusted Copilot summary | Shows trust state, source modules, latest trusted date, scope, local deterministic proof, and research-only language. |
| Limited Copilot summary | Shows limitation banner/reasons before summary content; action-like controls remain blocked where policy requires. |
| Blocked Copilot summary | Shows blocked state and reasons; generated narrative is hidden unless Product Owner approved diagnostic display. |
| Missing scoped data | Shows domain-specific empty state with current `region` and `assetType`, not generic page-load success. |
| Local API error | Shows local error state and no reliability claim. |
| Product-language regression | Page contains no direct advice, no `Generate Report`, no `Bullish Factors`, and no `appears strong` copy after approved copy pass. |

## Focused Commands After Approval

Backend focused tests:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts ai-investment-copilot.validation.test.ts ai-investment-copilot.routes.test.ts --runInBand
```

Copilot UI smoke:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

Stock Research UI smoke only if `CF-W1-UX-01` is included:

```powershell
cd frontend
npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1
```

Builds only after accepted implementation and resource check:

```powershell
cd backend
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
```

## Excluded Commands

- Broad backend or frontend test suites without file filters.
- Playwright before UI scope approval and dev-server plan.
- Provider, Angel One, startup, scheduler, sync, import, repair, or backfill workflows.
- Prisma generate, migrate, db push, db execute, or schema/data mutation.
- External AI, paid/cloud, telemetry, broker, or real-money workflows.

## Evidence Required Later

- Backend focused test output for the scenario matrix.
- UI smoke evidence proving trusted and blocked states, not only page load.
- Copy-safety assertion output.
- Confirmation no external LLM, paid provider, cloud, telemetry, broker, provider-heavy, or startup/backfill path was used.
- Skipped checks with reason and next owner.

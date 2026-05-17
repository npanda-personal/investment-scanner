# CF-W1-UX-05 - Product Language And Status QA Plan

Date: 2026-05-17

Owner: Team 08 QA

Status: Draft QA plan. Not executable until child scope is selected and promoted.

## Scope

Validate copy and visual status semantics for the selected CF-W1-UX-05 child slice.

This plan does not authorize code edits, Playwright, dev servers, shared UI changes, packages, providers, Prisma, route changes, or broad test suites.

## Required Preconditions

- Product/UX/Architect select the first target surface.
- Exact file reservations are accepted.
- Work packet is promoted to Ready.
- For UI smoke: memory/resource check and local app startup plan are accepted.

## Assertions

For any approved child slice:

- No direct advice copy appears: `buy now`, `sell now`, `must buy`, `must sell`, `guaranteed`, `profit target`, `price target`.
- Section labels use research-support language.
- Directional market evidence is not presented as universal success/error.
- Missing or unsupported evidence remains visible as limited/not-ready, not hidden behind green status.
- Copy changes preserve documented strategy, trigger, exit, invalidation, and data-quality semantics.

## Candidate Focused Commands

Backend Copilot copy assertions if Copilot is selected:

```powershell
cd backend
npm.cmd test -- ai-investment-copilot.service.test.ts --runInBand
```

Research Hub UI smoke if Research Hub is selected:

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

Copilot UI smoke if Copilot UI is selected:

```powershell
cd frontend
npm.cmd run test:ui -- ai-investment-copilot.spec.ts --workers=1
```

## Excluded By Default

- Broad `npm test` without file filters.
- Playwright before UI scope approval.
- Dev servers before memory/resource check.
- Provider/live-data/startup/backfill flows.
- Prisma commands.
- Package install/update commands.
- External AI, paid/cloud, telemetry, broker, or real-money flows.

## Evidence Required Later

- Exact changed copy list.
- Focused test or UI assertion output.
- Screenshots or Playwright evidence for changed UI states where approved.
- Skipped checks with reason and next owner.

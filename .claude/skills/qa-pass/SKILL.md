---
name: qa-pass
description: Run the project QA gate - typecheck (backend + frontend), backend jest, frontend playwright (qa config, auth-state reuse) - and report a structured pass/fail table. Use before declaring work done, before commits, or when asked to verify the build is healthy. Accepts an optional scope argument to limit playwright specs.
---

# QA Pass

Run the real gates. Never claim a pass without executing the command; report failures verbatim.

## Gates (in order — continue through later gates even if an earlier one fails, so the report is complete)

1. **Backend typecheck**: in `backend/`: `npx tsc --noEmit`
2. **Frontend typecheck**: in `frontend/`: `npx tsc --noEmit`
3. **Frontend lint**: in `frontend/`: `npm run lint`
4. **Backend unit tests**: in `backend/`: `npm test` — scope with `npx jest <path>` when the change is module-local (say so in the report).
5. **UI smoke (playwright)**: in `frontend/`: `npx playwright test --config playwright.qa.config.ts <spec>` —
   - **One spec file per invocation** (chunked-run convention; 8-min global timeout per spec file).
   - Auth-state reuse is automatic via global-setup (`tests/ui/support/.auth-state.json`). NEVER write tests/steps that log in repeatedly — `/auth/login` is rate-limited to 10 per 15 min.
   - Choose spec files matching the modules touched (module-named specs under `tests/ui/`). If args specify a scope, honor it. Full-suite runs only when explicitly requested.
   - Frontend (5173) and backend (3000) must be up — run `/stack-up` first if needed.

Note: backend typecheck may carry pre-existing god-file type debt. Distinguish **new** errors (introduced by the current change) from pre-existing ones — diff against `git stash` state or check whether errored files were touched. Report both counts; only new errors fail the gate.

## Output

| Gate | Command | Result | Notes |
|---|---|---|---|

…followed by verbatim failure excerpts for anything red, and an explicit list of what was NOT run and why (e.g. "playwright limited to earnings spec — only earnings module changed").

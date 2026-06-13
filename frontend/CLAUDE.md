# frontend/CLAUDE.md

React 19 + React Router 7 + MUI 6 + Zustand + Recharts + Axios + Emotion, built with Vite.

## Rules

- **Persisted-read**: trader-facing pages render from persisted snapshots/DB reads only. No live provider fetch on page load. Refresh is an explicit user action wired to backend pipeline commands.
- **UX before UI**: design flows/states/copy before implementing — `docs/agents/ux-standards.md` and `docs/ux-ui-best-practices.md`.
- Research-support language in all UI copy (no advice wording, no jargon like "Persisted-read / OHLCV" in user-facing subtitles).

## Dev & test

- Dev: `npm run dev` (5173). UX-variant instances on 5181–5183 via `.claude/launch.json`.
- Lint: `npm run lint` (ESLint). Typecheck: `npx tsc --noEmit`.
- UI tests (QA standard): `npx playwright test --config playwright.qa.config.ts`
  - Auth-state reuse: global-setup logs in once via API, persists `tests/ui/support/.auth-state.json` (login is rate-limited to 10/15min — never log in per-test).
  - Chunked-run convention: one spec file per invocation; module scenarios live in module-named spec files; shared setup/assertions under `tests/ui/support/`.
  - No bulk imports/provider syncs/full-universe calculations in the smoke suite (`docs/agents/testing-and-quality.md`).

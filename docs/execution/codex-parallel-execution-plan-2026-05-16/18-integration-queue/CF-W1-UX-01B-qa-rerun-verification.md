# CF-W1-UX-01B QA Rerun Verification

Date: 2026-05-26

Work item: `CF-W1-UX-01B - Stock Research Workbench trust evidence contract`

Owner: Team 04 - QA Factory

Verdict: `ACCEPT`

Scope:

- Branch: `codex/team08-ux-research/CF-W1-UX-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-UX-01B`

Result:

- Verified the Team 10 rejection is fixed.
- The Workbench page no longer synthesizes `trust_evidence` from legacy `trust` when backend `trust_evidence` is absent.
- Missing backend `trust_evidence` now fails closed with unavailable/unknown evidence values, visible backend-unavailable reasons, and blocked Signal/Strategy widgets.
- Backend-provided `trust_evidence` paths still pass for verified limited context, unsupported scope, scope mismatch, and unavailable latest-evidence cases.
- Rework stayed inside the allowed rejection-fix files for this pass: Workbench page, focused Playwright spec, and handoff/outbox docs.
- No forbidden route/navigation/shared/upstream/schema/generated/package/provider/startup/scheduler files were dirty.

Validation:

- Memory gate: `81.67%`.
- `cd frontend && npm.cmd run build`: pass.
- `cd frontend && $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'; npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1`: pass after escalated rerun, `5` tests.
- Workbench frontend/test language guard: no matches.
- Legacy trust-evidence synthesis guard: no matches.
- `git diff --check` on allowed rework files: pass with LF/CRLF warnings only.

Residual risks:

- Playwright needs escalation in this environment because sandbox cleanup of `frontend/test-results/.last-run.json` can fail with `EPERM`.
- Frontend build still reports the existing Vite chunk-size warning.

Next gate:

- Team 10 rereview.

# CF-W2-SPL-02 Code Review

Date: 2026-05-26
Owner: Team 10 - Review / Release
Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-02`
Branch: `codex/team06-strategy-signal/CF-W2-SPL-02`

## Verdict

`ACCEPT`

Team 10 rereview accepts the Team 06 rework. Team 03 Architect Signoff may proceed.

## Rereview Scope

1. Confirm the previous high finding is fixed: stale prior-scope totals/page-derived counts do not render under a newly selected scope while scoped data is loading.
2. Confirm the previous medium finding is fixed: QA evidence and UI smoke explicitly cover active loading and active error states.
3. Confirm the rework stayed inside the allowed frontend rework files plus assigned docs.
4. Confirm no forbidden widening was added into backend source/tests/routes beyond the already accepted slice, route/navigation beyond the already accepted slice, other features, shared UI/context, schema/generated/package/provider/startup/scheduler scope, or Closed History API/data/detail scope.
5. Confirm research-support language and release readiness remain acceptable.

## Findings

No blocking findings in this rereview pass.

## Previous Rejection Closure

- High finding fixed: the active hook now guards scope transitions with request versioning and scoped-data projection, and the summary strip renders a scoped loading state instead of prior-scope totals while a new scoped response is pending.
- Medium finding fixed: the UI smoke now explicitly covers active loading and active error states, including scoped error copy, visible retry control, and absence of fallback rows.
- The rerun stayed inside the bounded SPL-02 file set and did not widen into schema, generated files, package manifests, shared UI/context, provider/live/startup/scheduler files, or Closed History API/data/detail scope.

## Validation Evidence Reviewed

Reviewed Team 06 and Team 04 evidence for:

- backend focused tests: `npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand`
- backend build: `npm.cmd run build`
- frontend build: `npm.cmd run build`
- Playwright smoke rerun: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5181 npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1`
- language guard and `git diff --check`
- memory checks recorded below the `AGENTS.md` threshold before heavy commands

Team 10 did not rerun heavy builds/tests because Team 04 rerun evidence covered the rejected behavior and the rereview outcome turned on bounded code inspection plus QA evidence sufficiency.

## Residual Risks

- The active loading/error smoke remains mock-backed rather than a live backend-fed browser flow in this pass.
- Local port contention remains an environment risk for future Playwright reruns; explicit `PLAYWRIGHT_BASE_URL` should continue to be recorded.
- Frontend build still emits the pre-existing Vite large-chunk warning.

## Next Gate

`ACCEPT` for Team 10 rereview. Team 03 Architect Signoff may proceed.

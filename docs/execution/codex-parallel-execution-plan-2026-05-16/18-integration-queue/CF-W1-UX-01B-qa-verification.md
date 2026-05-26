# CF-W1-UX-01B QA Verification

Date: 2026-05-26

Work item: `CF-W1-UX-01B - Stock Research Workbench trust evidence contract`

Verdict: `ACCEPT`

Owner: Team 04 - QA Factory

Branch/worktree:

- Branch: `codex/team08-ux-research/CF-W1-UX-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-UX-01B`

## Scope Verification

- Working tree edits stayed inside the allowed UX-01B file set plus allowed Team 08 reporting docs.
- No edits were present in route registries, navigation metadata, shared UI, shared context, upstream Market Data/Data Quality/Signal/Strategy modules, Prisma/schema/generated files, package manifests, providers, workers, or schedulers.
- `backend/tests/modules/stock-research-workbench/stock-research-workbench.routes.test.ts` remained unchanged. QA treated this as a handoff accuracy issue, not a scope violation.

## Acceptance Evidence

- `trust_evidence` is additive on both backend and frontend response types.
- Existing Workbench response fields remain present and unrenamed.
- Controller normalizes `region` and `assetType` locally through module validation.
- Frontend client sends `range`, `region`, and `assetType`.
- Page refetch dependency list includes `range`, `scope.region`, and `scope.assetType`.
- Backend and UI evidence covers `VERIFIED_MATCH`, `UNVERIFIED`, `MISMATCH`, `UNSUPPORTED`, and no-timestamp paths.
- Latest evidence timestamp is limited to page-owned timestamps and unavailable evidence remains `null` / `UNKNOWN`.
- Blocker and limitation reasons are rendered on the page trust surface.
- Downstream widget state is constrained to `LIMITED` or `BLOCKED`; blocked widgets are suppressed with page-owned reasons.
- Research-support language guard passed.

## Commands Run

- Memory check: `Get-Counter '\Memory\% Committed Bytes In Use'` -> `76.75%`
- Backend tests: `cd backend && npm.cmd test -- stock-research-workbench.service.test.ts stock-research-workbench.validation.test.ts stock-research-workbench.routes.test.ts --runInBand` -> pass, `3` suites / `13` tests
- Backend build: `cd backend && npm.cmd run build` -> pass
- Frontend build: `cd frontend && npm.cmd run build` -> pass
- Frontend UI smoke:
  - initial sandbox run failed with `EPERM` on Playwright artifact cleanup
  - rerun against `http://127.0.0.1:5173` failed because that server was not serving the assigned worktree build
  - dedicated worktree server on `http://127.0.0.1:5174`
  - `cd frontend && $env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'; npm.cmd run test:ui -- stock-research-workbench.spec.ts --workers=1` -> pass, `4` tests
- Language guard: no matches for banned advice/target/guarantee wording.
- Diff hygiene: `git diff --check` -> pass with line-ending warnings only.

## Skipped Checks

- None from the requested QA set.

## Residual Risks

- Playwright requires escalated execution in this environment and needed a dedicated worktree frontend server on port `5174`.
- Frontend build still emits the pre-existing Vite chunk-size warning.
- `latest_evidence_timestamp` remains page-owned evidence only, not a cross-module trusted review-through date.

## Recommendation

Team 10 review can proceed.

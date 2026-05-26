# CF-W1-UX-01B Code Review Rerun

Date: 2026-05-26

Reviewer: Team 10 - Review / Release

Work item: `CF-W1-UX-01B - Stock Research Workbench trust evidence contract`

Verdict: `ACCEPT`

Scope:

- Branch: `codex/team08-ux-research/CF-W1-UX-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team08-CF-W1-UX-01B`

Findings:

- Prior rejection is fixed.
- `StockResearchWorkbenchPage.tsx` uses backend `data.trust_evidence` when present and otherwise falls back only to an explicit fail-closed missing-evidence object.
- The prior synthetic legacy-trust path was removed.
- Missing backend `trust_evidence` now fails closed with unverified/unavailable/unknown evidence values, visible backend-unavailable reasons, and blocked Signal/Strategy widget states.
- Focused Playwright coverage exists for missing `trust_evidence` fail-closed behavior and preserved backend-owned verified/unsupported/mismatch/unavailable-latest-evidence paths.

Scope confirmation:

- Dirty application/test scope remains bounded to the accepted UX-01B slice:
  - `backend/src/modules/stock-research-workbench/**`
  - `backend/tests/modules/stock-research-workbench/**`
  - `frontend/src/features/stock-research-workbench/**`
  - `frontend/tests/ui/stock-research-workbench.spec.ts`
- No route registries, navigation metadata, shared UI/context, upstream Market Data/Data Quality/Signal/Strategy modules, Prisma/schema/generated files, package manifests, providers, startup, or scheduler paths were changed.

QA evidence sufficiency:

- Sufficient for rereview acceptance.
- Earlier Team 04 QA covered the broader UX-01B contract.
- Team 04 QA rerun covered the rejection fix and preserved backend-provided trust-evidence scenarios after rework.

Residual risks:

- Playwright still requires escalated execution in this environment.
- Frontend build still emits the pre-existing Vite chunk-size warning.
- Product Owner acceptance and later scoped staging/commit evidence remain required before release.

Architect signoff:

- `CAN PROCEED`.

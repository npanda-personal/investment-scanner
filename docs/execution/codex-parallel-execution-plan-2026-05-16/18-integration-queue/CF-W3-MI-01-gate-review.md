# Gate Review: CF-W3-MI-01 User-Facing Market Intelligence

Date: 2026-05-29
Owner: Team 00 Orchestrator
State: Accepted with conditions

## Scope Reviewed

- Frontend Market Intelligence feature and routes.
- Trader/admin navigation segregation.
- Today Review and Instrument Workspace user-facing production-control cleanup.
- Research Hub drilldown route changes.
- Signal Position Ledger removal from primary trader nav.
- Active execution docs copied from temporary `docs/codex-agent-team-plan/` artifacts.

## Validation

- `frontend`: `npm.cmd run build` passed during Team 00 gate review.
- Existing QA evidence records focused Playwright smoke: 11 passed.
- `git diff --check` passed with line-ending warnings only.
- Lint remains blocked by missing ESLint 9 flat config.

## Product Owner Gate

Result: ACCEPT WITH CONDITIONS

Accepted:

- Direction fits trader/investor product value.
- Pages are acceptable when they honestly show missing evidence instead of fake data.
- No direct financial advice/target-price framing identified in reviewed scope.

Conditions:

- Active execution docs must be the source of record.
- Replace developer-facing terms such as `not wired yet`, `read model`, `endpoint`, and snapshot class names in trader-facing copy.
- Clarify that `/admin/*` is a localhost operator organization layer, not access control.

## QA Gate

Result: ACCEPT WITH CONDITIONS

Accepted:

- Frontend-only, nav-focused scope is reasonable.
- Main risks are covered by focused smoke evidence.
- No backend/schema/package changes were found.

Conditions:

- Add route-load/empty-state smoke coverage for `/indices`, `/breadth`, `/institutional-flow`, `/derivatives-context`, and `/market-map`.
- Explicitly assert Signal Position Ledger is absent from trader nav and present under `/admin/signal-position-ledger`.
- Keep lint recorded as a tooling blocker until ESLint config is fixed.

## Architect Gate

Result: ACCEPT WITH CONDITIONS

Accepted:

- Frontend-only route/nav segregation is structurally sound.
- Persisted-only Market Pulse stance is correct.
- Legacy direct operator routes may remain mounted for compatibility in this slice.

Conditions:

- Active execution docs must mirror/revalidate historical docs.
- Shared frontend control file reservations must be recorded.

## Team 00 Reconciliation

Completed:

- Active execution docs created under `03-architecture`, `04-qa`, `05-ux`, `10-requirements`, and `18-integration-queue`.
- Active architecture doc records shared file reservations and admin-route compatibility policy.
- Active requirement doc records `/admin/*` as operator organization only, not authorization.
- Active QA evidence records build re-run and remaining QA coverage gaps.

Still open before final clean acceptance:

- User-facing copy cleanup for implementation-oriented placeholder wording.
- Additional Playwright route smoke coverage for the remaining new pages.
- Lint tooling blocker remains outside this slice.

## Historical Duplicate Note

The temporary untracked files under `docs/codex-agent-team-plan/` could not be removed due filesystem access denial. They are not the active source of record and should not be staged for this work item.

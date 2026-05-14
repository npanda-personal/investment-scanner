# UX-01 Shell Navigation GitHub Check-In

## Release State

Status: released.

## Branch And Remote

- Branch: `dev`
- Remote: `origin`
- Implementation commit SHA: `309b158`
- Push status: pushed to `origin/dev`

## Scoped Files Committed

- `frontend/src/app/HomePage.tsx`
- `frontend/src/app/NavigationLayout.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/stock-research-workbench/components/StockResearchWorkbenchPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/trade-plan-risk-engine/components/TradePlanDetail.tsx`
- `docs/codex-agent-team-plan/architecture-contracts/2026-05-14-ux01-shell-navigation-architecture.md`
- `docs/codex-agent-team-plan/qa-plans/2026-05-14-ux01-shell-navigation-qa-plan.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-14-ux01-shell-navigation-qa-evidence.md`
- `docs/codex-agent-team-plan/lead-validation/2026-05-14-ux01-shell-navigation-lead-validation.md`
- `docs/codex-agent-team-plan/architecture-signoff/2026-05-14-ux01-shell-navigation-architect-signoff.md`
- `docs/codex-agent-team-plan/po-acceptance/2026-05-14-ux01-shell-navigation-po-acceptance.md`
- `docs/codex-agent-team-plan/active-work-board.md`

## Scoped Staging

Confirmed. Only UX-01 implementation files and accepted UX-01 planning, QA, validation, signoff, PO acceptance, and board artifacts were staged.

## Unsafe Or Unaccepted Files Excluded

Confirmed. P0.1A backend implementation files, P0.1A QA artifacts, unrelated backlog items, secrets, `.env` files, generated artifacts, and unaccepted future work were excluded from this UX-01 check-in.

## Verification Evidence

- Frontend build: passed after implementation.
- Frontend build: passed again after QA rejection revision.
- UX-01 QA: passed after re-verification.
- Lead validation: passed.
- Architect signoff: passed.
- Lead PO acceptance: accepted.
- `git diff --cached --check`: passed before commit.
- CI status/link: not available locally.

## Rollback Notes

Rollback command if needed:

```powershell
git revert 309b158
git push origin dev
```

Rollback impact: restores prior module-first shell navigation, older home launch cards, and prior detail-page back labels/targets. No backend, database, or schema rollback is required.

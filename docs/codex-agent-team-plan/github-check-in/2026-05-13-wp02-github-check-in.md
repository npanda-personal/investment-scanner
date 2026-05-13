# GitHub Check-In - WP-2026-05-13-02

## Requirement

- Work item: `WP-2026-05-13-02 - Signal Outcome Maturity And Evaluable Coverage`
- Branch: `dev`
- Remote: `origin`
- Check-in owner: Senior Fullstack Lead / Orchestrator
- PO decision: `ACCEPT`

## Gate Evidence

- QA signoff: passed.
- Post-QA Lead validation: passed.
- Architect signoff: passed.
- PO acceptance: accepted for personal/local research use.

## Scoped Files For Commit

- `backend/src/modules/signal-quality-lab/*`
- `backend/tests/modules/signal-quality-lab/*`
- `frontend/src/features/signal-quality-lab/*`
- `frontend/tests/ui/signal-quality-lab.spec.ts`
- This check-in evidence file.

## Exclusion Confirmation

- WP-01 files are excluded from this WP-02 commit and handled in a separate accepted-requirement commit.
- Rejected WP-04A Research Hub revision work is excluded.
- Rejected WP-03A Signal Calibration revision work is excluded.
- In-progress WP-05A Trade Plan work is excluded.
- Secrets, `.env` files, database dumps, generated artifacts, package manifests, Prisma schema changes, and unrelated local changes are excluded.

## Validation Summary

- QA recorded focused backend tests, backend build, frontend build, UI smoke, and authenticated live API checks for `20D` and `5D` horizons.
- `20D` live evidence remained `UNAVAILABLE` with zero evaluated samples, while `5D` remained separated as `LIMITED`.
- No new paid library, paid data provider, paid AI service, hosted paid testing service, broker API, or paid hosted dependency was introduced.

## Rollback Notes

Rollback by reverting the WP-02 commit. This removes the additive selected-horizon maturity diagnostics, evidence-usability contract, horizon availability display, and related UI/test coverage. Existing pre-WP-02 Signal Quality behavior should remain recoverable because no Prisma schema migration or package change is part of this check-in.

## Remote Evidence

- Commit SHA: `f771644`
- Pushed remote: `origin`
- Pushed branch: `dev`
- Push result: `207766a..f771644  dev -> dev`
- CI status/link: not available in the local execution context at check-in time.

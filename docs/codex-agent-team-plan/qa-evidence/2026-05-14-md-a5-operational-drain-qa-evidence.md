# MD-A5 Operational Drain QA Evidence - 2026-05-14

Mode: QA Verification Mode
Owner: Senior Fullstack Lead / Orchestrator acting as runtime QA recorder
Scope: `IN / STOCK`
Related operation report: [MD-A5 Operational Drain Report](../operations/2026-05-14-md-a5-operational-drain-report.md)
Status: `Rejected / Blocked`

## Verdict

P0.1C is not signed off.

The operational drain did not proceed because the pre-drain local API paths were too slow and memory crossed the cleanup gate. This is a release blocker for trusted Market Data drain execution.

## Evidence Captured

- Backend health passed on `http://127.0.0.1:3000/health`.
- Frontend stayed stopped.
- No mutating repair-run was executed.
- Repair-plan/readiness snapshot completed in about `47.9s`.
- Dry-run `BACKFILL_PRICES` repair-run completed in about `43.9s`.
- Dry-run `VALIDATE_PROVIDERS` repair-run completed in about `43.5s`.
- Memory rose to `97.89%`; backend was stopped.
- Memory dropped to `89.18%` after cleanup.

## Acceptance Criteria Result

| Criterion | Result | Notes |
|---|---|---|
| App backend locally accessible | Pass | `/health` passed before cleanup. |
| Pre-drain repair-plan evidence captured | Pass with concern | Counts captured, but runtime was too slow. |
| Bounded operational drain improves trusted-data counts | Not run | Blocked before mutation. |
| No unbounded/heavy job runs under memory pressure | Pass | Backend was stopped when memory crossed the gate. |
| Evidence supports PO/Architect signoff | Fail | Performance and resource behavior must be fixed or explicitly bounded before signoff. |

## Rejection Reasons

1. Local Market Data summary/dry-run paths are too slow before any provider-heavy mutation starts.
2. Memory crossed the 95% hard gate during pre-drain verification.
3. `supportedPriceBackfillNeeded=2671` makes the sequential price-backfill executor a likely drain bottleneck.
4. P0.1C has no trusted-universe improvement evidence yet because mutation was correctly skipped.

## Required Next Iteration

Responsible owner: Senior Fullstack Lead / Orchestrator to route to Market Data backend developer after Architect review.

Next iteration must:

- explain and reduce the read-only `repair-plan`, `review-readiness-summary`, and dry-run `repair-run` runtime;
- determine whether `backfillPrices` needs bounded parallel workers;
- preserve free/public data-source policy and no paid provider usage;
- run focused backend tests before QA;
- rerun P0.1C with before/after counts only after memory is below 90%.


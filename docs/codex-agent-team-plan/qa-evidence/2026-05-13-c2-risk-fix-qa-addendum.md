# Cycle 2 Risk-Fix QA Addendum

Date: 2026-05-13  
QA agent: QA Addendum Agent  
Mode: static code/test review only  
Decision: `Static blockers resolved; superseded by final runtime QA signoff`

## Sources Reviewed

- `docs/codex-agent-team-plan/developer-handoffs/2026-05-13-c2-runtime-risk-fixes.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-c2-wp01-qa-evidence.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-c2-wp02-qa-evidence.md`
- `docs/codex-agent-team-plan/qa-evidence/2026-05-13-c2-wp04-qa-evidence.md`
- Market Data lane-click risk fix in `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- Signal Quality model-version fix in backend/frontend Signal Quality source and focused tests
- Today Review `SIGNAL_MATURITY` / `CALIBRATION` summary fix in backend service and focused tests

QA did not start local servers, npm, Playwright, Docker, or browser processes.

## Static Blocker Review

| Item | Prior static blocker | Static addendum result | Evidence |
| --- | --- | --- | --- |
| C2-WP-01 Market Data lane-click scope risk | Workbench displayed lane-scoped `IN / STOCK` requests, but lane buttons called `runRepair(action)` using page/global scope. | Resolved by code review. | Workbench lane buttons now call `runRepair(action, lane.nextAction.request)`. `runRepair` prioritizes the bounded request's `region`, `assetType`, `batchSize`, `offset`, and retry queue before falling back to page scope. Generic repair buttons still use the page/global path. |
| C2-WP-02 Signal Quality model-version filter/group gap | Signal Quality did not expose or propagate `modelVersion`, leaving the Signal Generation audit acceptance scenario unproven statically. | Resolved by code review. | Backend query and recalculation parsing/types accept sanitized `modelVersion`; dashboard/history/outcome/recalculation service paths pass it to Signal Generation history/count queries. Frontend filters include "Model version", include it in active filters, reload dashboard on changes, pass it to instrument history/outcomes, and include it in recalculation requests. Focused backend/UI tests assert parsing, service propagation, dashboard request propagation, and recalculation payload propagation. |
| C2-WP-04 Today Review run-level summary categories | Static review did not find explicit run-level aggregation for `SIGNAL_MATURITY` or `CALIBRATION`. | Resolved by code review. | Candidate explainability maps signal-related watch/blocker text to `SIGNAL_MATURITY` and calibration-related text to `CALIBRATION`. Run explainability now iterates candidate blockers/watch reasons and adds those two categories into `exclusionSummaries`. Focused service test asserts both `SIGNAL_MATURITY` and `CALIBRATION` summary entries. |

No remaining static defect was identified in the reviewed risk-fix scope. No QA rejection is issued against an implementation owner from this addendum.

## Runtime Evidence Completion

This addendum did not rerun runtime evidence, but the required runtime checks were completed later and are recorded in the final QA evidence files:

- [C2-WP-01 final QA evidence](2026-05-13-c2-wp01-qa-evidence.md)
- [C2-WP-02 final QA evidence](2026-05-13-c2-wp02-qa-evidence.md)
- [C2-WP-04 final QA evidence](2026-05-13-c2-wp04-qa-evidence.md)

## Addendum Decision

`Static blockers resolved; final runtime QA signoff completed later`

The three post-QA risk fixes satisfy the previously identified static blockers by code/test review. Final QA signoff for C2-WP-01, C2-WP-02, and C2-WP-04 is recorded in their final QA evidence files.

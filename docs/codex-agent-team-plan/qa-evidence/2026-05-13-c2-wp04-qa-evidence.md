# C2-WP-04 QA Evidence - Today Review Explainability And Exclusion Reasons

Date: 2026-05-13  
QA agent: QA Agent for C2-WP-04 / Orchestrator runtime lane  
Decision: `QA Signed Off`

## Runtime QA Signoff Addendum

Runtime evidence was completed after the earlier blocked review.

- Backend focused QA: Today Review backend passed, 2 suites / 29 tests.
- List UI smoke: `npx.cmd playwright test tests/ui/today-trade-review.spec.ts -g "deep link settles, no-run state offers manual run, and completed run shows grouped shortlist" --workers=1 --reporter=list --timeout=60000`
- List UI result: passed, 1 test.
- Detail UI smoke: `npx.cmd playwright test tests/ui/today-trade-review.spec.ts -g "candidate detail shows plan, invalidation, context, data quality, and proof panels" --workers=1 --reporter=list --timeout=60000`
- Detail UI result after selector revision: passed, 1 test.
- Runtime proof covers grouped shortlist, excluded examples, ranking components, reason categories, source labels, supporting evidence, Strategy proof, and Trade-plan proof-chain surfaces.
- Safety proof: rendered text scan assertion excludes `buy now`, `sell now`, `guaranteed`, `place order`, `execute order`, `live trade`, `financial advice`, and `execution`.

Final QA decision: `QA Signed Off`.

## Decision Summary

Static contract QA, backend validation, and focused runtime UI evidence are complete. The earlier runtime blocker was resolved by the Runtime QA Signoff Addendum above.

## Sources Reviewed

- [C2-WP-04 work packet](../work-packets/2026-05-13-cycle2-work-packets.md#c2-wp-04---today-review-explainability-and-exclusion-reasons)
- [Roadmap requirement 4](../po-roadmap-backlog-2026-05-13-cycle2.md#4-today-review-explainability-and-exclusion-reasons)
- [C2-WP-04 architecture contract](../architecture-contracts/2026-05-13-cycle2-architecture-contracts.md#c2-wp-04---today-review-explainability-and-exclusion-reasons)
- [C2-WP-04 QA plan](../qa-plans/2026-05-13-cycle2-qa-plan.md#c2-wp-04---today-review-explainability-and-exclusion-reasons)
- [Developer handoff](../developer-handoffs/2026-05-13-c2-wp04-developer-handoff.md)
- Changed Today Review files listed below.

## Changed Today Review Files Reviewed

- [backend/src/modules/today-trade-review/today-trade-review.types.ts](../../../backend/src/modules/today-trade-review/today-trade-review.types.ts)
- [backend/src/modules/today-trade-review/today-trade-review.service.ts](../../../backend/src/modules/today-trade-review/today-trade-review.service.ts)
- [backend/src/modules/today-trade-review/today-trade-review.repository.ts](../../../backend/src/modules/today-trade-review/today-trade-review.repository.ts)
- [backend/tests/modules/today-trade-review/today-trade-review.service.test.ts](../../../backend/tests/modules/today-trade-review/today-trade-review.service.test.ts)
- [frontend/src/features/today-trade-review/types.ts](../../../frontend/src/features/today-trade-review/types.ts)
- [frontend/src/features/today-trade-review/components/TodayReviewPage.tsx](../../../frontend/src/features/today-trade-review/components/TodayReviewPage.tsx)
- [frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx](../../../frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx)
- [frontend/tests/ui/today-trade-review.spec.ts](../../../frontend/tests/ui/today-trade-review.spec.ts)

## Acceptance Scenario Status

| Scenario | Status | Evidence | Gaps |
| --- | --- | --- | --- |
| Today Review summary shows excluded counts by readiness, data, signal maturity, calibration, strategy proof, trade-plan proof-chain, and outside-scope reasons. | `Pass` | DTO category vocabulary includes required categories in backend/frontend types. Service builds run-level exclusion summaries, including post-QA risk-fix aggregation for `SIGNAL_MATURITY` and `CALIBRATION`. UI renders exclusion count chips, summary chips, and excluded examples. | Focused list UI smoke passed. |
| Candidate detail shows ranking components, hard blockers, readiness state, signal evidence, calibration readiness, strategy proof, and trade-plan paper-readiness state. | `Static evidence present; runtime pending` | Candidate DTO has `rankingComponents`, `blockers`, and `upstreamEvidence`. Service populates readiness, signal, calibration, strategy proof, and trade-plan proof-chain evidence. Detail UI renders Ranking components, Reason categories, Strategy proof, Data quality, Trade plan, and Supporting evidence panels. | No passed browser/UI smoke for the detail route. |
| Promoted, watched, blocked, unproven, insufficient-data, and excluded rows expose reasons without optimistic fallback. | `Static/backend evidence present; runtime pending` | Service maps hard blockers to `BLOCKED`, missing data to `INSUFFICIENT_DATA`, missing/weak proof to `UNPROVEN`, and adds reason arrays. Backend tests cover `NO_REVIEW`, outside-trusted exclusions, promoted candidate explainability, hard trade-plan blockers, missing proof, and missing data quality. UI spec fixtures cover promoted, watch/unproven, blocked, and excluded example display. | Focused Playwright spec was interrupted and cannot be accepted as passed. |
| Excluded examples are inspectable but not promoted as actionable candidates. | `Static evidence present; runtime pending` | Service creates excluded examples with `promoted: false`; UI renders the Promotion column as `Not promoted`; UI spec asserts outside-trusted excluded example visibility and `Not promoted`. | Runtime UI smoke missing. |
| Today Review consumes public Trade Plan proof-chain and Calibration readiness outputs conservatively. | `Static/backend evidence present; runtime pending` | Service imports and calls public module services, not private repositories. Missing data/proof and hard trade-plan blockers downgrade state instead of promoting. Candidate evidence includes calibration and trade-plan proof-chain snapshots. | Runtime API evidence for latest/run/candidate detail was not collected in this QA pass due Orchestrator process constraints. |
| Language remains research-support only. | `Static evidence present; runtime pending` | UI spec includes prohibited wording assertions. Static text scan found no prohibited UI copy; hits were test assertions, fixture field names such as insider buy/sell counts, and module boundary documentation. | Needs passed UI smoke to confirm rendered copy. |

## Validation Already Available

Orchestrator supplied this integrated validation:

- Backend build: passed.
- Frontend build: passed, with Vite large chunk warning only.
- Prisma generate: passed.
- Focused backend integrated regression: passed, 7 suites / 146 tests.
- C2-WP-04 focused backend coverage includes `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`.

QA did not start local servers, npm, Playwright, Docker, or browser processes.

## Runtime Evidence Gap

Required but not available:

- Focused UI smoke for `frontend/tests/ui/today-trade-review.spec.ts`.
- Browser/runtime evidence that the Today Review list shows exclusion summaries, excluded examples, grouped counts, and warnings correctly.
- Browser/runtime evidence that candidate detail shows ranking components, source labels, hard blockers, calibration readiness, strategy proof, and trade-plan proof-chain state.
- API/manual evidence for `/api/v1/today-review/latest`, `/api/v1/today-review/runs/:id`, and `/api/v1/today-review/candidates/:id` representative explainability payloads.

Known blocker:

- Playwright UI smoke was interrupted during memory cleanup. Per Orchestrator instruction, this is not counted as passed.

Responsible owner for runtime blocker:

- Orchestrator / QA runtime validation owner to rerun or supply accepted focused UI/API evidence when process control permits.

Potential implementation coverage follow-up:

- If runtime/fixture evidence cannot demonstrate run-level `SIGNAL_MATURITY` and `CALIBRATION` exclusion summary categories, C2-WP-04 developer owns adding coverage or clarifying the intended count semantics with PO/Architecture.

## Scope And Safety Notes

- Reviewed C2-WP-04 Today Review implementation files stay within the packet's Today Review write scope.
- Current worktree also contains other Cycle 2 changes outside Today Review. Those are not attributed to C2-WP-04 in this QA evidence.
- No paid tools, hosted providers, broker APIs, order placement, live-trading workflow, or advice wording was identified in the reviewed C2-WP-04 UI/backend changes.

## Final QA Decision

`QA Signed Off`

The earlier runtime blocker is resolved by the Runtime QA Signoff Addendum above. C2-WP-04 is accepted for QA after Today Review backend tests, list UI smoke, candidate-detail UI smoke, and safety text assertions passed.

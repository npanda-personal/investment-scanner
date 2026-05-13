# Candidate 4 Discovery - Today Review Candidate Explainability And Exclusion Reasons

Date: 2026-05-13
Lane: Lane 3 Module Fullstack Developer
Mode: Discovery only

## Scope Reviewed

- Roadmap candidate: `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13.md`, Candidate 4.
- Current Top 5 packet dependencies: `docs/codex-agent-team-plan/work-packets/2026-05-13-top5-work-packets.md`, especially WP-01, WP-03A, and WP-05A.
- Today Review module docs/source/UI/tests, read-only:
  - `backend/src/modules/today-trade-review/*`
  - `backend/tests/modules/today-trade-review/*`
  - `frontend/src/features/today-trade-review/*`
  - `frontend/tests/ui/today-trade-review.spec.ts`

No source, test, architecture, active-board, or QA files were edited.

## Recommended Ownership

Owning module should be `today-trade-review`.

A new module is not needed for the first implementation. Candidate 4 is a presentation and snapshot contract on top of Today Review's existing daily run, candidate grouping, scan funnel, data readiness, strategy proof, trade plan, market gate, and source-snapshot behavior. The upstream modules should continue to own their own calculations:

- Market Data / Trusted Review owns review-universe readiness.
- Signal Quality and Signal Calibration own raw signal evidence and calibration readiness.
- Strategy Decision owns decision/proof source candidates.
- Trade Plan owns trade-plan readiness and paper proof chain.

Today Review should own the final research-only explanation of why a candidate was promoted, watched, blocked, avoided, or excluded from review for a specific run.

## Current Shape

Today Review already has useful primitives:

- `TodayReviewRunDto` includes candidate counts, warnings, data-through date, grouped candidates, and `scanFunnel`.
- `TodayReviewCandidateDto` includes state, grade, confidence score, reason summary, blockers, watch reasons, and snapshots for data quality, market context, strategy proof, trade plan, and source signal.
- `TodayReviewSourceSnapshot` already persists review readiness, review universe, scan funnel, market context/gate, raw signal universe, and generation time.
- Service logic already computes transparent scoring inputs and hard blocker/watch state, but the computed scoring components are mostly internal and not exposed as a structured DTO.
- Exclusions are currently mostly aggregate. `scanFunnel.topNoPromotionReasons`, trusted-universe counts, and strategy-candidate exclusion counts exist, but inspectable excluded examples are not modeled as a stable API/UI contract.

This means Candidate 4 can be additive if it exposes existing decisions and snapshots instead of recalculating upstream evidence.

## Proposed First Vertical Slice

Implement a Today Review-owned additive `explainability` contract for completed or partial runs.

Backend slice:

- Add candidate-level `explainability` to `TodayReviewCandidateDto`.
- Add run-level `exclusionSummary` and bounded `excludedExamples` to the run/source snapshot DTO, or under a run-level `explainability` wrapper if Architect prefers one namespace.
- Expose fixed, research-only reason categories:
  - `DATA_READINESS`
  - `SIGNAL_EVIDENCE`
  - `CALIBRATION_READINESS`
  - `STRATEGY_PROOF`
  - `TRADE_PLAN_READINESS`
  - `MARKET_GATE`
  - `RANKING_SCORE`
  - `TRUSTED_UNIVERSE`
- Expose status vocabulary conservatively:
  - `READY`
  - `LIMITED`
  - `INSUFFICIENT_DATA`
  - `BLOCKED`
  - `NOT_APPLICABLE`
- Include scoring components already described in Today Review docs, with capped points and source labels, without changing scoring behavior.
- Preserve hard-blocker precedence: hard blockers must keep confidence at zero and must not be overridden by positive proof/readiness reasons.
- Keep excluded examples bounded and non-promotional. Recommended first bound: top 10-20 examples by deterministic scan order/reason, with symbol, instrument id, reason category, message, source module, snapshot date, and no action/trading instruction.

Frontend slice:

- On Today Review list page, add a compact "Why this run looks this way" section using existing scan funnel counts, top no-promotion reasons, readiness state, and bounded excluded examples.
- On Today Review candidate detail, add a "Why this bucket" section that shows ranking components, blockers/watch reasons, readiness dimensions, and source snapshot timestamps.
- Excluded examples should be inspectable from the summary without being placed in promoted candidate tabs or counted as review candidates.
- Copy must remain research-only. Avoid buy/sell/execute/order-placement language.

Recommended persistence for the first slice:

- Prefer existing `TodayReviewRun.sourceSnapshot` JSON for bounded excluded examples and explainability snapshot metadata if the Architect accepts this as sufficient for auditability.
- Avoid a Prisma schema change in the first slice unless Architect requires queryable historical exclusions at scale.

## Exact Future Write Reservations

Minimum backend reservations:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`

Minimum frontend reservations:

- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/api/todayReviewApi.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/src/features/today-trade-review/index.tsx` only if new exports are needed.
- `frontend/tests/ui/today-trade-review.spec.ts`

Conditional reservations only if the Architect chooses normalized persistence or a separate endpoint:

- `prisma/schema.prisma`
- Today Review migration/generated Prisma artifacts
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`

Do not reserve or modify upstream module files for the first slice. Signal Quality, Signal Calibration, Strategy Decision, Trade Plan, Market Data, and shared route registries should stay read-only unless a later architecture packet explicitly assigns integration changes.

## Conflict Risks

- WP-01 currently overlaps the Today Review backend contract and module docs. Candidate 4 implementation should wait for WP-01 Lead/Architect signoff and a stable Today Review DTO/source-snapshot baseline before editing the same files.
- WP-05A is expected to change Trade Plan proof-chain language and DTO readiness fields. Candidate 4 should consume the final proof-chain output, not infer readiness from intermediate or private Trade Plan fields.
- WP-03A is expected to define Signal Calibration source guardrails/readiness. Candidate 4 should not label calibration evidence `READY` until the stable public calibration output exists.
- Frontend Today Review pages are likely to be touched by WP-01 and later integration work. Reserve page/component files before implementation and avoid parallel UI edits.
- If excluded examples are persisted in `sourceSnapshot`, payload size and retention policy need explicit bounds to prevent run snapshots from becoming a full universe dump.

## Dependencies On Current Gates

WP-01 - Today Review trusted/market-data readiness:

- Required before implementation because Candidate 4 must explain review-universe readiness, data-through state, scan funnel counts, and Trusted Review exclusions using the final WP-01 contract.
- Candidate 4 should not redefine review readiness or data completeness labels.

WP-03A - Signal Calibration readiness/source guardrails:

- Required before exposing calibration readiness as a first-class explanation dimension.
- If Candidate 4 starts before WP-03A is fully integrated, calibration should render as `INSUFFICIENT_DATA` or `NOT_APPLICABLE`, never `READY`.

WP-05A - Trade Plan proof-chain source funnel:

- Required before exposing `TRADE_PLAN_READINESS` or paper-readiness proof-chain details as stable evidence.
- Candidate 4 can display existing Trade Plan blockers/watch reasons conservatively, but should wait for WP-05A before claiming full paper-review readiness.

Secondary dependencies:

- Signal evidence usability work should define what raw signal evidence can support in Today Review.
- Research Hub actionability labels can inform copy consistency, but Today Review should remain the owner of daily review explanation.

## Architecture Questions

1. Should excluded examples live inside `TodayReviewRun.sourceSnapshot` JSON, or should they become a normalized persisted model?
2. What is the maximum number of excluded examples per run, and should the order be deterministic scan order, severity, confidence, or reason group?
3. Should excluded examples cover only detected setups that failed promotion, or also trusted instruments with no setup?
4. What is the canonical cross-module readiness status vocabulary for data, signal evidence, calibration, strategy proof, and trade plan?
5. Should ranking component labels/max points be duplicated in Today Review DTOs, or sourced from a single module-local constant used by docs/tests/UI?
6. For historical candidate detail, should the UI always display persisted run-time snapshots, or may it supplement with current upstream state?
7. How should WP-03A calibration guardrails map to Today Review: a readiness dimension, a ranking component, a blocker/watch reason, or all three?
8. How should WP-05A `paperReadinessProofChain` map to Today Review: trade-plan readiness only, or also candidate promotion eligibility?
9. Does the run-level explanation need user-specific authorization semantics, or is Today Review still a global authenticated research view?
10. Should there be a dedicated endpoint for excluded examples pagination, or is a bounded list in the latest/run response enough for the first slice?

## QA Implications And Suggested Evidence

Backend unit/controller evidence:

- Candidate explainability includes all expected dimensions and preserves persisted snapshots.
- Ranking components sum to the existing confidence score where applicable and hard blockers still force zero confidence.
- Missing upstream evidence maps to `LIMITED`, `INSUFFICIENT_DATA`, or `NOT_APPLICABLE`, not `READY`.
- Strategy candidates outside the trusted universe produce exclusion summary/examples without becoming review candidates.
- Lite no-setup/unproven/reward-risk-incomplete paths produce aggregate reasons and bounded examples without promotion.
- Existing candidate grouping and counts remain unchanged.

Frontend UI evidence:

- Latest/run page shows exclusion summary and bounded examples.
- Candidate detail shows "why this bucket" evidence for promoted, watch-only, blocked, unproven, and insufficient-data states.
- Excluded examples are visible but not included in promoted candidate tabs.
- Empty/partial runs still explain review readiness and missing upstream evidence without implying actionable readiness.
- Research-only language is preserved; no execution-oriented copy is introduced.

Pre-QA live/local-data evidence after implementation:

- Run or load an authenticated Today Review latest/run response with local data.
- Capture one candidate detail showing ranking components, readiness dimensions, blockers/watch reasons, and run-time source timestamps.
- Capture one run summary with top exclusion reasons and excluded examples.
- Verify counts match `scanFunnel` and candidate groups.
- Verify missing or unstable calibration/trade-plan/signal evidence displays as `LIMITED`, `INSUFFICIENT_DATA`, or `NOT_APPLICABLE`.

## Recommendation

Proceed only after WP-01 stabilizes the Today Review readiness/source-snapshot contract. The first implementation should be conservative and additive within `today-trade-review`, using existing snapshots and bounded source-snapshot examples. Full calibration and paper-readiness claims should wait for WP-03A and WP-05A stable public outputs; until then those dimensions should be displayed conservatively as insufficient, limited, or not applicable.

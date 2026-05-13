# Phase 0 Product Briefs - Trusted Data Baseline And Data Quality Use-Case Tiers

Date: 2026-05-14
Mode: Product Planning Mode
Owner: Lead Product Owner
Work item: Convert the Lead PO autonomous strategy roadmap into the first implementable Phase 0 product briefs
Owned artifact: `docs/codex-agent-team-plan/po-briefs/2026-05-14-phase0-trusted-data-and-dq-product-briefs.md`

## Sources Read

- `docs/codex-agent-team-plan/po-roadmaps/2026-05-14-lead-po-autonomous-strategy-roadmap.md`
- `docs/codex-agent-team-plan/po-roadmaps/2026-05-14-associate-po-data-foundation-roadmap.md`
- `docs/codex-agent-team-plan/active-work-board.md`
- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle3-top5.md`
- `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle3-top5-po-review.md`
- `docs/codex-agent-team-plan/po-briefs/2026-05-13-md-a5-15-year-history-and-free-source-fallback-product-brief.md`
- `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-data-availability-audit.md`
- `docs/codex-agent-team-plan/po-audits/2026-05-13-market-data-full-module-po-audit.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `frontend/src/features/data-quality-engine/types.ts`

## 1. Lead PO Product Decision

Phase 0 stays where the roadmap says it must stay: trusted `IN / STOCK` data first, then clearer Data Quality trust by use case. The app is not yet blocked by lack of another research surface. It is blocked by the fact that the user still cannot safely assume the local stock universe is current, deep, fallback-backed, and consistently classified for downstream use.

These briefs convert the roadmap direction into the first two intake-ready requirements:

1. `P0.1 Trusted IN / STOCK data baseline`
2. `P0.2 Data Quality use-case tiers`

P0.1 is first priority. P0.2 is next priority and must consume the stable public Market Data contracts produced or confirmed by P0.1 rather than reintroducing independent heuristics.

## 2. Priority And Sequencing

| Priority | Brief | Recommended owner lane | Intake recommendation |
|---|---|---|---|
| P0.1 | Trusted `IN / STOCK` data baseline | Data Foundation | `READY_FOR_ORCHESTRATOR` |
| P0.2 | Data Quality use-case tiers | Data Foundation / Data Quality | `READY_FOR_ORCHESTRATOR_WITH_P0_1_DEPENDENCY_DECLARED` |

Sequencing rule:

- Orchestrator should intake P0.1 first.
- P0.2 can be refined and packetized immediately, but implementation must consume the public Market Data baseline fields rather than invent parallel trust math.

## 3. Brief P0.1 - Trusted `IN / STOCK` Data Baseline

### Product decision

P0.1 defines the first Phase 0 unlock: the local `IN / STOCK` universe must become durably trustworthy enough to support at least `LIMITED_REVIEW`, with a clear path to `FULL_REVIEW`, without relying on paid providers or downstream gate relaxation.

This brief absorbs the remaining trusted-data intent already visible across C2-WP-01, MD-A3, MD-A4, and MD-A5 into one roadmap-aligned intake requirement. The point is not to duplicate accepted work. The point is to finish the baseline so downstream strategy, review, and later automation work can rely on it.

### User value

For the user, this brief answers a basic product question that is still not fully solved: "Can I trust the app's local Indian stock universe before I trust anything built on top of it?"

User value delivered by P0.1:

- The app can prove which active stocks are actually usable for review, not just present in the catalog.
- Missing depth, stale EOD, provider ambiguity, identity ambiguity, and fallback-required rows become explicit operational states instead of hidden universe shrinkage.
- Today Review, Strategy Decision, Data Quality, Signal Quality, and later backtests can consume an honest baseline instead of compensating for weak data.
- The user can see whether a stock is complete, incomplete, fallback-blocked, identity-blocked, listing-date-blocked, retry-blocked, or manual-review-required.

### Scope

Scope is limited to active `region=IN` and `assetType=STOCK` rows.

The trusted baseline includes:

- latest completed EOD freshness,
- required daily OHLCV depth,
- 15-year-or-listing-date coverage policy,
- provider support classification,
- official/public free fallback requirement when Yahoo is insufficient,
- durable residual-state classification for every active stock,
- truthful Trusted Review Universe counts and review mode.

### Acceptance criteria

#### P0 - Durable trusted-review minimum

- `GET /api/v1/market-data/review-universe?region=IN&assetType=STOCK` reaches a durable non-zero trusted membership and then the target `LIMITED_REVIEW` threshold using stored local data, not relaxed gates.
- `reviewMode` moves from `NO_REVIEW` to at least durable `LIMITED_REVIEW` for the scoped universe before this brief is considered complete.
- Today Review remains fail-closed when trusted membership is unavailable or drops below the published mode requirements.

#### P0 - Every active stock ends in an explicit trusted-data state

Every active scoped stock must be classifiable into an explicit product state such as:

- trusted and review-eligible,
- complete but not yet trusted for review,
- fallback needed,
- incomplete after approved free fallback,
- listing-date repair required,
- symbol or exchange identity repair required,
- retry-blocked source/provider state,
- manual-review required,
- unsupported or inactive/delisted.

Counts for these states must be visible in health, repair, or equivalent operator evidence rather than living only in row-by-row diagnostics.

#### P0 - History depth is honest

- The required history window for each active stock is 15 years of daily OHLCV through the latest completed EOD, or listing-date-through-latest-completed-EOD when the listing is newer and the listing date is proven.
- Missing listing date cannot silently reduce the required history window.
- Shallow history cannot increase trusted-review counts.
- Coverage must be measured against completed trading sessions, not calendar-day approximations and not in-progress candles.

#### P0 - Yahoo insufficiency is not treated as final

- If Yahoo is shallow, missing, throttled, or incomplete for an active `IN / STOCK` row, the product must expose a free official/public fallback-needed state before the row can be accepted as incomplete.
- Approved public-source fallback evidence must remain visible in repair or coverage outputs.
- Paid providers, commercial free-tier substitutes, broker APIs, and hosted paid services remain out of scope.

#### P0 - Trusted baseline does not collapse counts into false optimism

- Catalog count, provider-supported count, and trusted-review count remain separate in user-facing and operator-facing outputs.
- Trusted-review counts must not rise solely because a stock was cataloged, provider-validated, or partially backfilled.
- Missing recent volume, stale latest completed EOD, incomplete required history, and unresolved identity ambiguity remain blockers for trusted review.

#### P1 - Baseline is operationally supportable

- Repair or run evidence must stay bounded, resumable or repeatable, and visible enough for a local operator to understand what moved and what is still blocked.
- Residual blockers must remain classified instead of being folded into generic failure text.
- The next bounded action for trusted-data repair must remain explicit when the baseline is still partial.

### Assumptions

- Existing Market Data Foundation contracts for review readiness, repair planning, trusted universe counts, history coverage, and fallback evidence remain the source of truth.
- Earlier accepted work on provider validation, price backfill, trusted-universe repair, and history/fallback diagnostics is treated as predecessor work, not discarded work.
- The product standard for this phase is daily EOD trust for personal local research and review. It is not intraday trading readiness.

### Dependencies

- Released or accepted upstream work in Market Data Foundation, especially C2-WP-01, MD-A3, MD-A4, and MD-A5-related trusted-data evidence.
- Stable public health and review-universe outputs from Market Data Foundation.
- Existing bounded repair lanes for provider validation, identity repair, metadata repair, and price backfill.
- Listing-date and identity evidence good enough to separate true young listings from missing-history errors.

### Non-goals

- No downstream strategy, screener, review, trade-plan, or portfolio gate relaxation to make counts look better.
- No paid provider introduction.
- No broker, live-trading, paper-trading, or automation authorization.
- No requirement to solve every historical corporate-action normalization issue beyond keeping provenance and blockers honest.
- No generic global-market expansion beyond scoped `IN / STOCK`.

### Orchestrator intake recommendation

Suggested packet title: `P0.1 - Trusted IN/STOCK Data Baseline`

Suggested implementation split direction:

1. baseline truth and residual-state classification,
2. trusted-review threshold drain and fallback evidence completion,
3. bounded operator evidence and residual blocker visibility.

Recommended intake status: `READY_FOR_ORCHESTRATOR`

## 4. Brief P0.2 - Data Quality Use-Case Tiers

### Product decision

P0.2 changes Data Quality from a mostly generic readiness scorer into an explicit trust contract by use case. Current Data Quality is useful but still too coarse: it mixes price count, stale-price heuristics, metadata presence, liquidity, and a few boolean eligibility flags. That is not enough for the roadmap's next phases.

The product rule for P0.2 is simple: "good enough for one workflow" must not imply "good enough for every workflow."

### User value

For the user, P0.2 makes the app answer a more practical question: "Good enough for what?"

User value delivered by P0.2:

- Daily review can proceed conservatively without pretending that the same stock is also ready for backtests or calibration.
- Signals, backtests, calibration, and later automation no longer inherit trust from one generic readiness score.
- Blockers become understandable: stale EOD, inadequate history, weak metadata context, missing recent volume, missing signal evidence, or incomplete trusted-history baseline can be assigned to the relevant use case.
- Later permission, strategy-proof, and execution phases gain a stable upstream trust vocabulary instead of re-implementing DQ logic in each module.

### Scope

Scope stays within Data Quality public outputs and the downstream use of those public outputs.

P0.2 must define separate statuses for at least these use cases:

- daily review readiness,
- signal readiness,
- backtest readiness,
- calibration readiness,
- automation readiness.

The brief also expects Data Quality to reflect historical-depth trust and freshness truth from Market Data Foundation rather than relying mainly on the current simple stale-day heuristic.

### Acceptance criteria

#### P0 - Separate readiness tiers exist and are visible

Data Quality outputs must expose distinct readiness states for:

- daily review,
- signal generation or signal consumption,
- backtesting,
- calibration,
- automation.

These tiers must not be derivable only from one shared numeric score. The user must be able to tell when one tier is acceptable and another is blocked, limited, unproven, or insufficient.

#### P0 - Data Quality consumes Market Data truth instead of shadow heuristics

- Data Quality must consume scoped Market Data freshness, trusted-review mode, required-history completeness, and related baseline-trust fields through public contracts.
- A simple "latest price older than 7 days" rule may remain as a supportive warning where appropriate, but it must not remain the primary source of trust for daily review, backtest, calibration, or automation readiness.
- In-progress current-day candles must not be treated as completed EOD proof.

#### P0 - Each tier has explicit blockers and reasons

For each use-case tier, Data Quality must be able to explain at least:

- price freshness blocker,
- inadequate history blocker,
- missing recent volume or liquidity blocker,
- missing metadata-context blocker where that context matters,
- missing signal evidence blocker where that evidence matters,
- incomplete trusted baseline blocker where the Market Data foundation is not yet trustworthy enough.

Reasons must stay additive and truthful. A higher-trust tier must never hide a lower-level blocker.

#### P0 - Downstream modules can consume the tiers without reinterpreting them

Public DTOs and user-facing summaries must support conservative downstream consumption by modules such as:

- Today Review,
- Research Hub,
- Strategy Decision,
- Signal Quality,
- Calibration,
- Backtesting,
- later trade-permission and execution-eligibility surfaces.

This brief does not decide architecture, but the product contract must be clear enough that downstream consumers do not invent conflicting readiness semantics.

#### P1 - Automation readiness stays hardest to earn

- Automation readiness must be a stricter trust tier than daily review, signal readiness, backtest readiness, or calibration readiness.
- A stock cannot be automation-ready from raw price coverage and liquidity alone.
- Missing trusted baseline, missing strategy proof, missing signal evidence, or missing higher-confidence trust inputs must keep automation readiness blocked or unavailable in Phase 0 terminology.

#### P1 - Current booleans and scores are not allowed to overclaim

- Existing fields such as generic signal-readiness score, `eligibleForBacktesting`, and `eligibleForCalibration` may remain as transitional evidence, but they must not overstate trust once tiered readiness is introduced.
- Data Quality summaries must clearly separate "ready for review" from "ready for history-sensitive analysis" and from "ready for any later execution-sensitive workflow."

### Assumptions

- Market Data Foundation remains the owner of freshness truth, required-history truth, and trusted-review baseline truth.
- Data Quality remains a conservative consumer of upstream truth and should not redefine trusted-universe thresholds on its own.
- Phase 0 does not require full strategy-proof, trade-permission, or broker-readiness integration to define the DQ tier contract, but it must leave room for those later phases.

### Dependencies

- P0.1 trusted baseline fields and stable public Market Data readiness outputs.
- Existing Data Quality diagnostics, list, and summary endpoints as the starting public surface.
- Stable naming for review-universe and history-completeness fields before downstream widespread adoption.

### Non-goals

- No architecture decision about exact persistence, DTO, or internal scoring implementation.
- No broker or live-execution eligibility.
- No strategy-proof redesign, calibration redesign, or trade-permission implementation inside this brief.
- No attempt to make every downstream module consume the new tiers in the same implementation slice.
- No paid data enrichment or external trust service.

### Orchestrator intake recommendation

Suggested packet title: `P0.2 - Data Quality Use-Case Tiers`

Suggested implementation split direction:

1. tier definitions and public-output contract,
2. Market Data truth consumption,
3. downstream read-only consumer adoption in the highest-value surfaces.

Recommended intake status: `READY_FOR_ORCHESTRATOR_WITH_P0_1_DEPENDENCY_DECLARED`

## 5. Existing Backlog Items That Remain Parked

The prior backlog remains parked unless it directly supports trusted data or Phase 0 Data Quality trust hardening.

The following existing backlog items remain parked after this brief set:

- `Evidence-Aware Advanced Screener`
- `Review Run History And Diff`
- `Portfolio And Watchlist Evidence Overlay`
- `Research Hub Readiness Wiring`
- `Strategy Decision Proof And Calibration Consumption`
- `Research Thesis And Evidence Checklist` / `C2-WP-05`
- Deferred candidates from the 2026-05-13 Cycle 3 proposal that do not directly advance trusted data or DQ trust, including local event-risk awareness, evidence deterioration alerts, and portfolio risk/exposure diagnostics

Parking rationale:

- They are downstream experience, explainability, overlay, or decision-surface work.
- They risk amplifying weak or partial trust if Phase 0 trusted data and DQ tiering are not stable first.
- The Lead PO roadmap explicitly parks previous backlog unless it supports trusted data, canonical trade permission, strategy-native math, side-aware proof, paper execution, or guarded broker preparation.

## 6. Final PO Handoff Summary

Status: `complete`

Priority summary:

1. `P0.1 Trusted IN/STOCK data baseline` is the first intake-ready Phase 0 requirement and remains the highest product priority.
2. `P0.2 Data Quality use-case tiers` is the second intake-ready Phase 0 requirement and should follow immediately behind P0.1 with the dependency on stable Market Data truth declared up front.

These briefs are ready for Orchestrator intake as the first implementable Phase 0 product requirements under the 2026-05-14 Lead PO roadmap direction.

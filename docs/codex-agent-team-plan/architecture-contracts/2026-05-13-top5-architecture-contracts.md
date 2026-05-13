# Top 5 Architecture Contracts - 2026-05-13

## Context Loaded

- Product brief source: `docs/codex-agent-team-plan/po-test-report-2026-05-13.md`.
- Global architecture/process sources: `docs/architecture.md`, `docs/AGENTS.md`, `docs/instructions.md`, `docs/codex-agent-team-plan/codex-agent-team.md`, `docs/codex-agent-team-plan/team-operating-model.md`, `docs/codex-agent-team-plan/sdlc-operating-model.md`, and `docs/codex-agent-team-plan/active-work-board.md`.
- Module docs inspected: Market Data Foundation, Data Quality Engine, Signal Quality Lab, Signal Calibration Engine, Strategy Framework, Backtesting Strategy Lab, Strategy Decision Engine, Today Trade Review, Research Hub, and Trade Plan Risk Engine.
- Code touchpoints inspected for contract impact: `backend/prisma/schema.prisma`, `backend/src/api/routes.ts`, `frontend/src/app/routes.tsx`, and `frontend/src/app/NavigationLayout.tsx`.

All contracts preserve the personal/local-first model, free/open-source tooling, `IN / STOCK` default scope, research-support language, bounded batch work, and no broker execution/order-placement boundary.

## Shared Architecture Decisions

- No new module is needed for this Top 5 batch. Extend existing module contracts and public DTOs.
- Cross-module reads must use public module services/APIs or persisted snapshots. No implementation may import another module repository directly.
- User-facing labels must avoid transaction advice. Use `review`, `candidate`, `watch`, `blocked`, `paper review`, `research support`, and `insufficient data`; avoid `buy`, `sell`, `execute`, or live-trading readiness language.
- Backend response changes should be additive and backward-compatible unless the Orchestrator explicitly reserves a breaking shared contract change.
- Any frontend changes should keep module-owned UI under `frontend/src/features/{feature-name}`. Shared navigation, shared components, shared type helpers, Prisma schema, and route registries remain Orchestrator-owned unless assigned in a work packet.

## Brief 1 - Trusted Review Universe Readiness And Repair Path

### Ownership

- Primary lane: Lane 1, Market Data / Data Quality.
- Primary module: `market-data-foundation`.
- Supporting module: `data-quality-engine`.
- Downstream consumers: `today-trade-review`, `research-hub`, `trade-plan-risk-engine`.

### Backend And Frontend Contract Approach

- Market Data Foundation remains source of truth for scoped universe readiness and bounded repair actions.
- Implement as an additive scoped readiness contract that can be exposed either through a new route such as `GET /api/v1/market-data/review-readiness-summary` or additive fields on the existing Trusted Review Universe/repair-plan routes. The work packet should choose one path, but the response shape must be a single consumable summary.
- Data Quality may display or link to this summary, but it must not duplicate provider, price, or Trusted Review Universe state classification.
- Today Review must consume the same readiness mode and blocker categories when deciding `FULL_REVIEW`, `LIMITED_REVIEW`, or `NO_REVIEW`.

### API/Data Shape Impact

Behavior-level response contract:

```ts
{
  scope: { region: "IN"; assetType: "STOCK" };
  generatedAt: string;
  reviewMode: "FULL_REVIEW" | "LIMITED_REVIEW" | "NO_REVIEW";
  trustStatus: "OK" | "PARTIAL" | "NOT_TRUSTWORTHY";
  userDecision: "WAIT" | "REPAIR_DATA" | "PROCEED_LIMITED" | "READY_FOR_REVIEW";
  reviewUniverse: {
    catalogCount: number;
    providerSupportedCount: number;
    trustedCount: number;
    targetTradingDate: string | null;
    requiredDataThroughDate: string | null;
    storedDataThroughDate: string | null;
  };
  readinessCounts: {
    priceReady: number;
    contextReady: number;
    reviewReady: number;
    missingLatestPrice: number;
    staleLatestPrice: number;
    inadequateHistory: number;
    missingRecentVolume: number;
    providerUnknown: number;
    providerValidationFailedRetryable: number;
    unsupportedExcluded: number;
  };
  blockers: Array<{
    category:
      | "PROVIDER_VALIDATION"
      | "CATALOG_IDENTITY"
      | "BUSINESS_METADATA"
      | "PRICE_BACKFILL"
      | "STALE_EOD"
      | "INSUFFICIENT_TRUSTED_UNIVERSE"
      | "MARKET_CALENDAR_UNCERTAIN";
    severity: "HARD_BLOCKER" | "LIMITED_REVIEW" | "CONTEXT_GAP";
    affectedCount: number;
    explanation: string;
    nextActionCode: string;
    nextActionLabel: string;
    actionRoute?: string;
    boundedRequest?: { batchSize: number; region: string; assetType: string };
  }>;
  warnings: string[];
}
```

- Repair actions must be explicit and bounded. No button or API path may silently launch full-universe/provider-heavy work.
- The summary must distinguish catalog size from reviewable/trusted universe size.
- Empty and partial states must produce a concrete next action, not generic failure copy.

### Schema/Migration Expectation

- No required migration for the summary itself; it can be derived from existing `Stock`, `PriceTick`, `MarketDataRepairState`, `MarketDataRepairAttempt`, `MarketDataRepairRun`, and existing universe health DTOs.
- Today Review already has `sourceSnapshot` JSON on `TodayReviewRun`; store the consumed summary subset there when running a review.
- Add schema only if the implementation decides to persist a reusable readiness snapshot independent of Market Data repair runs. That would require Architect and Orchestrator review before implementation.

### Dependencies

- Upstream: Market Data Foundation catalog/provider/price/session health, repair state, repair run evidence.
- Supporting: Data Quality latest evaluations where needed for explanatory context, but Data Quality cannot be the source of market-data readiness.
- Downstream: Today Review run eligibility and displayed mode; Research Hub and Trade Plan pages may link to the same repair path when blocked.

### Shared Files Likely Requiring Orchestrator Ownership

- `backend/src/api/routes.ts` only if a new router mount is introduced. Prefer adding the route inside the existing Market Data router to avoid route registry changes.
- `backend/prisma/schema.prisma` only if snapshot persistence is added.
- `frontend/src/shared/*` only if a shared readiness badge/action component is introduced.
- Global navigation should not change for this item unless the Orchestrator assigns it.

### Scalability/Robustness Risks

- Counting repair blockers must remain distinct stocks in current state, not attempt rows or recent time windows.
- Mutating repair queues must preserve the existing offset-zero/drain semantics for shrinking queues.
- Readiness calculations should avoid scanning unbounded price history for every page load; reuse existing universe health helpers where possible.
- Calendar uncertainty and in-progress EOD candles must remain blockers for EOD review workflows.

### Local/Free Compliance

- Uses existing local database and free provider paths only.
- No paid data provider, SaaS job runner, hosted monitoring, or paid browser testing.

### Implementation Sequencing

1. Add/extend Market Data Foundation readiness DTO and tests.
2. Wire Market Data/Data Quality UI display to the single summary.
3. Make Today Review consume and snapshot the same readiness mode.
4. Update UI smoke tests for Market Data/Data Quality and Today Review consistency.
5. Run focused backend tests for Market Data Foundation and Today Review, frontend build, and relevant Playwright specs.

### Architecture Readiness

- Status: Architecture Ready.
- Blocker: None.
- Implementation note: This should be the first implementation item because Briefs 4 and 5 depend on consistent readiness semantics.

## Brief 2 - Signal Outcome Maturity And Evaluable Coverage

### Ownership

- Primary lane: Lane 2, Strategy / Signals / Risk.
- Primary module: `signal-quality-lab`.
- Upstream dependencies: `signal-generation-engine`, `market-data-foundation`, optionally `data-quality-engine`.
- Downstream consumers: `signal-calibration-engine`, `strategy-decision-engine`, `today-trade-review`, `research-hub`.

### Backend And Frontend Contract Approach

- Signal Quality Lab owns maturity/evaluable coverage for raw signal outcomes.
- Keep outcomes on demand for this slice; do not introduce a `SignalOutcome` table unless separately approved.
- Existing `evaluationDiagnostics` and `horizonAvailability` are the correct contract surface. Add missing fields or normalize labels if the current UI/API does not expose the PO-required counts clearly.
- Downstream modules should consume an additive evidence usability status rather than inferring usability from `evaluatedSignals` alone.

### API/Data Shape Impact

All summary/grouped dashboard responses should expose, at minimum:

```ts
{
  selectedHorizon: "1D" | "5D" | "10D" | "20D" | "60D";
  evidenceUsability: "USABLE" | "LIMITED" | "UNAVAILABLE";
  evaluationDiagnostics: {
    totalSignals: number;
    matureSignals: number;          // alias/semantic equivalent for evaluated horizon sample
    evaluatedSignals: number;
    notYetMatureSignals: number;
    missingPriceHistoryCount: number;
    insufficientFuturePriceCount: number;
    latestAvailablePriceDate: string | null;
    earliestSignalDate: string | null;
    latestSignalDate: string | null;
    nextEvaluableDate: string | null;
    recommendedAction: string;
    warnings: string[];
  };
  horizonAvailability: Record<string, {
    eligible: number;
    evaluated: number;
    insufficientFuturePrice: number;
    missingPriceHistory?: number;
    evidenceUsability?: "USABLE" | "LIMITED" | "UNAVAILABLE";
  }>;
}
```

- `evaluatedSignals = 0` with `totalSignals > 0` must return `evidenceUsability = "UNAVAILABLE"` and a recommended action such as shorter horizon, wait for more trading days, sync price history, or reset filters.
- Horizon comparisons must keep samples separate by horizon. A mature 1D sample must not be presented as 20D evidence.
- Batch recalculation remains bounded and must keep not-yet-mature, missing-price, failed, and skipped counters separate.

### Schema/Migration Expectation

- No migration expected for this batch.
- Do not add persisted outcomes unless Product Owner accepts the larger scope and Architect records a separate persistence decision.
- If a future `SignalOutcome` table is approved, it must be keyed by `signalResultId + horizon + priceSourceVersion` or equivalent and include idempotent recomputation rules.

### Dependencies

- Upstream: Signal Generation Engine daily idempotent `SignalResult`; Market Data Foundation adjusted-close/close price history; Data Quality filters when requested.
- Downstream: Signal Calibration sample safety; Strategy Decision/Today Review/Research Hub evidence labels.

### Shared Files Likely Requiring Orchestrator Ownership

- None if changes stay inside Signal Quality backend/frontend module files.
- Shared batch runner or shared progress component changes require Orchestrator ownership.
- Route registry changes are not expected because existing Signal Quality routes cover this brief.

### Scalability/Robustness Risks

- Dashboard analysis must remain bounded, currently capped to a safe signal limit.
- Price lookup should be batched by instrument where possible to avoid N+1 local DB load.
- Date math must be trading-row based for maturity, not calendar-day only.
- Missing price history must not be collapsed into not-yet-mature samples.

### Local/Free Compliance

- Uses local DB and existing free/local price data only.
- No machine learning service, paid analytics, paid AI, or external hosted metrics.

### Implementation Sequencing

1. Normalize/add Signal Quality API diagnostics fields and unit tests.
2. Update Signal Quality UI banners/cards/horizon comparison.
3. Update Calibration consumer tests if a new `evidenceUsability` field is consumed.
4. Run focused Signal Quality backend tests and `frontend/tests/ui/signal-quality-lab.spec.ts`.

### Architecture Readiness

- Status: Architecture Ready.
- Blocker: None.

## Brief 3 - Calibration Readiness And Confidence Guardrails

### Ownership

- Primary lane: Lane 2, Strategy / Signals / Risk.
- Primary module: `signal-calibration-engine`.
- Upstream dependencies: `signal-quality-lab`, `signal-generation-engine`, `data-quality-engine`, historical context snapshots where available.
- Downstream consumers: `strategy-decision-engine`, `today-trade-review`, `research-hub`, and any signal display that compares raw/calibrated scores.

### Backend And Frontend Contract Approach

- Calibration Engine owns readiness/confidence guardrails for calibrated outputs.
- Signal Quality owns outcome maturity; Calibration consumes its diagnostics and translates them into calibration influence rules.
- Downstream modules must consume calibration readiness through public DTOs or persisted calibration rows, never by reaching into Signal Quality internals.
- If sample sufficiency is too low, Calibration must preserve raw score, mark calibration as not applied or limited, and expose a downstream influence of `NONE` or `LIMITED`.

### API/Data Shape Impact

Add or standardize this contract on calibration result, comparison, top-list, run result, model, and health responses:

```ts
{
  calibrationEvidence: {
    horizon: "1D" | "5D" | "10D" | "20D" | "60D";
    evidenceStatus: "SUFFICIENT" | "LOW_SAMPLE" | "INSUFFICIENT" | "MISSING";
    overallEvaluatedSamples: number;
    groupEvaluatedSamples: number;
    requiredOverallSamples: number;
    requiredGroupSamples: number;
    horizonAvailability?: Record<string, { eligible: number; evaluated: number; insufficientFuturePrice: number }>;
    warnings: string[];
  };
  calibrationReadiness: {
    status: "USABLE" | "LIMITED" | "UNAVAILABLE";
    confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_SAMPLE";
    calibrationApplied: boolean;
    adjustmentCapApplied: number;
    downstreamInfluence: "NORMAL" | "LIMITED" | "NONE";
    authoritativeScore: "CALIBRATED_SCORE" | "RAW_SCORE" | "NO_SCORE";
    reasons: string[];
    blockers: string[];
  };
}
```

- When evaluated samples are zero for the selected horizon, `downstreamInfluence` must be `NONE`, `authoritativeScore` must be `RAW_SCORE` or `NO_SCORE` depending on raw signal availability, and UI copy must explain that calibration should not influence decisions.
- Strategy Decision and Today Review should treat `downstreamInfluence = NONE` as no calibration support. They may still show raw signal support if other gates allow it.
- Batch calibration remains bounded with separate `calibratedCount`, `passthroughCount`, `skippedCount`, `outOfScopeSkipped`, `failedCount`, and warnings.

### Schema/Migration Expectation

- Additive schema migration is expected if downstream modules must read readiness without recomputing Signal Quality diagnostics. Recommended minimal additions to `SignalCalibrationResult`:
  - `calibrationEvidenceJson Json?`
  - `calibrationReadinessStatus String?`
  - `downstreamInfluence String?`
  - `calibrationApplied Boolean?`
  - `overallEvaluatedSamples Int?`
  - `groupEvaluatedSamples Int?`
  - `selectedHorizon String?`
- Existing rows can be treated as `MISSING` evidence until recalibrated; do not backfill with guessed confidence.
- Orchestrator must own `backend/prisma/schema.prisma` and Prisma Client generation.

### Dependencies

- Upstream: Signal Quality `evaluationDiagnostics` and `horizonAvailability`; Signal Generation raw signal; Data Quality latest evaluation; historical context snapshots where present.
- Downstream: Strategy Decision confidence mapping, Today Review candidate snapshots, Research Hub confirmation summary.

### Shared Files Likely Requiring Orchestrator Ownership

- `backend/prisma/schema.prisma` and generated Prisma client if persistence fields are added.
- Shared frontend badges/types only if readiness chips are shared across Calibration, Strategy Decision, and Today Review.
- Backend route registry changes are not expected.

### Scalability/Robustness Risks

- Calibration runs must not call full Signal Quality dashboard calculations per instrument. Load global/group diagnostics once per batch where possible.
- Existing persisted calibration rows without evidence must not be displayed as high-confidence calibrated support.
- Downstream modules must fail conservative: missing calibration evidence means no calibration influence, not healthy influence.

### Local/Free Compliance

- No paid model provider, black-box scoring service, or hosted analytics.
- Calibration remains deterministic, explainable, local, and research-support only.

### Implementation Sequencing

1. Complete Brief 2 diagnostics first or confirm current diagnostics already satisfy the contract.
2. Add Calibration readiness DTO and tests.
3. Add additive migration if persisted downstream consumption is in scope for this implementation pass.
4. Update Calibration UI and batch progress.
5. Update Strategy Decision/Today Review consumers only after the readiness field is stable.
6. Run Signal Calibration, Signal Quality, Strategy Decision, Today Review focused tests and Calibration UI smoke.

### Architecture Readiness

- Status: Architecture Ready.
- Blocker: None, but implementation has a schema/shared-file dependency if downstream persisted consumption is included in the first slice.

## Brief 4 - Cross-Module Actionability Consistency

### Ownership

- Primary lane: Lane 3, Portfolio / Watchlists / Alerts / UX.
- Primary module: `research-hub`, because it owns the command-center answer to "Can I review actionable setups now?"
- Contract producers: `market-data-foundation`, `today-trade-review`, `signal-quality-lab`, `signal-calibration-engine`, `strategy-decision-engine`, `strategy-framework`, `backtesting-strategy-lab`, `trade-plan-risk-engine`.
- Orchestrator owns shared vocabulary, shared files, and route/type conflicts.

### Backend And Frontend Contract Approach

- Do not create a new Actionability module for this batch.
- Research Hub should aggregate public outputs and publish a normalized actionability object.
- Today Review and Trade Plans should expose compatible status labels in their own outputs so Research Hub does not translate contradictory private states.
- The shared product vocabulary is:
  - `READY`
  - `LIMITED`
  - `BLOCKED`
  - `UNPROVEN`
  - `INSUFFICIENT_DATA`
- `market healthy` is only one dimension. It must never imply actionable setups are ready when data, proof, calibration, Today Review, or Trade Plan readiness is blocked.

### API/Data Shape Impact

Additive actionability contract for Research Hub overview, and optionally mirrored on Today Review/Trade Plan funnel responses:

```ts
{
  actionability: {
    overallStatus: "READY" | "LIMITED" | "BLOCKED" | "UNPROVEN" | "INSUFFICIENT_DATA";
    canReviewActionableSetups: boolean;
    headline: string;
    researchSupportOnly: true;
    dimensions: {
      marketEnvironment: ActionabilityDimension;
      dataReadiness: ActionabilityDimension;
      signalEvidence: ActionabilityDimension;
      calibrationReadiness: ActionabilityDimension;
      strategyProof: ActionabilityDimension;
      todayReviewReadiness: ActionabilityDimension;
      tradePlanReadiness: ActionabilityDimension;
    };
    nextBestAction: {
      label: string;
      targetRoute: string;
      sourceModule: string;
      priority: "HIGH" | "MEDIUM" | "LOW";
    } | null;
    blockers: Array<{ sourceModule: string; category: string; count?: number; message: string }>;
  }
}

type ActionabilityDimension = {
  status: "READY" | "LIMITED" | "BLOCKED" | "UNPROVEN" | "INSUFFICIENT_DATA";
  label: string;
  sourceModule: string;
  blocking: boolean;
  count?: number;
  evidenceDate?: string | null;
  message: string;
};
```

Status reduction rules:

- Any hard data readiness `NO_REVIEW`, Today Review `NO_REVIEW`, or Trade Plan hard blocker makes `overallStatus = BLOCKED`.
- Strategy proof missing for all candidates makes `UNPROVEN` unless a harder data blocker exists.
- Signal/calibration zero-evidence makes `INSUFFICIENT_DATA` or `LIMITED`; it must not make the market dimension unhealthy by itself.
- `canReviewActionableSetups = true` only when Today Review has reviewable candidates and Trade Plan readiness has at least one `READY_FOR_PAPER_REVIEW` or explicitly reviewable non-paper candidate, depending on the product surface. Blocked plans cannot be counted as actionable.
- Research Hub `allowedActions` must be consistent with `canReviewActionableSetups`. If false, actions should be repair/evaluate/review diagnostics, not "review actionable setups."

### Schema/Migration Expectation

- No migration required for first implementation; actionability is computed from public responses and existing persisted snapshots.
- If the team later wants historical actionability snapshots, use a separate Architect decision record and do not overload Today Review or Trade Plan rows without clear retention rules.

### Dependencies

- Upstream: Brief 1 readiness summary, Brief 2 evidence usability, Brief 3 calibration readiness, Strategy Framework performance summaries, Today Review latest run, Trade Plan funnel/readiness.
- Downstream: Research Hub UI, Today Review UI copy, Trade Plans UI copy, QA acceptance checks.

### Shared Files Likely Requiring Orchestrator Ownership

- `frontend/src/shared/*` if introducing a shared status chip or actionability panel.
- `backend/src/shared/*` only if a shared enum/reducer is introduced. Prefer module-local adapters in Research Hub first to reduce shared-file conflicts.
- `frontend/src/app/NavigationLayout.tsx` should not change unless a new route is introduced; no new route is expected.
- `backend/prisma/schema.prisma` is not expected.

### Scalability/Robustness Risks

- Research Hub must remain fast and partial-success tolerant. Do not trigger generation, backtests, calibration runs, data-quality evaluations, or provider sync on overview load.
- Fanout to many modules can create slow overview loads. Prefer persisted/latest summary endpoints and short timeouts with clear `dataGaps`.
- Status mapping must be deterministic and covered by tests so copy cannot drift module by module.
- Partial child failures should downgrade actionability to `LIMITED` or `INSUFFICIENT_DATA`, not produce optimistic readiness.

### Local/Free Compliance

- Uses local persisted module outputs only.
- No hosted orchestration, monitoring, AI summarization, or paid analytics.

### Implementation Sequencing

1. Define the status mapping in Research Hub tests.
2. Consume Brief 1/2/3/5 outputs if available; otherwise adapter missing fields conservatively.
3. Update Research Hub API and UI to show actionability dimensions and next best action.
4. Align Today Review and Trade Plan user-facing labels with the shared vocabulary.
5. Run Research Hub, Today Review, Trade Plan backend tests and connected UI smoke specs with one worker.

### Architecture Readiness

- Status: Architecture Ready.
- Blocker: None.
- Dependency note: Best implemented after Brief 1 and at least the DTO portion of Briefs 2, 3, and 5, or implemented as a conservative adapter that treats missing upstream evidence as limited/unavailable.

## Brief 5 - Trade Plan Paper-Readiness Proof Chain

### Ownership

- Primary lane: Lane 2, Strategy / Signals / Risk.
- Primary module: `trade-plan-risk-engine`.
- Upstream modules: `strategy-decision-engine`, `strategy-framework`, `backtesting-strategy-lab`, `data-quality-engine`, `market-data-foundation`.
- Downstream consumers: `today-trade-review`, `research-hub`, future paper simulator.

### Backend And Frontend Contract Approach

- Trade Plan Risk Engine remains the owner of paper-readiness classification and proof-chain presentation.
- Use existing `/api/v1/trade-plans/funnel`, `/api/v1/trade-plans/candidates`, and detail endpoints where possible. Add fields rather than creating a new route unless the existing responses become too large.
- Proof-chain data must come from persisted plan snapshots where available. Do not reconstruct paper-readiness from upstream repositories.
- Detail pages must show hard blockers as authoritative and must not display positive readiness reasons beside active hard blockers.

### API/Data Shape Impact

Additive proof-chain contract:

```ts
{
  paperReadinessProofChain: {
    scope: { region: string; assetType: string; backtestTimeframe?: string | null };
    generatedPlanCount: number;
    paperReadyCount: number;
    stages: Array<{
      stage:
        | "DATA_QUALITY"
        | "STRATEGY_DECISION"
        | "STRATEGY_PROOF"
        | "BACKTEST_EVIDENCE"
        | "RISK_GEOMETRY"
        | "SCOPE"
        | "PAPER_READINESS";
      status: "PASS" | "LIMITED" | "BLOCKED" | "INSUFFICIENT_DATA" | "UNPROVEN";
      affectedCount: number;
      hardBlockerCount: number;
      topBlockers: Array<{ code: string; label: string; count: number; targetRoute?: string }>;
      nextAction?: { label: string; targetRoute: string; sourceModule: string };
    }>;
    prioritizedBlockers: Array<{
      priority: number;
      category: string;
      count: number;
      sourceModule: string;
      nextActionLabel: string;
      targetRoute: string;
    }>;
  }
}
```

Canonical blocker categories:

- `DATA_QUALITY_BLOCKED`
- `MISSING_LATEST_PRICE`
- `INSUFFICIENT_PRICE_HISTORY`
- `STRATEGY_DECISION_BLOCKED`
- `NOT_FRAMEWORK_BACKED`
- `WEAK_OR_UNPROVEN_STRATEGY`
- `MISSING_BACKTEST_SUMMARY`
- `MARKET_GATE_CLOSED`
- `PLAN_STATUS_NOT_VALID`
- `RISK_GRADE_HIGH`
- `REWARD_RISK_TOO_LOW`
- `INVALID_LONG_GEOMETRY`
- `OUT_OF_SCOPE`

Behavior rules:

- `READY_FOR_PAPER_REVIEW` is a review classification only; it must not create paper trades or imply live trading readiness.
- `paperReadyOnly=true` must select only persisted/canonicalized `READY_FOR_PAPER_REVIEW` rows in the requested scope.
- Blocked detail responses must clear positive `paperReadinessReasons` or clearly separate them as stale/non-authoritative. Active hard blockers win.
- Today Review can consume paper-readiness status but must not promote blocked plans as actionable candidates.

### Schema/Migration Expectation

- No required migration expected for this slice because `TradePlanResult` already persists scope, proof snapshots, backtest summary, data-quality snapshot, market-data snapshot, and paper-readiness fields.
- If the implementation chooses to persist normalized proof-chain stage counts, that is a new schema decision and should be deferred unless performance requires it.
- Existing legacy rows without scope/proof should remain excluded by default or repaired conservatively on read, matching current module rules.

### Dependencies

- Upstream: Strategy Decision current proof-safe candidates; Strategy Framework ratings/readiness; Backtesting Strategy Lab summaries via Strategy Framework; Data Quality latest snapshots; Market Data latest price/history/scope.
- Downstream: Today Review candidate snapshots, Research Hub actionability, future Paper Trading Simulator.

### Shared Files Likely Requiring Orchestrator Ownership

- `frontend/src/shared/*` only if a shared proof-chain/funnel component is introduced.
- `backend/prisma/schema.prisma` is not expected.
- Route registry changes are not expected because existing Trade Plan routes cover the workflow.

### Scalability/Robustness Risks

- Funnel counts must use the same scoped candidate query as generation, not a bounded diagnostic sample for actionable totals.
- Read-time canonical repair should be scoped and idempotent; it must not rewrite unrelated plans.
- Detail/list/funnel paths must agree on blocker counts after canonicalization.
- Proof-chain UI must avoid full batch generation on page load. Batch generation stays manual and bounded.

### Local/Free Compliance

- Uses existing local Strategy Framework/Backtesting/Data Quality/Market Data snapshots.
- No broker APIs, real-money execution, paid backtesting service, or paid provider.

### Implementation Sequencing

1. Add backend proof-chain aggregation tests for funnel/list/detail consistency.
2. Extend Trade Plan funnel/detail DTOs.
3. Update Trade Plans UI with prioritized blocker funnel and module/action targets.
4. Update Today Review consumer mapping to treat blocked plans as non-actionable.
5. Run Trade Plan backend tests, Strategy Decision repository/scope tests if touched, frontend build, and Trade Plan plus connected Today Review/Research Hub UI smoke specs.

### Architecture Readiness

- Status: Architecture Ready.
- Blocker: None.

## Batch-Level Sequencing Recommendation

1. Brief 1 first: it defines the upstream review-universe readiness gate used by Today Review and cross-module actionability.
2. Brief 2 second: it stabilizes signal evidence maturity, which Calibration depends on.
3. Brief 3 third: it turns maturity evidence into downstream calibration influence guardrails.
4. Brief 5 fourth: it gives Trade Plans a clear paper-readiness proof chain.
5. Brief 4 fifth or in parallel as a conservative adapter: it aggregates the stabilized upstream states into one actionability answer.

## Architecture Blockers Summary

- No architecture blockers block the Top 5 from moving to `Architecture Ready`.
- Orchestrator/shared-file blockers must be managed before implementation for any Prisma schema migration, shared type/component extraction, route registry edit, or cross-lane simultaneous edits.
- Brief 3 has a likely Prisma/shared-file dependency if downstream modules must consume persisted calibration readiness in the same implementation slice.

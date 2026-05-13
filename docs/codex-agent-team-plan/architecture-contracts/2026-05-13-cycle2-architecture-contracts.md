# Cycle 2 Architecture Contracts - 2026-05-13

## Context Loaded

- Product sources: `docs/codex-agent-team-plan/po-current-state-review-2026-05-13-cycle2.md`, `docs/codex-agent-team-plan/po-roadmap-backlog-2026-05-13-cycle2.md`, and `docs/codex-agent-team-plan/work-packets/2026-05-13-cycle2-orchestrator-intake.md`.
- Prior architecture pattern: `docs/codex-agent-team-plan/architecture-contracts/2026-05-13-top5-architecture-contracts.md`.
- Module docs/source inspected as needed: Market Data Foundation, Data Quality Engine, Signal Generation Engine, Signal Quality Lab, Signal Calibration Engine, Strategy Framework, Backtesting Strategy Lab, Today Trade Review, Research Hub, Trade Plan Risk Engine, Stock Research Workbench, `backend/prisma/schema.prisma`, backend module file roots, and frontend feature roots.

All contracts preserve the personal/local-use app boundary, `IN / STOCK` default scope, bounded user-triggered work, free/open-source/local tooling only, research-support language, and no broker APIs, order placement, live-trading workflows, hosted providers, or paid services.

## Shared Architecture Decisions

- Keep module ownership strict. Cross-module reads must use public module services, public APIs, or persisted snapshots. No implementation should import another module repository directly.
- Backend DTO changes should be additive. Existing route names should be extended in module routers where possible instead of changing global route registration.
- Frontend work must remain under each feature root unless Orchestrator explicitly assigns shared component, navigation, route registry, or market-scope changes.
- Shared files are reserved, not casual developer territory: `backend/prisma/schema.prisma`, Prisma migrations, generated Prisma client, shared frontend components/types, global app routes/navigation, and cross-module test helpers require one assigned owner at a time.
- Product language must use review, repair, inspect, evaluate, evidence, thesis, blocked, watch, paper review candidate, or research support. It must not use buy/sell/execute/order/live-ready language.

## C2-WP-01 - Trusted Universe Repair Workbench

### Problem Framing

The released system correctly blocks Today Review with `NO_REVIEW` when the trusted `IN / STOCK` universe is not ready, but the user still needs a practical repair workbench. The workbench must show which repair lane is blocking review, run only explicit bounded local actions, preserve the distinction between catalog size and trusted review universe, and reconcile results back to the Market Data readiness summary.

### Target Module Boundary

- Primary owner: `market-data-foundation`.
- Display/support owner: `data-quality-engine` may display Market Data-owned readiness and repair status but must not recalculate provider, price, catalog, or trusted-universe state.
- Downstream read-only consumers: `today-trade-review`, `research-hub`, and `trade-plan-risk-engine`.

### Public API/Data Contract

Use the existing Market Data endpoints as the canonical surface:

- `GET /api/v1/market-data/review-readiness-summary`
- `GET /api/v1/market-data/universe/repair-plan`
- `GET /api/v1/market-data/universe/repair-runs/latest`
- `POST /api/v1/market-data/universe/repair-run`
- Existing one-batch repair endpoints for provider validation, catalog identity, business metadata/manual metadata, and price backfill remain valid lane actions.

The repair workbench response should normalize each lane into this shape:

```ts
type RepairLaneCode =
  | "PROVIDER_VALIDATION"
  | "PRICE_BACKFILL"
  | "STALE_EOD"
  | "CATALOG_IDENTITY"
  | "PROVIDER_BUSINESS_METADATA"
  | "MANUAL_METADATA_IMPORT"
  | "INSUFFICIENT_TRUSTED_UNIVERSE";

type RepairLane = {
  code: RepairLaneCode;
  label: string;
  scope: { region: "IN"; assetType: "STOCK" };
  affectedCount: number;
  eligibleNowCount: number;
  retryableFailureCount: number;
  manualRequiredCount: number;
  skippedRecentAttemptCount: number;
  boundedBatchSize: number;
  expectedEffect: string;
  lastRun: {
    id: string;
    status: "RUNNING" | "COMPLETED" | "PARTIAL" | "PARTIAL_BLOCKED" | "PARTIAL_MANUAL_REQUIRED" | "FAILED";
    startedAt: string;
    completedAt: string | null;
    successCount: number;
    failureCount: number;
    skippedCount: number;
    warningCount: number;
  } | null;
  nextAction: {
    enabled: boolean;
    actionCode: string;
    method: "POST";
    endpoint: string;
    request: { region: "IN"; assetType: "STOCK"; batchSize: number; offset?: number; queueMode?: string };
    disabledReason?: string;
  };
};

type TrustedUniverseRepairWorkbench = {
  scope: { region: "IN"; assetType: "STOCK" };
  generatedAt: string;
  readinessSummary: ReviewReadinessSummary;
  repairRun: MarketDataRepairRun | null;
  lanes: RepairLane[];
  recommendedNextLane: RepairLaneCode | null;
  warnings: string[];
};
```

Behavior rules:

- Every mutating action is explicit, scoped to `IN / STOCK`, and bounded by a server clamp.
- Mutating repair queues that shrink as they are processed must keep offset-zero drain semantics.
- Readiness refresh after a repair must show remaining blockers before any downstream module can treat the universe as review-ready.
- Today Review remains `NO_REVIEW` until Market Data-owned readiness thresholds pass.

### Database/Schema Implications

No required schema change. Existing `MarketDataRepairAttempt`, `MarketDataRepairState`, and `MarketDataRepairRun` already cover lane audit, current state, and before/after snapshots. Add schema only if a later performance need requires persisted lane summary snapshots; that is outside this contract.

### Source-Of-Truth Decision

Market Data Foundation is the only source of truth for provider validation, price backfill, stale EOD, catalog identity, trusted-universe counts, repair-run state, and review readiness. Data Quality and Today Review consume the public summary.

### Frontend Contract

- Work inside `frontend/src/features/market-data-foundation` for the repair workbench and `frontend/src/features/data-quality-engine` only for read-only display of the Market Data readiness summary.
- The UI should show repair lanes, affected counts, bounded batch size, expected effect, latest run status, success/failure/skipped counts, retryable failures, and the next recommended lane.
- Buttons must be lane-specific and disabled while a run is active. No hidden full-universe jobs.
- The workbench should refresh `review-readiness-summary` after every completed batch/run.

### Downstream Consumers

- `today-trade-review`: read-only consumption of `reviewMode`, trusted counts, blockers, next action, and data-through dates.
- `research-hub`: actionability dimension may link to Market Data repair when data readiness blocks review.
- `trade-plan-risk-engine`: may display Market Data blockers from persisted snapshots but must not launch repair.

### Forbidden Scope

No new paid provider, broker integration, hosted job runner, automatic background repair loop, full-universe provider sweep, live/intraday data workflow, or Today Review implementation change in this WP.

### Migration/Backward-Compat Risk

Low. The contract is additive over existing endpoints and models. Risk is mostly semantic: lane counts must remain distinct stocks in current state, not historical attempt rows.

### Implementation Split Recommendation

1. Backend: add/normalize workbench DTO in Market Data service/controller/types/tests.
2. Frontend: update Market Data status/repair panel to consume the normalized lane contract.
3. Optional display: Data Quality read-only summary alignment.
4. Verification: Market Data backend tests and `market-data-foundation.spec.ts`; Data Quality UI only if touched.

### Conflict-Free Reserved Write-Scope Proposal

- WP-01 owner only: `backend/src/modules/market-data-foundation/*`, `backend/tests/modules/market-data-foundation/*`, `frontend/src/features/market-data-foundation/*`, `frontend/tests/ui/market-data-foundation.spec.ts`.
- Optional WP-01 support owner only: `frontend/src/features/data-quality-engine/*`, `frontend/tests/ui/data-quality-engine.spec.ts`.
- Do not edit: `today-trade-review`, `research-hub`, `trade-plan-risk-engine`, `backend/prisma/schema.prisma`, shared frontend components, or global routes.

## C2-WP-02 - Raw Signal Generation Scope And Model-Version Audit

### Problem Framing

Signal Quality and Calibration cannot be trusted if raw signals from different model versions, data dates, scopes, or eligibility rules are mixed. Signal Generation already has `modelVersion` and daily idempotency, but Cycle 2 needs a visible audit trail for latest run scope, source data date, scoring inputs, data-quality eligibility, duplicate/no-op behavior, and bounded run counts.

### Target Module Boundary

- Primary owner: `signal-generation-engine`.
- Downstream read-only consumer: `signal-quality-lab` may filter/group by model version and source data date after the Signal Generation contract is stable.
- No overlap with Strategy Framework/Strategy Proof files.

### Public API/Data Contract

Extend `POST /api/v1/signals/run`, `GET /api/v1/signals/top`, `GET /api/v1/signals/screener`, and add or expose a lightweight latest-run endpoint under the existing Signal Generation router:

- Recommended: `GET /api/v1/signals/runs/latest?region=IN&assetType=STOCK&modelVersion=signal-engine-v1`
- Optional history: `GET /api/v1/signals/runs?region=IN&assetType=STOCK&limit=20&offset=0`

Run audit shape:

```ts
type SignalGenerationRunAudit = {
  id: string;
  scope: { region: string; assetType: string };
  requestedByUserId: string;
  status: "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
  modelVersion: string;
  rulesetVersion: string;
  sourceDataDate: string | null;
  generatedDate: string;
  batchSize: number;
  offset: number;
  totalCount: number;
  processedCount: number;
  generatedCount: number;
  updatedCount: number;
  noOpCount: number;
  duplicateOrIdempotentCount: number;
  skippedCount: number;
  failedCount: number;
  excludedByDataQuality: number;
  missingQualityEvaluationCount: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  warnings: string[];
};

type SignalAuditFields = {
  modelVersion: string;
  rulesetVersion: string;
  generatedDate: string;
  sourceDataDate: string | null;
  sourcePriceDate: string | null;
  scoringInputSummary: {
    priceBarsUsed: number;
    latestCloseDate: string | null;
    hasSma50: boolean;
    hasSma200: boolean;
    hasVolume: boolean;
    fundamentalsAvailable: boolean;
    strategyContextLoaded: boolean;
  };
  dataQualityEligibility: {
    filterApplied: boolean;
    eligible: boolean | null;
    coverageStatus?: string;
    signalReadinessStatus?: string;
    liquidityStatus?: string;
    excludedReason?: string;
  };
  writeStatus: "CREATED" | "UPDATED" | "NO_OP";
};
```

Behavior rules:

- Idempotency key remains `instrumentId + modelVersion + generatedDate`.
- Same scoped rerun must update or no-op existing rows, not create duplicate active signals.
- `rulesetVersion` can equal `modelVersion` for the first slice, but the API must distinguish the two names so future scoring-rule changes are explicit.
- Signal Quality must not mix model versions when the user selects a model-version filter.

### Database/Schema Implications

Recommended schema change for first implementation:

- Add `SignalGenerationRun` with scope, user id, status, model/ruleset version, generated date, source data date, batch/progress counts, warnings JSON, started/completed timestamps.
- Add nullable audit fields to `SignalResult`: `sourceDataDate DateTime?`, `sourcePriceDate DateTime?`, `rulesetVersion String?`, `scoringInputSummary Json?`, `dataQualityEligibilitySnapshot Json?`, and optional `generationRunId String?`.

Existing `SignalResult.modelVersion` and `generatedDate` remain backward-compatible. Historical rows without new audit fields are treated as `auditStatus = "LEGACY_MISSING"` in DTOs, not guessed.

### Source-Of-Truth Decision

Signal Generation Engine owns raw signal model/ruleset version, source data date, scoring input summary, write-status/idempotency, and latest generation-run audit. Signal Quality owns outcome evidence and only reads Signal Generation audit fields.

### Frontend Contract

- Work inside `frontend/src/features/signal-generation-engine`.
- Show latest run scope, model/ruleset version, source data date, batch size, generated/updated/no-op/skipped/failed counts, data-quality exclusion counts, and duration.
- Signal rows should expose model version and source data date in the diagnostics drawer/table.
- Any Signal Quality UI change is a separate read-only consumer slice under `frontend/src/features/signal-quality-lab`.

### Downstream Consumers

- `signal-quality-lab`: filter/group by `modelVersion`, optionally display `sourceDataDate`.
- `signal-calibration-engine`: may include raw signal model/source data date in comparison details after WP-02 is accepted.
- `strategy-decision-engine`, `today-trade-review`, and `research-hub`: read-only future consumers; no direct edits in WP-02 first slice.

### Forbidden Scope

No scoring rewrite, model optimization, ML service, paid data, Signal Quality outcome persistence, Calibration changes, Strategy Framework edits, automatic scheduled generation, or full-universe unbounded generation.

### Migration/Backward-Compat Risk

Medium because this likely touches Prisma. Use nullable additive fields and preserve existing unique constraints. Backfill only default display values for legacy rows; do not mutate historical signal semantics.

### Implementation Split Recommendation

1. Schema owner adds additive run/audit fields and runs Prisma generation.
2. Signal Generation backend persists run audit and per-signal audit snapshots.
3. Signal Generation UI displays latest run and row-level audit.
4. Optional separate consumer slice: Signal Quality model-version filter if not already sufficient.

### Conflict-Free Reserved Write-Scope Proposal

- WP-02 owner only: `backend/src/modules/signal-generation-engine/*`, `backend/tests/modules/signal-generation-engine/*`, `frontend/src/features/signal-generation-engine/*`, `frontend/tests/ui/signal-generation-engine.spec.ts`.
- Schema owner only during WP-02: `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, generated Prisma client.
- Optional later consumer owner: `backend/src/modules/signal-quality-lab/*`, `frontend/src/features/signal-quality-lab/*`.
- Do not edit: `strategy-framework`, `backtesting-strategy-lab`, `today-trade-review`, `trade-plan-risk-engine`, or shared route/navigation files.

## C2-WP-03 - Strategy Proof Registry And Evidence Index

### Problem Framing

Trade Plans currently show that strategy proof is a major blocker. The user needs one Strategy Framework-owned registry that says whether each strategy is proven, limited, unproven, blocked, or missing evidence for the selected `IN / STOCK` scope and timeframe, using compact backtest summaries without duplicating Backtesting Lab internals.

### Target Module Boundary

- Primary owner: `strategy-framework`.
- Supporting producer: `backtesting-strategy-lab` continues to own detailed simulation and upserts compact `StrategyPerformanceSummary`.
- Downstream read-only consumers: `trade-plan-risk-engine`, `strategy-decision-engine`, `today-trade-review`, and `research-hub`.

### Public API/Data Contract

Extend Strategy Framework endpoints, preferably without a new global route mount:

- `GET /api/v1/strategies/proof-registry?region=IN&assetType=STOCK&timeframe=3Y`
- `GET /api/v1/strategies/:code/proof?region=IN&assetType=STOCK&timeframe=3Y`
- Existing `GET /api/v1/strategies`, `GET /api/v1/strategies/:code/performance`, and `GET /api/v1/strategies/rankings` may include additive proof fields.

Proof row shape:

```ts
type StrategyProofStatus = "PROVEN" | "LIMITED" | "UNPROVEN" | "BLOCKED" | "MISSING";

type StrategyProofRegistryRow = {
  strategyCode: string;
  strategyVersion: string;
  strategyName: string;
  category: "ENTRY" | "EXIT" | "GATE" | "FILTER" | "DRAFT";
  status: StrategyProofStatus;
  scope: { region: string; assetType: string; universeKey: string };
  selectedTimeframe: "1Y" | "3Y" | "5Y" | "10Y" | "15Y";
  latestEvaluationDate: string | null;
  sample: {
    tradeCount: number;
    requiredTradeCount: number;
    sampleSufficiency: "SUFFICIENT" | "LOW_SAMPLE" | "INSUFFICIENT" | "NOT_APPLICABLE";
  };
  performance: {
    cagr: number | null;
    maxDrawdown: number | null;
    sharpe: number | null;
    winRate: number | null;
    profitFactor: number | null;
    dataCoveragePercent: number | null;
    benchmarkCagr: number | null;
    excessCagr: number | null;
  };
  rating: {
    ratingGrade: "EXCELLENT" | "GOOD" | "AVERAGE" | "WEAK" | "UNPROVEN" | null;
    readinessLabel: "RESEARCH_ONLY" | "WATCHLIST_CANDIDATE" | "PAPER_TEST_CANDIDATE" | "NOT_AUTOMATION_READY" | null;
    reasons: string[];
    warnings: string[];
    capsApplied: string[];
  };
  missingEvidenceReason: string | null;
  nextAction: {
    label: string;
    targetRoute: string;
    sourceModule: "backtesting-strategy-lab" | "strategy-framework";
  } | null;
};
```

Status reduction rules:

- `PROVEN`: active entry strategy, compact summary exists for selected scope/timeframe, rating `GOOD` or `EXCELLENT`, sufficient sample, no hard coverage/rating cap.
- `LIMITED`: summary exists but sample, coverage, drawdown, benchmark, or rating warnings cap confidence.
- `UNPROVEN`: rating is `WEAK` or `UNPROVEN`, trade count/sample is insufficient, or strategy is draft.
- `BLOCKED`: strategy category/status cannot be standalone backtested or required inputs are structurally missing.
- `MISSING`: no compact summary exists for selected scope/timeframe.

### Database/Schema Implications

No required first-slice schema change. Existing `StrategyDefinition` and `StrategyPerformanceSummary` already persist the compact proof basis. If later proof snapshots are required for audit history, add a separate `StrategyProofSnapshot` only by a new architecture decision.

### Source-Of-Truth Decision

Strategy Framework owns proof status taxonomy, strategy definition metadata, rating/readiness interpretation, sample sufficiency semantics, and registry API. Backtesting Strategy Lab owns detailed runs and simulation metrics, then syncs compact summaries to Strategy Framework.

### Frontend Contract

- Work inside `frontend/src/features/strategy-framework`.
- Add a Proof Registry/Performance Evidence view showing status, timeframe, sample size, rating, warnings/caps, missing-evidence reason, and link to Backtesting Lab.
- Deep links to Backtesting Lab may use `/backtests?mode=registered&strategyCode=...&timeframe=...`.
- Do not change Trade Plan or Strategy Decision UI in the first registry slice.

### Downstream Consumers

- `trade-plan-risk-engine`: should consume the proof status contract in a later slice instead of reconstructing weak/missing proof categories.
- `strategy-decision-engine`: future candidate promotion can use proof status.
- `today-trade-review`: candidate details and exclusion reasons can display proof status.
- `research-hub`: actionability and priorities can summarize proven/unproven counts.

### Forbidden Scope

No new strategy rules, no backtest engine rewrite, no optimization, no walk-forward/Monte Carlo, no paid analytics, no paper/live trading, no Trade Plan consumption change in first slice unless Orchestrator reserves it separately.

### Migration/Backward-Compat Risk

Low if derived from existing compact summaries. Historical rows with missing diagnostic fields should map conservatively to `LIMITED`, `UNPROVEN`, or `MISSING`, not `PROVEN`.

### Implementation Split Recommendation

1. Strategy Framework backend proof reducer and tests.
2. Strategy Framework API endpoint and frontend registry view.
3. Backtesting Lab only if a missing field prevents accurate links or selected-timeframe lookup; otherwise read-only.
4. Downstream consumers in later WPs after registry acceptance.

### Conflict-Free Reserved Write-Scope Proposal

- WP-03 owner only: `backend/src/modules/strategy-framework/*`, `backend/tests/modules/strategy-framework/*`, `frontend/src/features/strategy-framework/*`, `frontend/tests/ui/strategy-framework.spec.ts`.
- Optional Backtesting support owner only if needed: `backend/src/modules/backtesting-strategy-lab/*`, `frontend/src/features/backtesting-strategy-lab/*`.
- Do not edit: `signal-generation-engine`, `trade-plan-risk-engine`, `strategy-decision-engine`, `today-trade-review`, `backend/prisma/schema.prisma` in first slice.

## C2-WP-04 - Today Review Explainability And Exclusion Reasons

### Problem Framing

Today Review is correctly gated, but the user needs to understand why stocks are promoted, watched, blocked, unproven, insufficient-data, or excluded. This is especially important once repair starts unlocking trusted instruments. Explainability must be a Today Review-owned snapshot over public upstream outputs, not a live recomputation that reaches into other modules.

### Target Module Boundary

- Primary owner: `today-trade-review`.
- Source modules are read-only: Market Data Foundation, Signal Quality, Signal Calibration, Strategy Framework/proof registry, Strategy Decision, and Trade Plan Risk Engine.
- No upstream module edits in this WP.

### Public API/Data Contract

Extend existing Today Review endpoints additively:

- `GET /api/v1/today-review/latest`
- `GET /api/v1/today-review/runs/:id`
- `GET /api/v1/today-review/candidates/:id`
- `POST /api/v1/today-review/run`

Run-level explainability shape:

```ts
type TodayReviewReasonCategory =
  | "READINESS"
  | "DATA_QUALITY"
  | "SIGNAL_MATURITY"
  | "CALIBRATION"
  | "STRATEGY_PROOF"
  | "STRATEGY_DECISION"
  | "TRADE_PLAN_PROOF_CHAIN"
  | "MARKET_GATE"
  | "OUTSIDE_SCOPE"
  | "NO_SETUP";

type ExclusionReasonSummary = {
  category: TodayReviewReasonCategory;
  code: string;
  label: string;
  count: number;
  blocking: boolean;
  sourceModule: string;
  targetRoute?: string;
};

type TodayReviewExplainability = {
  runId: string;
  scope: { region: string; assetType: string };
  reviewMode: "FULL_REVIEW" | "LIMITED_REVIEW" | "NO_REVIEW";
  trustedUniverseCount: number;
  scannedCount: number;
  promotedCount: number;
  watchCount: number;
  blockedCount: number;
  unprovenCount: number;
  insufficientDataCount: number;
  excludedCount: number;
  exclusionSummaries: ExclusionReasonSummary[];
  inspectableExcludedExamples: Array<{
    instrumentId: string;
    symbol: string;
    companyName?: string | null;
    primaryReasonCode: string;
    primaryReasonLabel: string;
    reasonCategories: TodayReviewReasonCategory[];
    promoted: false;
  }>;
};
```

Candidate-level shape:

```ts
type TodayReviewCandidateReason = {
  category: TodayReviewReasonCategory;
  code: string;
  label: string;
  severity: "INFO" | "WATCH" | "BLOCKER";
  sourceModule: string;
  evidenceDate?: string | null;
  targetRoute?: string;
};

type TodayReviewCandidateExplainability = {
  candidateId: string;
  state: "LONG_REVIEW" | "SHORT_REVIEW" | "EXIT_RISK_REVIEW" | "WATCH_ONLY" | "BLOCKED" | "AVOID" | "INSUFFICIENT_DATA" | "UNPROVEN";
  rankingComponents: {
    strategyProof: number;
    tradePlan: number;
    marketRegime: number;
    sectorAlignment: number;
    signalCalibration: number;
    dataQuality: number;
    smartMoney: number;
    hardBlockerOverride: boolean;
  };
  promotionReasons: TodayReviewCandidateReason[];
  watchReasons: TodayReviewCandidateReason[];
  blockers: TodayReviewCandidateReason[];
  upstreamEvidence: {
    readiness?: unknown;
    signalEvidence?: unknown;
    calibrationReadiness?: unknown;
    strategyProof?: unknown;
    tradePlanProofChain?: unknown;
  };
};
```

Behavior rules:

- Hard blockers override positive reasons.
- Excluded examples are inspectable but never promoted as actionable candidates.
- Missing upstream evidence maps to `INSUFFICIENT_DATA` or `UNPROVEN`, never optimistic readiness.
- Run snapshots should retain the explanation as of the run time.

### Database/Schema Implications

No required schema change. Use existing `TodayReviewRun.sourceSnapshot`, `TodayReviewRun.candidateCounts`, and candidate JSON snapshot fields. If the exclusion example list becomes too large for JSON snapshots, a later decision can introduce `TodayReviewExcludedInstrument`, but first implementation should keep examples bounded.

### Source-Of-Truth Decision

Today Review owns the product-facing candidate/exclusion explanation snapshot. Source modules own their evidence; Today Review stores the consumed subset and reason mapping at run time.

### Frontend Contract

- Work inside `frontend/src/features/today-trade-review`.
- List page shows exclusion summaries by category and counts, plus selected examples.
- Candidate detail shows ranking components, hard blockers, readiness, signal evidence, calibration readiness, strategy proof, and trade-plan proof-chain context.
- No source-module page should be changed; use links to existing routes.

### Downstream Consumers

- `research-hub`: may later summarize Today Review readiness and blocker categories.
- `stock-research-workbench` or future thesis flow: may link from a candidate/excluded example into a research thesis.
- QA: validates all candidate states and no optimistic fallback.

### Forbidden Scope

No Market Data repair, no Signal Generation recalculation, no Calibration run, no Strategy Proof registry implementation, no Trade Plan generation, no portfolio/watchlist overlay, no run history diff, no advice/execution wording.

### Migration/Backward-Compat Risk

Low if JSON snapshots are additive. Existing runs without explainability should return empty summaries plus a `LEGACY_MISSING_EXPLAINABILITY` warning rather than failing.

### Implementation Split Recommendation

1. Today Review service reason taxonomy and snapshot tests.
2. Controller/DTO additions for latest/run/detail.
3. Today Review list/detail UI.
4. Focused UI smoke and backend tests.

### Conflict-Free Reserved Write-Scope Proposal

- WP-04 owner only: `backend/src/modules/today-trade-review/*`, `backend/tests/modules/today-trade-review/*`, `frontend/src/features/today-trade-review/*`, `frontend/tests/ui/today-trade-review.spec.ts`.
- Do not edit: Market Data, Signal Quality, Calibration, Strategy Framework, Trade Plan, Research Hub, Stock Research Workbench, `backend/prisma/schema.prisma`, or shared frontend files.

## C2-WP-05 - Research Thesis And Evidence Checklist

### Problem Framing

The app needs a private/local workflow that turns signals, review candidates, watchlist items, and stock pages into disciplined research notes. The thesis must record bull case, bear case, invalidation, catalyst, evidence checklist, status, review date, and references to current readiness/proof state without becoming a generic notes app or an advice/execution workflow.

### Target Module Boundary

- Primary owner: `stock-research-workbench`.
- Recommended module placement: extend Stock Research Workbench rather than create a new module for the first slice, because thesis notes are stock-centered research artifacts.
- Optional later links: Today Review, Research Hub, Watchlist, and Trade Plan may deep link into thesis creation after the core persistence/API is accepted.

### Public API/Data Contract

Add thesis endpoints under the existing research route family:

- `GET /api/v1/research/theses?region=IN&assetType=STOCK&status=ACTIVE_RESEARCH&instrumentId=...`
- `POST /api/v1/research/theses`
- `GET /api/v1/research/theses/:id`
- `PATCH /api/v1/research/theses/:id`
- `DELETE /api/v1/research/theses/:id` or soft archive only; recommended first slice is archive via status.
- Optional stock-local convenience: `GET /api/v1/research/stocks/:instrumentId/theses`

DTO shape:

```ts
type ResearchThesisStatus = "WATCH" | "ACTIVE_RESEARCH" | "INVALIDATED" | "DEFERRED" | "ARCHIVED";

type EvidenceChecklistItem = {
  code:
    | "DATA_READINESS"
    | "SIGNAL_QUALITY"
    | "CALIBRATION_READINESS"
    | "STRATEGY_PROOF"
    | "TODAY_REVIEW_BUCKET"
    | "TRADE_PLAN_PAPER_READINESS"
    | "COUNTER_EVIDENCE_REVIEWED"
    | "INVALIDATION_DEFINED";
  label: string;
  state: "PASS" | "LIMITED" | "BLOCKED" | "UNPROVEN" | "INSUFFICIENT_DATA" | "NOT_CHECKED";
  sourceModule?: string;
  sourceRef?: { route?: string; snapshotId?: string; generatedAt?: string };
  note?: string;
};

type ResearchThesis = {
  id: string;
  userId: string;
  instrumentId: string;
  symbol: string;
  companyName?: string | null;
  scope: { region: string; assetType: string };
  title: string;
  status: ResearchThesisStatus;
  bullCase: string;
  bearCase: string;
  invalidation: string;
  catalyst: string;
  evidenceChecklist: EvidenceChecklistItem[];
  linkedSources: Array<{
    sourceModule: string;
    sourceType: "TODAY_REVIEW_CANDIDATE" | "SIGNAL" | "STRATEGY_PROOF" | "TRADE_PLAN" | "WATCHLIST" | "RESEARCH_HUB" | "MANUAL";
    sourceId?: string;
    route?: string;
    snapshot?: unknown;
  }>;
  reviewDate: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Behavior rules:

- Authenticated user ownership is mandatory. A user can only read/update/archive their own theses.
- Checklist references are snapshots or source refs; they do not trigger generation, repair, backtests, or trade-plan creation.
- Status changes do not imply transaction advice.
- Text fields should have sane local length limits and validation.

### Database/Schema Implications

Required schema change:

- Add `ResearchThesis` with `userId`, `instrumentId`, symbol/company snapshots, `region`, `assetType`, `title`, `status`, `bullCase`, `bearCase`, `invalidation`, `catalyst`, `evidenceChecklist Json`, `linkedSources Json`, optional `reviewDate`, timestamps.
- Indexes: `[userId, status, updatedAt]`, `[userId, instrumentId, status]`, `[region, assetType, status]`.
- Relations should reference `User` and `Stock` with conservative delete behavior. Do not delete theses when upstream transient evidence changes.

### Source-Of-Truth Decision

Stock Research Workbench owns thesis content and checklist state. Source modules own evidence; thesis records store references/snapshots selected by the user or passed from source pages.

### Frontend Contract

- Work inside `frontend/src/features/stock-research-workbench`.
- Add a thesis panel to the stock research page and a lightweight thesis list/editor if route scope allows.
- Editor fields: title, status, bull case, bear case, invalidation, catalyst, review date, checklist.
- Optional create-from-source affordances in other modules are later slices; first slice should be usable from stock research pages.

### Downstream Consumers

- `research-hub`: later can show active thesis counts or stale review dates.
- `today-trade-review`: later can show whether a candidate has an active thesis.
- `watchlist-management`: later can link watchlist rows to theses.

### Forbidden Scope

No AI note generation, paid AI services, hosted storage, collaborative notes, broker/order workflows, portfolio transaction integration, recommendation language, generic rich-text editor expansion, or cross-module source edits in the first slice.

### Migration/Backward-Compat Risk

Medium because this requires a new table and authenticated ownership checks. Existing Stock Research Workbench responses remain backward-compatible if thesis endpoints are additive. There is no legacy thesis data to backfill.

### Implementation Split Recommendation

1. Schema owner adds `ResearchThesis` after WP-02 schema work is complete or in a single coordinated schema batch.
2. Stock Research backend CRUD, validation, ownership tests.
3. Stock Research frontend thesis list/editor/checklist.
4. Later optional links from Today Review or Research Hub after no-conflict reservation.

### Conflict-Free Reserved Write-Scope Proposal

- WP-05 owner only: `backend/src/modules/stock-research-workbench/*`, `backend/tests/modules/stock-research-workbench/*`, `frontend/src/features/stock-research-workbench/*`.
- Schema owner only when scheduled: `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, generated Prisma client.
- Do not edit: `research-hub`, `today-trade-review`, `watchlist-management`, `trade-plan-risk-engine`, shared route/navigation files in the first slice.

## Recommended First Implementation Wave

The conflict-free first wave should avoid two developers editing the same files and should assign `backend/prisma/schema.prisma` to one schema owner only.

### Wave 1A - Parallel Work With One Schema Owner

| Work packet | Developer lane | Reserved files | Notes |
| --- | --- | --- | --- |
| C2-WP-01 | Lane 1 Market Data | `backend/src/modules/market-data-foundation/*`, `backend/tests/modules/market-data-foundation/*`, `frontend/src/features/market-data-foundation/*`, `frontend/tests/ui/market-data-foundation.spec.ts` | No schema. Avoid Today Review edits. |
| C2-WP-02 | Lane 2 Signals | `backend/src/modules/signal-generation-engine/*`, `backend/tests/modules/signal-generation-engine/*`, `frontend/src/features/signal-generation-engine/*`, `frontend/tests/ui/signal-generation-engine.spec.ts` | Uses the single schema owner for audit fields/run table. |
| C2-WP-03 | Lane 2 Strategy Proof | `backend/src/modules/strategy-framework/*`, `backend/tests/modules/strategy-framework/*`, `frontend/src/features/strategy-framework/*`, `frontend/tests/ui/strategy-framework.spec.ts` | First slice must derive from existing `StrategyPerformanceSummary`; no schema in Wave 1A. |
| C2-WP-04 | Lane 3 Today Review | `backend/src/modules/today-trade-review/*`, `backend/tests/modules/today-trade-review/*`, `frontend/src/features/today-trade-review/*`, `frontend/tests/ui/today-trade-review.spec.ts` | Read-only upstream consumption only. |
| Schema Owner | Orchestrator/DB lane | `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, Prisma generation evidence | Applies only WP-02 schema in Wave 1A unless Orchestrator explicitly batches WP-05 too. |

Do not start C2-WP-05 implementation in Wave 1A unless the Orchestrator assigns the same schema owner to batch WP-02 and WP-05 schema changes before module developers branch from that schema. This is the cleanest way to prevent schema write conflicts.

### Wave 1B - Thesis Persistence After Schema Slot Clears

| Work packet | Developer lane | Reserved files | Notes |
| --- | --- | --- | --- |
| C2-WP-05 | Lane 3 Stock Research | `backend/src/modules/stock-research-workbench/*`, `backend/tests/modules/stock-research-workbench/*`, `frontend/src/features/stock-research-workbench/*` | Requires `ResearchThesis` schema and ownership tests. |
| Schema Owner | Orchestrator/DB lane | `backend/prisma/schema.prisma`, `backend/prisma/migrations/*`, Prisma generation evidence | Run after WP-02 schema merge unless intentionally batched. |

### Shared-File Lock Rules For The Wave

- Only the schema owner edits Prisma files.
- No module developer edits `frontend/src/app/routes.tsx`, `frontend/src/app/NavigationLayout.tsx`, `backend/src/api/routes.ts`, or shared frontend components without Orchestrator reservation.
- No downstream consumer edits are bundled into a source-module WP. Consumer wiring should be scheduled as separate slices after the producing contract is accepted.
- QA can draft and update QA plan files in parallel; developers should not edit QA files.

## Architecture Readiness Summary

- C2-WP-01: Architecture Ready, no schema blocker.
- C2-WP-02: Architecture Ready, schema-owner coordination required.
- C2-WP-03: Architecture Ready for derived first slice, no schema blocker.
- C2-WP-04: Architecture Ready, no schema blocker.
- C2-WP-05: Architecture Ready, but should wait for a schema slot or a single coordinated schema batch.

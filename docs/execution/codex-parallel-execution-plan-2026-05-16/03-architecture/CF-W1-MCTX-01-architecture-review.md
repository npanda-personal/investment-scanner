# CF-W1-MCTX-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate for one bounded module-local vertical slice. Not yet promoted for implementation.

This packet stays inside `market-context-intelligence` backend service/types/docs/service-test plus module-owned frontend types/page/widget/UI smoke coverage. It does not require Prisma, route-registry, shared helper, shared UI, provider/live data, Market Data source, or Data Quality Engine source edits for the first child.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MCTX-01-market-context-regime-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.repository.test.ts`
- `backend/src/modules/historical-context-snapshots/historical-context-snapshots.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/api/marketContextIntelligenceService.ts`
- `frontend/src/features/market-context-intelligence/hooks/useMarketContext.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

## Current Source Findings

- `market-context-intelligence.service.ts` already owns summary assembly for fresh generation, regime explanation, breadth denominators, and the fallback path where `summary()` auto-runs when no persisted snapshot exists.
- The current service collapses every non-empty generated summary into `dataStatus = PARTIAL`, so it cannot currently distinguish strong evidence, thin denominators, or missing evidence.
- `market-context-intelligence.repository.ts` returns persisted summaries but cannot reconstruct exact historical SMA50 and SMA200 denominator counts. It derives displayed breadth sample counts from persisted sector instrument totals, which is coherent enough for display but not exact denominator provenance.
- The repository read path does not expose whether the current response came from a persisted snapshot already present or from a fresh generation path triggered by `summary()`.
- `MarketContextPage.tsx` and `MarketRegimeWidget.tsx` already render the module-owned user-facing surface for regime, breadth, and macro framing. No frontend route or shared UI change is required to show additive evidence fields.
- The existing UI smoke test is module-local and can be widened to prove provenance, low-denominator framing, and missing-macro framing without touching shared Playwright helpers.
- Downstream consumers such as Historical Context, Strategy Decision, Research Hub, Today Review, and Calibration consume market-context outputs, but they currently read existing fields such as `regime`, `explanation`, and `dataStatus`. Additive evidence fields are backward-compatible for those callers.

## Module Boundary Review

`market-context-intelligence` owns this requirement.

Reasons:

- provenance ambiguity originates inside `summary()` and `latestPersistedSummary()`;
- denominator evidence is produced or interpreted inside `calculateBreadth()` and the persisted snapshot read path;
- the existing user-facing rendering already lives inside the same feature folder;
- downstream modules should consume additive evidence rather than rebuild trust framing.

Upstream modules stay read-only in this child:

- `market-data-foundation`
- `signal-generation-engine`

Downstream modules stay read-only in this child:

- `historical-context-snapshots`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `research-hub`
- `today-trade-review`
- `ai-investment-copilot`

## Architecture Decision

Prepare `CF-W1-MCTX-01` as one bounded `market-context-intelligence` vertical slice that adds additive evidence framing to the existing summary response and renders it on the existing Market Context page and regime widget.

The first child should introduce backend-owned evidence metadata equivalent to:

```ts
type RegimeEvidenceStatus =
  | 'TRUSTWORTHY'
  | 'PARTIAL'
  | 'LOW_EVIDENCE'
  | 'MISSING_EVIDENCE';

type SummaryProvenance =
  | 'PERSISTED_SNAPSHOT'
  | 'FRESH_GENERATED_SUMMARY';

type BreadthDenominatorSource =
  | 'LIVE_CALCULATED'
  | 'PERSISTED_SECTOR_COUNT_DERIVED'
  | 'UNAVAILABLE';

type MarketContextReasonCode =
  | 'PERSISTED_SNAPSHOT_USED'
  | 'SUMMARY_AUTO_GENERATED'
  | 'LOW_PRICE_SAMPLE'
  | 'LOW_SMA50_SAMPLE'
  | 'LOW_SMA200_SAMPLE'
  | 'SECTOR_SAMPLE_THIN'
  | 'SECTOR_EVIDENCE_MISSING'
  | 'MACRO_UNCONFIGURED'
  | 'BREADTH_UNAVAILABLE'
  | 'PRICE_HISTORY_UNAVAILABLE';

interface MarketContextEvidence {
  regimeEvidenceStatus: RegimeEvidenceStatus;
  provenance: {
    source: SummaryProvenance;
    persistedSnapshotAvailableAtStart: boolean;
    reasonSummary: string;
  };
  breadth: {
    priceSampleCount: number;
    sma50SampleCount: number | null;
    sma200SampleCount: number | null;
    denominatorSource: BreadthDenominatorSource;
    namedSectorCount: number;
  };
  missingComponents: string[];
  reasonCodes: MarketContextReasonCode[];
  reasonSummary: string;
}
```

The exact type names can differ, but the semantics must stay stable and additive.

Recommended first-pass behavior:

- `summary()` must distinguish persisted-versus-fresh provenance explicitly.
- `summary()` should stop losing fresh denominator evidence on the auto-generation path. The service can do this by building a fresh summary in-memory, persisting it, and returning the fresh response directly instead of re-reading a denominator-thinned persisted snapshot immediately.
- `latestPersistedSummary()` should enrich persisted reads with provenance `PERSISTED_SNAPSHOT` and denominator source `PERSISTED_SECTOR_COUNT_DERIVED`.
- Persisted summaries that only have sector-derived denominator counts must not claim `TRUSTWORTHY`; they should render as `PARTIAL` unless a later approved storage path persists exact denominators.
- Missing macro must remain explicit through `macro.dataStatus = MISSING` plus a stable `MACRO_UNCONFIGURED` evidence reason. Macro absence should not be implied as live coverage.
- The frontend should render the additive evidence as an evidence block or chip cluster on the existing page/widget, not as a new route or shared component.

## Exact Future File Reservations

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.repository.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.controller.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.router.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.validation.ts`
- `backend/src/modules/market-context-intelligence/index.ts`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/features/market-context-intelligence/routes.tsx`
- `frontend/src/features/market-context-intelligence/api/marketContextIntelligenceService.ts`
- `frontend/src/features/market-context-intelligence/hooks/useMarketContext.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/historical-context-snapshots/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/shared/**`
- `frontend/src/shared/**`
- package manifests
- generated files
- provider files
- live-provider or service execution changes
- broad UX/navigation work outside the module-owned page and widget

## Explicit Blocker Boundary

No schema, route, shared-helper, provider/live-data, Market Data source, DQE source, frontend route, shared UI, or package blocker exists for the bounded first child.

Explicit future blocker:

- If Product Owner acceptance later requires exact persisted SMA50/SMA200 denominator counts or durable stored provenance that survives persisted-only reads without `PERSISTED_SECTOR_COUNT_DERIVED` framing, that becomes a separate approval-gated repository plus Prisma/schema path and is out of scope for this child.

## QA Handoff Notes For Team 04

Focused QA should cover both backend and module-owned UI:

- persisted snapshot path returns `provenance.source = PERSISTED_SNAPSHOT` and shows denominator source as derived, not live;
- auto-generated summary path returns `provenance.source = FRESH_GENERATED_SUMMARY` and preserves exact fresh SMA denominator counts;
- strong fresh evidence can surface `TRUSTWORTHY` even while macro stays explicitly missing as a separate missing component;
- low sample denominators surface `LOW_EVIDENCE` with stable reason codes and no overconfident regime copy;
- no price history or breadth evidence surfaces `MISSING_EVIDENCE`;
- persisted denominator-derived summaries surface `PARTIAL`, not `TRUSTWORTHY`;
- Market Context page and Market Regime widget both render provenance, evidence status, denominator framing, and missing macro evidence without shared UI changes;
- existing fields remain present and backward-compatible.

Suggested future focused commands after implementation:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
```

## Ready Recommendation

`Ready candidate`

Reason:

- the smallest user-visible slice fits entirely inside one module;
- existing service and page/widget surfaces already own the needed behavior;
- additive evidence framing is possible without schema, route, shared, provider/live, Market Data, or DQE edits;
- the only high-risk extension point is exact persisted denominator durability, which is explicitly deferred behind a later approval-gated path.

# CF-W1-MCTX-01 Market Context Regime Evidence Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for one bounded module-local vertical slice. Not yet promoted for implementation.

## Contract Intent

Market Context must explain what evidence drove the current regime label, whether the response came from a persisted snapshot or a fresh summary-generation fallback, how strong the breadth denominators are, and which components remain missing or intentionally partial.

This contract must make the existing market-context surface more trustworthy without changing the underlying regime math, without widening into shared architecture, and without implying live macro coverage.

## Ownership

`market-context-intelligence` owns this behavior.

Upstream modules remain read-only evidence providers:

- `market-data-foundation`
- `signal-generation-engine`

Downstream modules remain read-only consumers:

- `historical-context-snapshots`
- `signal-calibration-engine`
- `strategy-decision-engine`
- `research-hub`
- `today-trade-review`
- `ai-investment-copilot`

## Required Source Boundary

Implementation must stay inside:

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

Forbidden:

- repository, controller, router, validation, index, schema, route-registry, shared utility, shared UI, provider/live-data, package, generated, Market Data source, DQE source, Historical Context source, Calibration source, and broad UX/navigation scope.

## Required Additive Contract

Additive metadata must be equivalent to:

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

interface MarketContextSummary {
  regime: MarketRegimeSummary;
  topSectors: SectorRotationItem[];
  weakSectors: SectorRotationItem[];
  breadth: MarketBreadth;
  countryStrength: CountryStrengthItem[];
  macro: MacroSnapshot;
  explanation: string[];
  updatedAt: string;
  dataStatus: DataStatus;
  evidence: MarketContextEvidence;
}
```

Exact property names can differ, but the semantics must remain stable and additive.

## Required Mapping Rules

- `PERSISTED_SNAPSHOT` means a snapshot already existed when the request began.
- `FRESH_GENERATED_SUMMARY` means `summary()` had to generate context because no persisted snapshot existed.
- `LIVE_CALCULATED` means denominator counts came directly from the current in-memory breadth calculation.
- `PERSISTED_SECTOR_COUNT_DERIVED` means persisted breadth percentages are being framed against currently reconstructable sector-count totals rather than exact stored SMA denominators.
- `UNAVAILABLE` means denominator evidence cannot be reconstructed and must not be implied.

Evidence-state rules:

- `TRUSTWORTHY` is allowed only when regime inputs are strong, breadth denominator evidence is explicit, and denominator source is not `PERSISTED_SECTOR_COUNT_DERIVED`.
- `PARTIAL` must be used when the response is bounded but incomplete, including persisted reads with derived denominator evidence.
- `LOW_EVIDENCE` must be used when price sample, SMA50 sample, SMA200 sample, or named-sector support is present but too thin for confident framing.
- `MISSING_EVIDENCE` must be used when breadth/price evidence is absent enough that the regime label would otherwise outrun its evidence base.

Reason-code rules:

- `MACRO_UNCONFIGURED` must remain explicit while macro providers are unconfigured.
- `SUMMARY_AUTO_GENERATED` must appear on fresh fallback summaries.
- `PERSISTED_SNAPSHOT_USED` must appear on persisted reads.
- low-sample reason codes must be stable and backend-owned.
- missing-evidence reason codes must not be hidden behind generic explanation strings only.

## Required Service Rules

- `summary()` must not lose fresh denominator evidence on the auto-generation path. It may persist the generated summary, but it should return the fresh evidence-rich response directly rather than immediately downgrading to a repository-derived persisted reconstruction.
- `latestPersistedSummary()` must return the same additive evidence object with persisted provenance.
- Existing response fields such as `regime`, `breadth`, `macro`, `explanation`, `updatedAt`, and `dataStatus` must remain present and backward-compatible.
- Existing route shapes and query params must remain unchanged.

## Required UI Rules

- Use only the module-owned `MarketContextPage` and `MarketRegimeWidget`.
- Surface evidence state, provenance, denominator framing, and missing macro context directly on those existing surfaces.
- Do not introduce new routes, shared UI components, or marketing-style explanatory layouts.
- UI wording must stay research-support oriented and avoid overconfident phrasing.

## Explicit Non-Goals

- No regime-score rewrite.
- No provider expansion.
- No Prisma/schema changes.
- No route-registry changes.
- No shared helper or shared UI changes.
- No Market Data Foundation or Data Quality Engine source changes.
- No frontend navigation or broad UX redesign beyond the module-owned page/widget evidence framing.

## Explicit Blocker Boundary

The bounded first child is not blocked.

Later blocked path:

- exact persisted SMA denominator storage, durable provenance persistence, or repository-backed exact historical denominator reconstruction requires a separate approval-gated repository plus Prisma/schema contract and must not be smuggled into this child.

## Test Contract

Focused tests must prove:

- persisted read provenance and derived-denominator framing;
- fresh fallback provenance and preserved live denominators;
- trustworthy, partial, low-evidence, and missing-evidence states;
- stable reason codes for low sample, missing breadth, missing price history, and macro unconfigured;
- additive backward compatibility of existing backend fields;
- UI visibility of evidence status, provenance, denominator source, and missing macro framing on both the page and widget.

## Ready Recommendation

`Ready candidate`

This contract is narrow enough for Team 04 QA planning and Team 00 Ready evaluation without schema, route, shared, provider/live, Market Data, DQE, package, or generated-file approval.

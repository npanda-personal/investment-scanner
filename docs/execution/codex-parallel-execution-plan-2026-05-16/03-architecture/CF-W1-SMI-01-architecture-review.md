# CF-W1-SMI-01 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready candidate architecture packet prepared. Team 04 QA planning and Team 00 sequencing are still required before any implementation handoff.

The smallest feasible first child is a backend-only, module-local `smart-money-intelligence` evidence-framing slice. Current source supports additive freshness, provenance, ownership-gap, and downstream-safe semantics without Prisma/schema changes, route-registry edits, shared utility changes, Market Data source changes, Data Quality source changes, provider/live-data work, startup/backfill work, package changes, generated-file changes, or frontend implementation.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-current-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-INTEL-03-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MCTX-01-market-context-regime-evidence-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-INTEL-03-work-packet.md`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.routes.test.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.validation.test.ts`
- `frontend/src/features/smart-money-intelligence/types.ts`
- `frontend/src/features/smart-money-intelligence/components/SmartMoneyIntelligencePage.tsx`

## Current Source Findings

- `smart-money-intelligence.service.ts` already separates the bounded downstream-safe persisted read path from the module-owned fallback path:
  - `latestPersistedStock()` and `latestPersistedStocks()` read persisted snapshots only.
  - `stock()` falls back to on-demand calculation and persistence when today's snapshot is missing.
- `smart-money-intelligence.repository.ts` constrains persisted reads to the current daily `snapshotDate` key and already returns `updatedAt`, `range`, `dataStatus`, `signals`, and ownership placeholder JSON without requiring new persistence fields for a first trust-framing child.
- Missing insider and institutional ownership is already explicit in both `health()` notes and the default `missingOwnership()` payload, but that gap is folded only into coarse `dataStatus` / `confidence` today.
- `SmartMoneyStockSummary` has no additive evidence object for persisted-vs-derived provenance, downstream-safe usage, ownership-gap trust framing, or freshness/currentness semantics.
- `top()` and `distribution()` currently pass repository results through without enriching them with freshness/trust metadata.
- The current frontend page already displays score, status, explanation, and ownership placeholder text, but the assignment explicitly blocks frontend implementation in this first child.

## Module Boundary Review

`smart-money-intelligence` owns the bounded first child.

Reasons:

- the requirement is about evidence framing over already-owned Smart Money summaries, not about changing price ingestion, Data Quality scoring, provider integration, or cross-module trust aggregation;
- the service already has the exact ownership split needed for the public semantics:
  - persisted-only downstream-safe reads;
  - on-demand detail fallback for intentional Smart Money inspection;
- additive response enrichment can stay inside service/types/doc/service-test boundaries.

No Market Data Foundation source change or Data Quality Engine source change is required for the first child.

## Architecture Decision

Prepare `CF-W1-SMI-01` as a backend-only Smart Money evidence-framing child that enriches existing stock/list outputs with additive freshness, provenance, ownership-gap, and downstream-safe metadata.

The first child should:

- keep all implementation inside `smart-money-intelligence.service.ts`, `smart-money-intelligence.types.ts`, module docs, and focused service tests;
- preserve current route shapes and existing summary fields;
- enrich persisted rows in service code instead of changing repository persistence shape;
- keep downstream-safe semantics tied to `latestPersistedStock()` / `latestPersistedStocks()` only;
- keep `stock()` fallback behavior module-owned and explicit as limited-trust, on-demand derived context;
- defer frontend surfacing, repository changes, exact candle-date durability, and provider expansion.

## Recommended Additive Shape

Recommended additive response fields:

```ts
type SmartMoneyEvidenceStatus = 'USABLE' | 'LIMITED' | 'UNAVAILABLE';

type SmartMoneyFreshnessStatus =
  | 'CURRENT'
  | 'STALE'
  | 'UNKNOWN';

type SmartMoneyEvidenceSource =
  | 'PERSISTED_SNAPSHOT'
  | 'ON_DEMAND_DERIVED';

type SmartMoneyDataThroughBasis =
  | 'SNAPSHOT_DATE'
  | 'LAST_PRICE_BAR_DATE'
  | 'UNAVAILABLE';

type SmartMoneyOwnershipTrustStatus =
  | 'COMPLETE'
  | 'PARTIAL_OWNERSHIP_GAP';

type SmartMoneyEvidenceReasonCode =
  | 'PERSISTED_SNAPSHOT_USED'
  | 'ON_DEMAND_FALLBACK_USED'
  | 'SNAPSHOT_CURRENT'
  | 'SNAPSHOT_STALE'
  | 'OWNERSHIP_PLACEHOLDER'
  | 'INSUFFICIENT_PRICE_HISTORY'
  | 'DATA_THROUGH_FROM_SNAPSHOT_DATE'
  | 'DATA_THROUGH_FROM_LAST_PRICE_BAR'
  | 'DOWNSTREAM_PERSISTED_ONLY';

interface SmartMoneyEvidence {
  evidenceStatus: SmartMoneyEvidenceStatus;
  freshnessStatus: SmartMoneyFreshnessStatus;
  provenance: {
    source: SmartMoneyEvidenceSource;
    persistedSnapshotAvailableAtRequestStart: boolean;
    downstreamSafe: boolean;
    reasonSummary: string;
  };
  coverage: {
    requestedRange: SmartMoneyRange;
    snapshotDate: string | null;
    dataThroughDate: string | null;
    dataThroughBasis: SmartMoneyDataThroughBasis;
    rangeLabel: string;
  };
  ownershipTrust: {
    status: SmartMoneyOwnershipTrustStatus;
    ownershipDataStatus: SmartMoneyDataStatus;
    reasonSummary: string;
  };
  reasonCodes: SmartMoneyEvidenceReasonCode[];
  reasonSummary: string;
}

interface SmartMoneyStockSummary {
  // existing fields preserved
  evidence: SmartMoneyEvidence;
}
```

Exact property names can differ, but the semantics must remain stable and additive.

## Bounded Inference Rules

- Persisted list and stock reads are daily-snapshot reads already constrained by repository `snapshotDate = today`. For this first child, `coverage.snapshotDate` may be derived from that current daily snapshot boundary without repository/source changes.
- `coverage.dataThroughDate` should be explicit about its basis:
  - persisted snapshot read: snapshot-scoped date using `SNAPSHOT_DATE`;
  - on-demand fallback path: latest loaded bar date using `LAST_PRICE_BAR_DATE`;
  - insufficient-data fallback: `null` with `UNAVAILABLE`.
- Exact durable candle-level coverage dates for persisted rows are deferred. If Product Owner later requires persisted first-bar / last-bar durability rather than snapshot-scoped evidence, that is a separate repository plus schema discussion and is not part of this child.

## Exact Future File Reservations

Allowed files after Team 00 promotion:

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

## Forbidden Files

- all application source and tests before Team 00 promotion
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.controller.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.router.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.validation.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.provider.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.module.ts`
- `backend/src/modules/smart-money-intelligence/index.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.routes.test.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.validation.test.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/api/routes.ts`
- `frontend/src/features/smart-money-intelligence/**`
- `frontend/tests/ui/**`
- `frontend/src/app/routes.tsx`
- shared backend utilities
- shared frontend components
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- package manifests
- generated files
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry scope

## Dependency And Conflict Notes

- No schema, route, shared utility, Market Data source, Data Quality source, provider, package, generated-file, or frontend blocker was found for the bounded first child.
- No active `smart-money-intelligence` implementation writer was visible in the provided current assignment context during this pass.
- Team 00 must still preserve the single-writer rule if another Smart Money child or same-module follow-on is opened later.
- `CF-W1-MD-02`, `CF-W1-HCTX-01`, and `CF-W1-MCTX-01` remain semantic alignment references only. They do not block the bounded Smart Money child.

## QA Planning Handoff For Team 04

Team 04 can start QA planning now for the backend-only first child.

Minimum backend scenarios:

- persisted snapshot row on the current daily snapshot boundary returns:
  - `PERSISTED_SNAPSHOT` provenance;
  - `CURRENT` freshness;
  - `LIMITED` evidence when ownership placeholders are still missing;
  - visible `snapshotDate`, `dataThroughDate`, `dataThroughBasis`, and `requestedRange`;
- persisted snapshot row with stale `updatedAt` is framed as stale/limited rather than silently trusted;
- `latestPersistedStock()` returns `null` when no persisted snapshot exists and does not trigger on-demand calculation or persistence;
- `stock()` missing persisted snapshot returns on-demand derived context only when the Smart Money module intentionally inspects detail, with `ON_DEMAND_DERIVED` provenance and `downstreamSafe = false`;
- insufficient-data fallback remains `INSUFFICIENT_DATA` and maps to `UNAVAILABLE` evidence;
- `top()` and `distribution()` preserve ranking/order while adding stable evidence framing to each returned row.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

Team 04 should explicitly record that frontend surfacing is intentionally out of scope for this first child.

## Readiness Result

Ready candidate.

- The smallest module-local first child is feasible.
- No split is required inside the bounded first child itself.
- The child is backend-only by design.
- Schema, route, shared utility/UI, Market Data source, Data Quality source, provider/live-data, startup/backfill, package, generated-file, and frontend implementation remain explicitly blocked.
- Team 04 QA planning is the next gate.

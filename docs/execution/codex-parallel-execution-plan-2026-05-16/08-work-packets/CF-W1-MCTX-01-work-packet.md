# CF-W1-MCTX-01 Work Packet

Date: 2026-05-18

## Work Item

Market Context regime evidence and partial-context framing.

## State

Ready candidate for one bounded module-local vertical slice. Not yet promoted for implementation.

This slice is intentionally additive. It adds evidence framing to the existing Market Context summary and renders that framing on the existing Market Context page and regime widget.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 00-assigned Lane 1 implementation team
- Lane: Lane 1
- Module: `market-context-intelligence`

## Allowed Files After Ready Promotion

- `backend/src/modules/market-context-intelligence/market-context-intelligence.service.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.types.ts`
- `backend/src/modules/market-context-intelligence/market-context-intelligence.md`
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`
- `frontend/src/features/market-context-intelligence/types.ts`
- `frontend/src/features/market-context-intelligence/components/MarketContextPage.tsx`
- `frontend/src/features/market-context-intelligence/components/MarketRegimeWidget.tsx`
- `frontend/tests/ui/market-context-intelligence.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
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
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider files
- live-provider, build, service-start, UI-smoke execution, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add additive market-context evidence metadata that distinguishes trustworthy, partial, low-evidence, and missing-evidence regime states;
- expose persisted-versus-fresh provenance explicitly;
- preserve exact fresh breadth denominators on the auto-generation path instead of collapsing them into persisted sector-derived counts immediately;
- clearly label persisted breadth denominator source as derived when exact stored SMA denominators are unavailable;
- keep macro explicitly missing with stable reason framing;
- render the new evidence on the existing Market Context page and Market Regime widget without broad UX expansion;
- preserve current routes, query params, and existing response fields.

## Dependency Notes

- Primary owner is `market-context-intelligence`.
- The first slice consumes existing Market Data and Signal Generation public behavior read-only.
- Existing page/widget surfaces and the existing Playwright spec are enough for user-visible framing; no route or shared UI work is needed.
- Downstream consumers may ignore the additive evidence fields safely.

## QA Handoff Notes For Team 04

Team 04 should prepare focused backend and UI QA for:

- persisted summary path using a preexisting snapshot and showing `PERSISTED_SNAPSHOT`;
- fresh auto-generated summary path showing `FRESH_GENERATED_SUMMARY`;
- strong fresh denominator evidence versus thin-denominator low-evidence framing;
- missing breadth or price history framing as `MISSING_EVIDENCE`;
- persisted denominator-derived framing as `PARTIAL`, not `TRUSTWORTHY`;
- stable reason-code copy for macro unconfigured and sample weakness;
- existing Market Context page and Market Regime widget visibility;
- additive backward compatibility of existing summary fields.

Suggested future focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- market-context-intelligence.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- market-context-intelligence.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema or migration changes;
- repository, controller, router, validation, route-registry, or shared-helper edits;
- Market Data Foundation or Data Quality Engine source changes;
- provider/live-data work;
- package or generated-file changes;
- frontend route/shared UI changes;
- exact persisted denominator durability beyond derived framing;
- broad UX redesign outside the module-owned page/widget.

## Next Gate

Team 04 QA planning, then Team 00 sequencing and Ready promotion review. Team 03 does not self-promote implementation.

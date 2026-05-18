# CF-W1-L3-INTEL-03 Work Packet

Date: 2026-05-18

## Work Item

Portfolio Intelligence concentration review.

## State

Architecture packet prepared. Ready candidate after Team 04 QA planning and Team 00 sequencing.

This is a bounded `portfolio-intelligence` vertical slice. It stays inside the `portfolio-intelligence` backend module, the `portfolio-intelligence` frontend feature, module docs, and focused module/UI tests.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 07 Portfolio / Watchlists / Alerts
- Lane: Lane 3
- Backend module: `portfolio-intelligence`
- Frontend feature: `portfolio-intelligence`

## Allowed Files After Ready Promotion

- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.service.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.types.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.md`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.service.test.ts`
- `frontend/src/features/portfolio-intelligence/types.ts`
- `frontend/src/features/portfolio-intelligence/components/PortfolioIntelligencePanel.tsx`
- optional new focused UI smoke: `frontend/tests/ui/portfolio-intelligence.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.router.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.controller.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.repository.ts`
- `backend/src/modules/portfolio-intelligence/portfolio-intelligence.validation.ts`
- `backend/tests/modules/portfolio-intelligence/portfolio-intelligence.routes.test.ts`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/features/portfolio-intelligence/api/portfolioIntelligenceService.ts`
- `frontend/src/features/portfolio-intelligence/hooks/usePortfolioIntelligence.ts`
- `frontend/src/features/portfolio-intelligence/routes.tsx`
- shared backend utilities
- shared frontend components
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- package manifests
- generated files
- optimizer, rebalance, tax, broker, provider/startup, paid/cloud, or telemetry flows

## Required Behavior

Future implementation must:

- add additive concentration-review fields to the existing Portfolio Intelligence response;
- derive holding, sector, and country concentration review from existing summary/allocation inputs only;
- rank exposures deterministically and explain why each one deserves review;
- keep the user-visible work inside the existing Portfolio Intelligence panel;
- preserve existing routes, hooks, API calls, and current response fields;
- avoid optimizer, rebalance, and advice language.

## Sequencing Rule

Do not promote or implement this packet in parallel with:

- `CF-W1-L3-INTEL-01`
- `CF-W1-L3-INTEL-02`

Reason:

- all three packets reserve the same core `portfolio-intelligence` backend writer set;
- concurrent promotion would violate the single-writer rule and blur reliability, traceability, and concentration-review scopes.

Preferred order:

1. trust/readiness work (`CF-W1-L3-PORT-01A`, then `CF-W1-L3-INTEL-01` / `CF-W1-L3-INTEL-02`) when Team 00 wants trust-first sequencing
2. concentration review in its own writer pass, or a deliberate combined `INTEL` packet if Team 00 chooses one merged implementation

## QA Handoff Needed

Team 04 can start QA planning now.

Minimum scenarios:

- dominant holding concentration becomes the top review item when threshold and review evidence are both present;
- sector concentration is surfaced with affected symbols and deterministic ordering;
- country concentration is surfaced only when existing thresholds justify review;
- too-few-holdings state shows diversification watch without optimizer language;
- the Portfolio Intelligence panel renders the new concentration-review section on the current detail surface;
- existing health score, review ranking, red flags, grouped summaries, and empty state remain intact.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- portfolio-intelligence.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run test:ui -- portfolio-intelligence.spec.ts --workers=1
npm.cmd run build
```

If no focused UI smoke is added, Team 04 should record that exact gap and keep the user-visible regression risk explicit.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- `portfolio-management` source changes;
- schema, migration, or generated-type changes;
- route-registry edits;
- shared UI extraction;
- optimizer, rebalance, or transaction-side behavior;
- broad frontend navigation changes;
- combining this packet with another `portfolio-intelligence` packet without an explicit one-writer plan.

## Notes For Team 00

- This packet is a genuine bounded first child. No architecture split is required inside the concentration-review requirement itself.
- The only material coordination risk is same-file sequencing with `CF-W1-L3-INTEL-01` and `CF-W1-L3-INTEL-02`.
- If Team 00 wants the cleanest review path, combine all chosen `portfolio-intelligence` contract work into one writer pass instead of reopening the same files repeatedly.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

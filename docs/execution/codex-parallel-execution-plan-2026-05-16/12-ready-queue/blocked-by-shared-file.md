# Blocked By Shared / High-Risk File

Date: 2026-05-18

| ID | Shared/high-risk file or boundary | Why blocked |
| --- | --- | --- |
| CF-W1-MD-02 | Prisma schema / OHLC storage model | Option B ADR direction is approved, but durable evidence implementation may need schema/natural-key changes and remains blocked until a separate implementation slice is approved. |
| CF-W1-STRAT-02 | Prisma `StrategyDefinition` uniqueness | Version-keyed definitions likely require schema/storage decision. |
| CF-W1-TP-01 | Trade Plan target geometry / frontend display model | Full migration may require Trade Plan source, API semantics, and UI contract decisions. |
| CF-W1-UX-05 | `frontend/src/shared/**` | Shared `StatusBadge` language/color mapping requires shared UI reservation. |
| CF-W1-UX-02 | `frontend/src/app/navigationMetadata.tsx`, `frontend/src/app/routes.tsx`, shared UI surfaces | Copilot naming/navigation and trust surface changes need UX/product approval and shared-file reservation. |
| CF-W1-L3-AUTH-EVENT-DIRECT-OWNER | `backend/prisma/schema.prisma` if direct alert event ownership is selected later | Direct `AlertEvent.userId` remains a future schema/migration decision; the accepted `CF-W1-L3-AUTH-02` slice used parent rule ownership and is no longer blocked here. |
| CF-W1-MD-STARTUP | `backend/src/server.ts`, `.env.example`, scheduler/backfill | Startup/provider-heavy behavior remains excluded. |

## Team 00 Routing Note - 2026-05-18

Current near-ready inspection targets are expected to avoid shared/high-risk files:

- `CF-W1-L3-PORT-01A` should stay inside portfolio-management module files if it becomes Ready.
- `CF-W1-TP-01B` should stay inside trade-plan-risk-engine module files if it becomes Ready.
- `CF-W1-NOTIF-02` should stay inside notifications-delivery provider/service test/module docs if it becomes Ready.
- `CF-W1-L3-ALERT-01` should stay inside alerts-monitoring module files if it becomes Ready.

If any inspection reveals a need for Prisma, route registries, shared utilities/UI, packages, generated files, startup/backfill, providers, frontend/UI, or another team's file, Team 00 must keep the item out of Ready and route the blocker.

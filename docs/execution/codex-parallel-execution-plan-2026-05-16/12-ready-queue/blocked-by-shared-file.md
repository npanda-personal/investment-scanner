# Blocked By Shared / High-Risk File

Date: 2026-05-18

| ID | Shared/high-risk file or boundary | Why blocked |
| --- | --- | --- |
| CF-W1-MD-02 | Prisma schema / OHLC storage model | Option B ADR direction is approved, but durable evidence implementation may need schema/natural-key changes and remains blocked until a separate implementation slice is approved. |
| CF-W1-DQ-02-RS1 | DQE read-side/public currentness contract | Team 03 prepared a bounded no-schema read-time reconstruction packet inside DQE repository/service/types/docs/tests only. Implementation remains blocked until Team 04 accepts the QA plan and Team 00 records Ready promotion. Controller/router, route registry, Prisma/schema, Market Data writers, shared utilities, frontend, provider/startup/backfill, packages, and generated files remain forbidden unless separately approved. |
| CF-W1-STRAT-02 | Prisma `StrategyDefinition` uniqueness | Version-keyed definitions likely require schema/storage decision. |
| CF-W1-TP-01 | Trade Plan target geometry / frontend display model | Full migration may require Trade Plan source, API semantics, and UI contract decisions. |
| CF-W1-UX-05 | `frontend/src/shared/**` | Option A resolved the first slice as Copilot-only; shared `StatusBadge` language/color mapping remains future and requires separate shared UI reservation. |
| CF-W1-UX-02 | `frontend/src/app/navigationMetadata.tsx`, `frontend/src/app/routes.tsx`, shared UI surfaces | Option B resolved the first slice as Copilot-only; shared UI/navigation files remain forbidden without separate reservation. |
| CF-W1-AUTH-01 | shared auth middleware, route registries, Prisma/schema remain forbidden; overlapping subscription controller/test/doc files with `CF-W1-SUB-01` | Team 00 resolved the overlap by promoting combined handoff `CF-W1-AUTH-SUB-01` to one Team 09 writer. Shared auth/route/schema changes remain forbidden without separate approval. |
| CF-W1-SUB-01 | route registries, Prisma/schema, frontend/shared UI, package manifests remain forbidden; overlapping subscription controller/test/doc files with `CF-W1-AUTH-01` | Team 00 resolved the overlap by promoting combined handoff `CF-W1-AUTH-SUB-01` to one Team 09 writer. Frontend mismatch remains a known limitation or future UX item. |
| CF-W1-MD-01 | durable storage, Prisma/schema, shared utilities, providers/startup/backfill | Option A permits future validation source/tests only after Ready promotion; durable readiness storage and provider/startup behavior remain out of scope. |
| CF-W1-L3-AUTH-EVENT-DIRECT-OWNER | `backend/prisma/schema.prisma` if direct alert event ownership is selected later | Direct `AlertEvent.userId` remains a future schema/migration decision; the accepted `CF-W1-L3-AUTH-02` slice used parent rule ownership and is no longer blocked here. |
| CF-W1-MD-STARTUP | `backend/src/server.ts`, `.env.example`, scheduler/backfill | Startup/provider-heavy behavior remains excluded. |

## Team 00 Routing Note - 2026-05-18

Current near-ready inspection targets are expected to avoid shared/high-risk files:

- `CF-W1-L3-PORT-01A` is promoted to Ready only within the reserved portfolio-management module files and remains blocked from any shared/high-risk file.
- `CF-W1-TP-01B` should stay inside trade-plan-risk-engine module files if it becomes Ready.
- `CF-W1-NOTIF-02` should stay inside notifications-delivery provider/service test/module docs if it becomes Ready.
- `CF-W1-L3-ALERT-01` should stay inside alerts-monitoring module files if it becomes Ready.
- `CF-W1-AUTH-01` and `CF-W1-SUB-01` should stay inside Team 09 module-local controller/source/tests if later promoted.
- `CF-W1-UX-02` and `CF-W1-UX-05` should stay Copilot-only if later promoted; no shared UI or navigation.
- `CF-W1-MD-01` should stay inside Market Data validation source/tests if later promoted.

If any inspection reveals a need for Prisma, route registries, shared utilities/UI, packages, generated files, startup/backfill, providers, frontend/UI, or another team's file, Team 00 must keep the item out of Ready and route the blocker.

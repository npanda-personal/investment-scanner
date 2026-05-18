# Blocked By Shared / High-Risk File

Date: 2026-05-18

| ID | Shared/high-risk file or boundary | Why blocked |
| --- | --- | --- |
| CF-W1-MD-02 | Prisma schema / OHLC storage model | Option B ADR direction is approved, but durable evidence implementation may need schema/natural-key changes and remains blocked until a separate implementation slice is approved. |
| CF-W1-STRAT-02 | Prisma `StrategyDefinition` uniqueness | Version-keyed definitions likely require schema/storage decision. |
| CF-W1-TP-01 | Trade Plan target geometry / frontend display model | Full migration may require Trade Plan source, API semantics, and UI contract decisions. |
| CF-W1-UX-05 | `frontend/src/shared/**` | Option A resolved the first slice as Copilot-only; shared `StatusBadge` language/color mapping remains future and requires separate shared UI reservation. |
| CF-W1-UX-02 | `frontend/src/app/navigationMetadata.tsx`, `frontend/src/app/routes.tsx`, shared UI surfaces | Option B resolved the first slice as Copilot-only; shared UI/navigation files remain forbidden without separate reservation. |
| CF-W1-AUTH-01 | shared auth middleware, route registries, Prisma/schema; overlapping subscription controller/test/doc files with `CF-W1-SUB-01` | Option A permits protected Team 09 controller fail-closed work only if module-local; shared auth/route/schema changes remain forbidden without separate approval. If promoted separately from `CF-W1-SUB-01`, Team 00 must sequence one writer at a time. |
| CF-W1-SUB-01 | route registries, Prisma/schema, frontend/shared UI, package manifests; overlapping subscription controller/test/doc files with `CF-W1-AUTH-01` | Option A permits backend-first module-local policy work only; frontend mismatch must be recorded as a known limitation or separate UX item. If promoted separately from `CF-W1-AUTH-01`, Team 00 must sequence one writer at a time. |
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

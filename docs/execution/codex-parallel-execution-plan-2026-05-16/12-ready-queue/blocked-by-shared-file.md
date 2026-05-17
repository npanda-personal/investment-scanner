# Blocked By Shared / High-Risk File

Date: 2026-05-17

| ID | Shared/high-risk file or boundary | Why blocked |
| --- | --- | --- |
| CF-W1-MD-02 | Prisma schema / OHLC storage model | Durable evidence may need schema/natural-key changes. |
| CF-W1-L3-AUTH-02 | Prisma `AlertEvent` / alert ownership model | Direct `userId` on events may require schema change; alternatives need architecture decision. |
| CF-W1-STRAT-02 | Prisma `StrategyDefinition` uniqueness | Version-keyed definitions likely require schema/storage decision. |
| CF-W1-UX-05 | `frontend/src/shared/**` | Shared `StatusBadge` language/color mapping requires shared UI reservation. |
| CF-W1-MD-STARTUP | `backend/src/server.ts`, `.env.example`, scheduler/backfill | Startup/provider-heavy behavior remains excluded. |


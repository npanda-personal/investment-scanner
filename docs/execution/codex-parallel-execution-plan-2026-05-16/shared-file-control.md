# Shared File And Contract Control

Shared files are single-writer surfaces. Module teams may inspect them, but edits require explicit reservation by the Orchestrator and approval by the Solution Architect where noted.

| Shared Item | Paths | Owner | Approval Needed | Parallel Policy | Review Gate |
|---|---|---|---|---|---|
| Prisma schema and migrations | `backend/prisma/schema.prisma`, `backend/prisma/migrations/` | Solution Architect | Architect + PO for schema behavior | no parallel edits | DB/schema review + QA |
| Backend route registry | `backend/src/api/routes.ts` | Orchestrator | Orchestrator + Architect | one integration owner | route/API review |
| Frontend route registry | `frontend/src/app/routes.tsx` | Orchestrator + UX | Orchestrator + UX/Architect | one integration owner | UX route smoke |
| Shared backend utilities | `backend/src/shared` | Solution Architect | Architect | one utility owner | cross-module test review |
| Market scope helpers | `backend/src/shared/utils/market-scope.ts`, `frontend/src/contexts/MarketScopeContext.tsx` | Solution Architect | Architect + QA | serialized | scope regression |
| Shared frontend components | `frontend/src/shared/components`, `frontend/src/shared/hooks`, `frontend/src/shared/theme` | UX + Architect | UX + Architect | serialized | UI smoke/build |
| Auth middleware/context | `auth-identity`, protected routes | Auth Identity + Architect | Architect + QA | serialized for shared behavior | auth/user-owned checks |
| Subscription gates | `subscription-billing` public services and consumers | Subscription Billing + Architect | Architect + PO if behavior changes | serialized | access behavior review |
| Package manifests | root/backend/frontend package files | Orchestrator | PO for new packages, Architect for tooling | serialized | build/test review |
| CI/build config | `.github/workflows`, `tsconfig`, `jest`, `playwright`, Vite config | Release Audit + Orchestrator | Orchestrator + QA | serialized | CI/local verification |
| Public module exports | `backend/src/modules/*/index.ts`, `frontend/src/features/*/index.ts` | Owning module + Orchestrator | Orchestrator for cross-module exports | one owner per file | import-cycle review |
| Shared test helpers/fixtures | `backend/tests/shared`, `frontend/tests/ui/support` | QA Automation | QA Lead | serialized | focused test run |
| Strategy/signal/DQ contracts | module `.types.ts`, Prisma models, docs | Solution Architect + module owner | Architect + PO where semantics change | serialized by contract | contract QA |

## Control Process

1. Orchestrator records the shared file request in the active Sprint item.
2. Solution Architect confirms contract impact.
3. One owner edits the file in the implementation pass.
4. QA verifies affected downstream behavior.
5. Lead validation checks for hidden coupling and drift.

## Current High-Risk Dirty Shared Surfaces

- `backend/src/server.ts`: scheduler startup behavior.
- `backend/.env.example`: provider/env defaults.
- Market Data public exports and provider files.
- Historical planning files in `docs/codex-agent-team-plan/`: do not treat as active control.

# TEAM-04 QA Factory Outbox - 2026-05-17

Mode: read-only QA planning.

Files changed: none by Team 04.

Tests, services, providers, builds, UI checks, staging, and commits: none.

## CF-W1-QA-01 Proposed Command Matrix

| Scope | Safe focused command | Evidence expected |
| --- | --- | --- |
| Data Quality fail-closed baseline | `cd backend` then `npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand` | Missing DQ excludes/blocks trusted use; `READY` remains eligible; no provider/service/UI dependency. |
| Signal run/read/latest gates | `cd backend` then `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand` | Trusted rows require DQ evidence; legacy/untrusted latest rows excluded; run-path invariant remains fail-closed. |
| Strategy no-target slice | `cd backend` then `npm.cmd test -- strategy-decision-engine --runInBand` | No arbitrary `targetPrice` derivation, no `Target price achieved.`, replacement wording uses exit/invalidation/risk-review language. |
| Market Data readiness invariants | `cd backend` then `npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts --runInBand` | Readiness/signoff/trusted-universe invariants hold without provider calls or repair runs. |
| Backend build gate, approval-gated | `cd backend` then `npm.cmd run build` | TypeScript build passes after scoped implementation. Use only with memory/resource approval. |
| Frontend build gate, approval-gated | `cd frontend` then `npm.cmd run build` | TypeScript/Vite build passes after frontend scope. Use only with memory/resource approval. |
| UI smoke, approval-gated only | `cd frontend` then `npm.cmd run test:ui -- <spec> --workers=1` | Data-bearing UI shows scoped data or domain empty state. Requires explicit approval, running app, and memory check. |

Do not run by default: broad `npm.cmd test`, Playwright, dev servers, provider tests, live providers, backfills, repair runs, Prisma mutation commands, or Angel One/provider-heavy flows.

## Next QA Plans

- `CF-W1-TP-01A`: Trade Plan target/no-target contract validation.
- `CF-W1-L3-AUTH-01`: two-user ownership tests for portfolio/watchlist child resources.
- `CF-W1-L3-ALERT-01`: alert DQ readiness suppression tests.
- `CF-W1-MD-01`: Market Data validation hardening tests after policy.
- `CF-W1-UX-02`: copilot trust UX and backend contract smoke plan.

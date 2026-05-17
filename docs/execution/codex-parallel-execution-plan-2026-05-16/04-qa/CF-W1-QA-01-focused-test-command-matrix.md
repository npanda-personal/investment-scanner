# CF-W1-QA-01 Focused Test Command Matrix

Date: 2026-05-17

Owner: Team 04 QA Factory

Status: Documentation-only completed by Team 00 integration after Team 04 planning.

## Purpose

Define safe focused validation commands for accepted and near-ready workstreams without enabling broad suites, providers, startup/backfill behavior, UI runs, or paid/live services by default.

## Command Matrix

| Scope | Command | Default Status | Evidence Required |
| --- | --- | --- | --- |
| Data Quality fail-closed baseline | `cd backend` then `npm.cmd test -- data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand` | Allowed when DQ files changed | Missing DQ excludes/blocks trusted use, `READY` remains eligible, no provider/service/UI dependency. |
| Signal run/read/latest DQ gates | `cd backend` then `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.repository.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand` | Allowed when Signal Generation files changed | Trusted rows require DQ evidence, untrusted latest/list rows are excluded, run path remains fail-closed. |
| Strategy Decision no-target slice | `cd backend` then `npm.cmd test -- strategy-decision-engine --runInBand` | Allowed when Strategy Decision files changed | No arbitrary target derivation, no `Target price achieved.`, rule-based exit/invalidation/risk-review wording remains. |
| Market Data readiness characterization | `cd backend` then `npm.cmd test -- market-data-readiness-evidence.invariants.test.ts market-data-storage-readiness.invariants.test.ts market-data.universe.test.ts --runInBand` | Allowed when Market Data readiness tests changed | Readiness/signoff/trusted-universe invariants hold without provider calls, startup, or repair runs. |
| Trade Plan future validation | `cd backend` then `npm.cmd test -- trade-plan-risk-engine.service.test.ts trade-plan-risk-engine.paper-readiness.test.ts --runInBand` | Blocked until contract accepted | DQ blockers and no-target compatibility semantics are proven without Prisma, UI, route, shared, provider, or package changes. |
| Lane 3 ownership future validation | `cd backend` then `npm.cmd test -- portfolio-management.service.test.ts portfolio-management.routes.test.ts watchlist-management.service.test.ts watchlist-management.routes.test.ts --runInBand` | Blocked until ownership contract accepted | Two-user ownership boundaries hold for portfolio/watchlist child resources. |
| Alert readiness future validation | `cd backend` then `npm.cmd test -- alerts-monitoring.service.test.ts alerts-monitoring.routes.test.ts alerts-monitoring.validation.test.ts --runInBand` | Blocked until Lane 3 readiness contract accepted | Alerts do not create trusted/action-like events from missing, stale, limited, or untrusted DQ inputs. |
| Backend build gate | `cd backend` then `npm.cmd run build` | Approval-gated | Use after accepted implementation when memory/resource posture allows. |
| Frontend build gate | `cd frontend` then `npm.cmd run build` | Approval-gated | Use only after approved frontend scope. |
| UI smoke | `cd frontend` then `npm.cmd run test:ui -- <spec> --workers=1` | Approval-gated | Requires approved UI scope, running app plan, and memory/resource check. |

## Default Exclusions

Do not run by default:

- broad `npm.cmd test` without focused patterns,
- Playwright/UI tests,
- dev servers,
- provider tests,
- live providers,
- repair/backfill jobs,
- Prisma mutation commands,
- Angel One or broker-adjacent flows,
- paid/cloud services.

## Acceptance

This matrix is a planning artifact only. It does not accept any implementation by itself and does not unblock downstream modules without their own contracts, QA plans, and acceptance packets.

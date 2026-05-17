# CF-W1 Architecture Contract Readiness

Date: 2026-05-17

Prepared by Team 03 Architecture Factory in daemon scheduler mode.

## Scope

Docs-only architecture and contract preparation for:

- `CF-W1-L3-AUTH-01`
- `CF-W1-L3-DQ-01`
- `CF-W1-MD-02`
- `CF-W1-TP-01A`

No application source, tests, package files, Prisma schema, route registries, shared utilities/UI, requirements docs, QA docs, root `AGENTS.md`, `docs/AGENTS.md`, or `docs/codex-agent-team-plan/**` were changed.

## Inspected Evidence

- Root `AGENTS.md`
- `00-control/active-work-board.md`
- `03-architecture/next-contracts-to-prepare.md`
- `03-architecture/shared-file-control.md`
- `06-contracts/contract-inventory.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/next-top-10-candidates.md`
- `11-module-audits/audit-market-data-data-quality.md`
- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `12-ready-queue/ready-for-implementation.md`
- `12-ready-queue/blocked-by-decision.md`
- `12-ready-queue/blocked-by-shared-file.md`
- Team 03, 04, 05, 06, and 07 outboxes for 2026-05-17
- Relevant backend module file names and current ownership-sensitive methods in Market Data, Data Quality, Portfolio, Watchlist, Alerts, and Trade Plan modules

## Readiness Summary

| Work item | Architecture status | Implementation status | Reason |
| --- | --- | --- | --- |
| `CF-W1-L3-AUTH-01` | Architecture-ready for bounded module-local implementation after QA plan and Orchestrator acceptance | Not started | Exact portfolio/watchlist module reservations can avoid Prisma, routes, auth middleware, shared utilities, package, and UI files. Stop if broader auth fallback, schema, or route behavior changes are required. |
| `CF-W1-L3-DQ-01` | Contract draft prepared | Blocked | Lane 3 display-vs-action readiness policy still needs Product Owner and Architect acceptance before portfolio, watchlist, alerts, portfolio intelligence, or copilot consumers change behavior. |
| `CF-W1-MD-02` | Architecture-ready for later Decision Packet / ADR drafting only | Source/schema implementation blocked | Durable OHLC/readiness evidence likely affects Prisma schema, natural keys, storage model, and migration/rollback. No schema/source reservation is safe without a decision. |
| `CF-W1-TP-01A` | Contract draft prepared | Blocked | Trade Plan no-target semantics affect persisted JSON shape, API semantics, frontend displays, Today Review compatibility, and paper-readiness logic. Product Owner and Architect decision is required before code changes. |

## Cross-Item Control Notes

- `CF-W1-L3-AUTH-01` must remain a narrow child-resource ownership slice. It must not become the platform-wide `default-user` fallback decision.
- `CF-W1-L3-DQ-01` must not be implemented as a broad multi-module pass. After policy acceptance, split implementation into one module-owned child slice at a time.
- `CF-W1-MD-02` should produce a future Decision Packet when the Product Owner is ready to choose the storage model. This packet was not created now because no implementation decision was requested in this docs-only scheduler task.
- `CF-W1-TP-01A` needs a future Product Owner and Architect decision if the project will remove, rename, null, or reinterpret Trade Plan `target` fields or frontend target/reward displays. No decision packet was created in this pass.

## Shared-File Stop Conditions

Stop and return to Orchestrator/Architect if any implementation requires:

- `backend/prisma/schema.prisma` or migrations.
- `backend/src/api/routes.ts`.
- `frontend/src/app/routes.tsx`.
- `backend/src/modules/auth-identity/**` or auth middleware changes.
- `backend/src/shared/**` or frontend shared UI utilities.
- package manifests or generated types.
- provider-heavy, startup, scheduler, Angel One, broker, or live-market-provider behavior.


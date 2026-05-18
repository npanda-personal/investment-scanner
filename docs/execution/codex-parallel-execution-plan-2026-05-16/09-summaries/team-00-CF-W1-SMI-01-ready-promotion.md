# Team 00 Ready Promotion - CF-W1-SMI-01

Date: 2026-05-18

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W1-SMI-01` - Smart Money evidence freshness and partial-trust framing.

## Result

Promoted to Ready for Implementation as a bounded backend-only `smart-money-intelligence` slice.

## Gate Evidence

- Requirement: `10-requirements/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-requirement.md`
- Architecture review: `03-architecture/CF-W1-SMI-01-architecture-review.md`
- Contract: `06-contracts/CF-W1-SMI-01-smart-money-evidence-freshness-partial-trust-contract.md`
- Work packet: `08-work-packets/CF-W1-SMI-01-work-packet.md`
- QA plan: `04-qa/CF-W1-SMI-01-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-architecture-factory.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-qa-factory.md`
- Open decisions: none.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W1-SMI-01`
- Worktree: `../investment-scanner-worktrees/team06-CF-W1-SMI-01`
- Base: current `dev` after Team 00 SMI architecture and QA planning docs commits.

## Allowed Files

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.service.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.types.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.md`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.service.test.ts`

Allowed branch-local evidence docs:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W1-SMI-01-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W1-SMI-01-developer-handoff.md`

## Forbidden Files

- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.repository.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.controller.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.router.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.validation.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.provider.ts`
- `backend/src/modules/smart-money-intelligence/smart-money-intelligence.module.ts`
- `backend/src/modules/smart-money-intelligence/index.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.routes.test.ts`
- `backend/tests/modules/smart-money-intelligence/smart-money-intelligence.validation.test.ts`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/data-quality-engine/**`
- backend or frontend route registries
- Prisma schema or migrations
- generated files
- shared backend utilities
- shared frontend components
- frontend source or UI tests
- package manifests
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Required Behavior

- Add additive Smart Money evidence metadata to existing stock/list summary payloads.
- Distinguish persisted daily snapshot evidence from on-demand derived detail fallback.
- Expose requested range, snapshot/data-through framing, and ownership-gap trust state.
- Keep downstream-safe usage tied to `latestPersistedStock()` and `latestPersistedStocks()` only.
- Preserve existing routes, query params, current scoring behavior, and current summary fields.
- Preserve research-support language.

## Required Validation

Run from the worktree backend:

```powershell
npm.cmd test -- smart-money-intelligence.service.test.ts --runInBand
npm.cmd run build
```

## Routing

Implementation owner: Team 06 - Strategy / Signal / Risk.

This can run in parallel with `CF-W1-TP-02` rework because the reserved files are disjoint.

# Team 03 CF-W1-MD-04 Architecture Outbox

Date: 2026-05-19

Assignment: prepare docs-only architecture/file-reservation readiness for `CF-W1-MD-04` Market Data per-instrument freshness and sync provenance in the shared `dev` workspace without touching application code, tests, Prisma/schema, routes, shared utilities, package manifests, generated files, providers, scheduler/startup behavior, or frontend files.

Prepared:

- `03-architecture/CF-W1-MD-04-architecture-review.md`
- `06-contracts/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-contract.md`
- `08-work-packets/CF-W1-MD-04-work-packet.md`

Files inspected:

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-MD-04-architecture-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/market-data-dq-readiness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-requirement-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/team-agent-runtime-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.repository.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

Files changed:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-04-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-04-market-data-per-instrument-freshness-sync-provenance-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-04-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-04-architecture.md`

Readiness result:

- `CF-W1-MD-04` is a `Ready candidate`.
- The smallest honest first child is one backend-only, Market-Data-local evidence packet.
- The child does not need Prisma/schema, route registry, provider, scheduler, generated, package, shared utility, or frontend changes.
- The child must stay source-evidence-only and must not take DQE readiness ownership.

Exact future writer set:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

Exact blocked scope:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- controller/router/validation/provider/scheduler/worker/queue/market-session/universe/index edits
- repository, universe, scheduler, market-session, or provider tests
- Prisma/schema and migrations
- generated files
- backend/frontend route registries
- frontend Market Data files
- shared backend utilities
- shared UI
- package manifests
- Data Quality Engine, Research Hub, and Today Review source changes
- provider/live-data/startup/backfill redesign
- paid/cloud, broker, telemetry, or credential scope

Required representation boundary:

- per-instrument freshness evidence must expose:
  - latest completed trading date
  - latest stored trading date
  - lag-days basis
  - stable `CURRENT` / `STALE` / `MISSING` / `UNKNOWN` semantics
- sync provenance must expose:
  - no-new-data skip
  - no-op storage
  - rows stored
  - catch-up-eligible / catch-up-stored semantics
- catalog sync run/status must expose a stable region-current/instrument-stale mismatch summary instead of warning text alone

Downstream dependency note:

- later DQE, Today Review, and Research Hub packets may consume this evidence only after the Market Data slice is accepted;
- they must stay separate packets and must not be bundled into `CF-W1-MD-04`.

QA planning handoff for Team 04:

- verify current/stale/missing/unknown instrument freshness mapping
- verify lag-days and paired latest-completed/latest-stored dates
- verify region-current/instrument-stale mismatch fields
- verify no-new-data, no-op, and catch-up sync provenance
- verify no DQE-style readiness tiers are introduced by Market Data
- reject any widening into repository/schema/routes/provider/scheduler/frontend/downstream-consumer scope

Current Team 03 recommendation to Team 00:

1. Route `CF-W1-MD-04` to Team 04 QA planning now.
2. Keep the first child backend-only and Market-Data-local.
3. Do not reopen the already-fixed stale-catalog implementation path.
4. Do not combine this packet with DQE or frontend adoption in the same writer pass.

No tests, builds, Prisma commands, services, providers, UI checks, live-data checks, commits, or pushes were run.

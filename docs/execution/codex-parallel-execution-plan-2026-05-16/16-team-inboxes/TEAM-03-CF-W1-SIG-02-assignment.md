# TEAM-03 Assignment - CF-W1-SIG-02

Date: 2026-05-18

Team: Team 03 - Architecture Factory

Mode: docs-only architecture prep.

## Work Item

`CF-W1-SIG-02` - Signal Generation canonical trigger evidence compatibility.

## Source Input

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- Related audit: `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- Related source to inspect read-only:
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
  - `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
  - `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

## Allowed Writes

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SIG-02-architecture.md`

## Forbidden Scope

- no application source or tests;
- no Prisma/schema/migrations or generated files;
- no route registries;
- no frontend or downstream consumer adoption;
- no shared backend or frontend contracts;
- no package manifests;
- no Strategy Framework durable-history work;
- no provider/live/startup/backfill, paid/cloud, broker, or telemetry.

## Required Output

Return `Ready candidate`, `split required`, or `blocked`.

Include exact future file reservations, forbidden files, dependencies, QA handoff notes, and whether current owned persisted timestamps require repository reads or should stay unavailable/compatibility-only.

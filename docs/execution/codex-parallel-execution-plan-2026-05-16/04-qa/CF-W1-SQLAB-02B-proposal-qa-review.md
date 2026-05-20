# CF-W1-SQLAB-02B Proposal QA Review

Date: 2026-05-19

Owner: Team 04 QA Factory

## Status

ACCEPT for proposal QA only.

`CF-W1-SQLAB-02B` passes the docs-only proposal completeness gate. It is not Ready for Implementation. No Prisma/schema edits, migrations, generated Prisma artifacts, repository work, service work, route work, frontend work, tests, builds, services, or live data validation are approved by this review.

## Review Scope

Docs-only QA review against:

- internal proposal testability;
- durable natural-key and idempotency clarity;
- minimum future test split between storage foundation and service compatibility;
- whether the `02B1` and `02B2` separation is required and sharp enough;
- whether durable storage remains blocked behind explicit Prisma/schema/generated/repository consent.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02B-signal-outcome-journal-durable-learning-memory-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SQLAB-02B-architecture.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SQLAB-02A-qa-plan.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`

## QA Decision

### 1. Internal proposal testability

Pass.

The packet is testable as a proposal because it defines:

- the current source-of-truth baseline: on-demand measurement only, no module-owned durable row, and `outcomesPersisted = false`;
- the exact future storage boundary: one `signal-quality-lab` owned durable learning-memory record;
- the additive API posture: existing `POST /signals/quality/recalculate` and `GET /signals/:instrumentId/outcomes` stay in place;
- the future writer split: repository/schema work first, then service/API compatibility work second.

That is enough for Team 00 to route later implementation without inventing new QA semantics during handoff.

### 2. Natural key and idempotency clarity

Pass.

The packet fixes the minimum idempotent identity to:

```text
signalResultId
selectedHorizon
region
assetType
```

This is tight enough for the intended first durable child:

- `signalResultId` already points to a unique persisted signal row in current Prisma.
- `selectedHorizon` is required because one measured signal can legitimately produce separate durable learning rows across `1D`, `5D`, `10D`, `20D`, and `60D`.
- `region` and `assetType` keep the stored learning row auditable to current market scope expectations even though the signal source row already anchors identity.

The packet also keeps `signalGeneratedAt`, `derivedAt`, and measured-outcome snapshot fields as required stored evidence rather than expanding the natural key unnecessarily.

### 3. `02B1` / `02B2` split requirement

Pass, with one clarification.

The split is required and the packet defines it sharply enough:

1. `CF-W1-SQLAB-02B1` = schema/migration/generated/repository durable foundation
2. `CF-W1-SQLAB-02B2` = service/API compatibility after `02B1`

This separation is necessary because the current repository is still a stub and Prisma still has no `signal-quality-lab` owned durable model. Without the split, schema/generated work could be smuggled into the service child or service compatibility work could start before durable identity exists.

Clarification for Team 00 routing: as of the 2026-05-18 architecture packet, there is no honest no-schema `02B1`. The only no-schema child is `CF-W1-SQLAB-02A`. If any queue note restates `02B1` as no-schema, that needs correction before routing.

### 4. Future testing split

Pass.

The packet leaves a clean later QA split:

- `02B1` future QA focus:
  - schema model presence;
  - uniqueness on the natural key;
  - repository upsert behavior;
  - create-versus-update idempotency;
  - rejection of foreign persistence reuse.
- `02B2` future QA focus:
  - service derivation from measured outcomes only;
  - additive `outcomes(...)` compatibility;
  - additive `recalculate(...)` persistence counts;
  - preservation of `02A` preview semantics;
  - no route/controller/validation widening.

That is sufficient for proposal QA even though executable test files are intentionally deferred.

### 5. Durable storage consent gate

Pass.

The requirement, architecture review, contract, and work packet all keep durable storage blocked until Team 00 and the Architect explicitly open all of:

1. `backend/prisma/schema.prisma`
2. `backend/prisma/migrations/**`
3. generated Prisma client or generated types
4. `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`

The packet also keeps `CF-W1-SQLAB-02B` out of Ready-for-implementation routing and explicitly forbids source/test widening before that consent exists.

## Findings

No blocking proposal-completeness gaps were found.

Advisory only:

- preserve the naming distinction introduced on 2026-05-18:
  - `02A` = no-schema derived preview
  - `02B1` = schema/generated/repository durable foundation
  - `02B2` = service/API compatibility
- reject any later restatement that blurs `02A` into `02B1`, because that would weaken the current consent boundary.

## Acceptance Result

`CF-W1-SQLAB-02B` is ACCEPTED as a proposal QA packet only.

It is not accepted for implementation. The next safe gate is Team 00 queue control that:

- keeps `CF-W1-SQLAB-02B` out of Ready;
- opens `CF-W1-SQLAB-02B1` only after explicit schema/migration/generated/repository consent;
- routes `CF-W1-SQLAB-02B2` only after `02B1` exists and after `02A` overlap is sequenced under one writer.

## Validation

- Commands run: none
- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none

Skipped checks:

- all executable validation, because this assignment was a docs-only proposal QA review and explicitly forbade implementation work

## Risks / Blockers / Assumptions

- Unresolved risks:
  - Team 00 could misroute `02B1` as a no-schema child or open `02B2` before the durable foundation exists.
  - Later implementers could weaken idempotency by treating `reasonSummary` or other derived content as part of identity instead of update payload.
- Blockers:
  - all real durability work remains blocked by explicit consent on Prisma/schema, migrations, generated artifacts, and repository ownership
  - `02B2` remains blocked behind both `02B1` completion and single-writer sequencing against `02A` overlap on service/types/doc/service-test files
- Assumptions:
  - current `dev` remains authoritative for the inspected on-demand-only baseline
  - Team 03's 2026-05-18 packet remains the governing child split unless Team 00 deliberately reopens it

## Next Gate

- Team 00 orchestration and queue control
- keep `CF-W1-SQLAB-02B` out of Ready-for-implementation routing
- do not open `CF-W1-SQLAB-02B1` until explicit schema/migration/generated/repository consent is recorded
- do not open `CF-W1-SQLAB-02B2` until `02B1` is complete and `02A` overlap is sequenced under one writer

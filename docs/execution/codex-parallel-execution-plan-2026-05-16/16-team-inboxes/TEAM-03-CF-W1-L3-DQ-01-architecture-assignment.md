# TEAM-03 Assignment - CF-W1-L3-DQ-01 Architecture Prep

Date: 2026-05-18

Team: Team 03 - Architecture Factory

State: Docs-only architecture / contract refresh

## Assignment

Prepare or refresh the architecture, contract, and work-packet readiness for `CF-W1-L3-DQ-01` Lane 3 readiness consumer policy.

Team 02 has reprioritized this as a direct trader-safety gate because unready market data must not leak into trader-facing surfaces as trusted/actionable evidence.

Do not implement application code. Do not edit tests, source, routes, Prisma, generated files, package manifests, shared UI, or shared utilities.

## Source Evidence

- Requirement: `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-L3-DQ-01-lane-3-readiness-consumer-policy-requirement.md`
- Prior decision: `docs/execution/codex-parallel-execution-plan-2026-05-16/07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`
- Existing contract if present: `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- Relevant Lane 3 docs and audits under:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/`

## Required Output

Create or update only docs needed for a bounded first child:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-L3-DQ-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-L3-DQ-01-lane3-readiness-consumer-policy-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-L3-DQ-01-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-L3-DQ-01-architecture.md`

## Required Analysis

Define:

- the first bounded module-local child, if any;
- exact allowed and forbidden files;
- whether frontend/UX, shared UI, route registry, shared utility, Prisma/schema, generated type, provider/live, startup/backfill, or package scope is required;
- how READY, LIMITED, NOT_READY, UNUSABLE, unsupported, stale/missing hard blockers, action-like workflows, passive display, trusted summaries, reliability labels, and alerts map under the approved decision;
- whether child work should stay docs-only until an approved UX/QA scope exists;
- QA handoff scenarios for Team 04.

## Stop / Split Conditions

If implementation would require shared UI, frontend route registry, backend route registry, shared backend utility, Prisma/schema/generated, package, provider/live, startup/backfill, or broad UX scope, split that into a blocked child and do not mark it Ready.

## Expected Outbox

Return architecture status, exact future file reservations, blocked scope, QA planning recommendation, and whether Product Owner action is required.

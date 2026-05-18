# CF-W1-STRAT-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Blocked pending a separate approval-gated durable child.

`CF-W1-STRAT-02A` already covered the bounded no-schema trust-surfacing slice and was accepted on its Team 06 branch as commit `359d0a3`. The parent requirement no longer needs another `02A` prep loop. The remaining gap is durable rule-revision persistence, which is still blocked because persisted `StrategyDefinition` rows are keyed by `code` and overwritten in place.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-STRAT-02-strategy-framework-rule-versioning-dq-gate-policy-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `00-control/active-work-board.md`
- `00-control/team-agent-runtime-queue.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`
- `frontend/src/features/strategy-framework/types.ts`
- `frontend/src/features/strategy-framework/components/StrategyFrameworkPage.tsx`
- `18-integration-queue/CF-W1-STRAT-02A-architect-resignoff.md`
- `09-summaries/CF-W1-STRAT-02A-po-acceptance-packet.md`

## Current Source Findings

- Shared `dev` source still shows the pre-`02A` state. That is expected because the accepted `02A` work is branch-local and not yet integrated into `dev`.
- The accepted `CF-W1-STRAT-02A` branch evidence proves the no-schema trust surfacing path is already solved for this parent:
  - additive rule-revision metadata;
  - additive DQ gate policy exposure;
  - undeclared-rule limited trust fallback;
  - additive Strategy Framework UI trust framing.
- The remaining parent architecture problem is durable history, not another trust-surfacing pass.
- Prisma `StrategyDefinition` persistence is still `code`-unique.
- `StrategyFrameworkRepository.upsertDefinitions()` still upserts by `code`, so later registry seeds overwrite prior persisted rows instead of preserving version-keyed rule history.
- Durable historical rule revisioning therefore still needs schema, migration, generated artifact, and repository-contract review.

## Architecture Decision

Treat `CF-W1-STRAT-02` as an already-split parent with one accepted child and one blocked child:

1. `CF-W1-STRAT-02A` no-schema trust surfacing:
   - already implemented, accepted, and committed on the Team 06 branch as `359d0a3`;
   - do not reopen this child from the shared docs queue.
2. `CF-W1-STRAT-02B` durable revision persistence:
   - future approval-gated child only;
   - blocked until Prisma/schema/generated/shared-contract approval exists for version-keyed persisted definitions and migration behavior;
   - should be opened as a separate architecture packet instead of being implied by the current parent docs.

## Exact Allowed Files

Current exact allowed application files for the parent requirement: none.

No application writer is authorized from this parent refresh. Team 00 must open a separate `CF-W1-STRAT-02B` packet before any source/test reservation exists.

Candidate future `02B` files to evaluate later, but not reserved now:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/strategy-framework/strategy-framework.repository.ts`
- `backend/src/modules/strategy-framework/strategy-framework.types.ts`
- `backend/src/modules/strategy-framework/strategy-framework.service.ts`
- `backend/src/modules/strategy-framework/strategy-framework.md`
- `backend/tests/modules/strategy-framework/strategy-framework.repository.test.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.service.test.ts`

## Exact Forbidden Files

- all application source or tests under this parent until Team 00 opens `CF-W1-STRAT-02B`
- `backend/src/modules/strategy-framework/strategy-framework.registry.ts`
- `backend/src/modules/strategy-framework/strategy-framework.evaluator.ts`
- `backend/src/modules/strategy-framework/strategy-framework.controller.ts`
- `backend/src/modules/strategy-framework/strategy-framework.router.ts`
- `backend/src/modules/strategy-framework/strategy-framework.validation.ts`
- `backend/tests/modules/strategy-framework/strategy-framework.evaluator.test.ts`
- all `frontend/src/features/strategy-framework/**`
- all `backend/src/modules/data-quality-engine/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- provider/startup, paid/cloud, telemetry, broker, or live-data changes

## One-Writer Constraint

- No application writer is authorized now from the parent packet.
- If Team 00 later opens `CF-W1-STRAT-02B`, reserve the schema/migration/generated/repository/service/types/doc/test set to one writer only.
- Do not run a durable Strategy Framework child in parallel with any other `strategy-framework` source packet.

## Dependencies

- `CF-W1-STRAT-02A` is already accepted and should remain the only no-schema child for this parent.
- Durable/stable rule revision history remains blocked because:
  - `StrategyDefinition` persistence is `code`-unique today; and
  - repository seeding updates the same row by `code` instead of preserving version-keyed history.
- Future `CF-W1-STRAT-02B` requires at minimum:
  - Prisma/schema review;
  - migration behavior review;
  - repository contract changes;
  - generated artifact approval.

## QA Handoff Needs

No new executable QA plan is needed for `CF-W1-STRAT-02A`; that child already passed QA/re-review/signoff.

If Team 00 later opens `CF-W1-STRAT-02B`, Team 04 should prepare a new durable-child QA plan that proves:

- version-keyed strategy definition rows do not overwrite prior persisted rule history;
- seed/upsert behavior is idempotent for unchanged versions and additive for new versions;
- persisted rule revisions match source-declared rule revisions for the seeded version;
- Strategy Framework list/detail/proof surfaces remain backward-compatible while distinguishing current registry metadata from durable persisted history;
- no evaluator-math or proof-status regression is introduced while durable history is added.

## Parallel With Active Team 06 Work

- This docs-only refresh can run in parallel with active Team 06 `CF-W1-SIG-TRIGGER-02A` work because the write scope is docs-only and the live Team 06 work is in `signal-generation-engine`.
- Do not route a second Team 06 implementation pass until Team 06 closes the active `CF-W1-SIG-TRIGGER-02A` handoff and Team 00 explicitly chooses the next lane assignment.

## Ready Recommendation

- No-schema first child: already completed as `CF-W1-STRAT-02A`.
- Full parent requirement: blocked pending a separate approval-gated `CF-W1-STRAT-02B` packet.
- Durable/stable rule revisioning: blocked pending Prisma/schema/generated/shared-contract approval.

Team 00 should keep the parent requirement out of Ready. If durable strategy history becomes the next priority, open a new `CF-W1-STRAT-02B` architecture packet instead of routing another `02A` loop.

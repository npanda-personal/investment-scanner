# CF-W1-SIG-02 Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate for one bounded backend-only `signal-generation-engine` child, with sequencing dependency.

`CF-W1-SIG-02` does not need another schema/shared/downstream split inside its first child. It does depend on the accepted but not-yet-clean-integrated `CF-W1-SIG-TRIGGER-02A` semantics. Team 00 must either:

1. stack `CF-W1-SIG-02` on top of parked commit `788c237` (`feat: add signal trigger audit provenance`); or
2. reserve the same Signal Generation writer set and fold the `CF-W1-SIG-TRIGGER-02A` semantics into the `CF-W1-SIG-02` implementation pass.

Do not route `CF-W1-SIG-02` as a parallel Signal Generation writer while a separate pass redoes trigger-audit provenance.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-03-CF-W1-SIG-02-assignment.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-01-trigger-object-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-TRIGGER-02-persisted-trigger-auditability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-TRIGGER-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-TRIGGER-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W1-SIG-TRIGGER-02A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

## Current Source Findings

- Current `dev` still treats `triggerContract` as a compatibility projection. `signal-generation-engine.service.ts` marks `trigger_price`, `timeframe`, rule ids, lifecycle status, `created_at`, and `updated_at` unavailable on every row.
- `signal-generation-engine.repository.ts` already owns persisted `SignalResult.createdAt`, `SignalResult.updatedAt`, `generationRunId`, `sourceDataDate`, and `sourcePriceDate`. Prisma also proves the `SignalResult -> SignalGenerationRun` relation and run timing/status fields exist.
- `CF-W1-SIG-TRIGGER-02A` already defined and later accepted the additive audit-surfacing fix, but current `dev` source does not contain those semantics. The accepted parked branch commit is `788c237`, recorded in `12-ready-queue/ready-for-implementation.md` on 2026-05-18.
- `asset_class` and `region` are currently derived from request-time instrument enrichment, not from persisted trigger-row evidence.
- `strategy_id` and `strategy_version` are currently derived only from transient `strategyMatches[]` enrichment and therefore remain compatibility-only unless future persistence work is separately approved.
- `latestForInstrument()` can still create a signal on the read path. Even when the row is persisted during that request, the response still needs explicit request-local origin labeling so downstream readers do not confuse it with a previously stored historical trigger.
- No current owned field proves rule-defined `trigger_price`, `timeframe`, `entry_rule_id`, `exit_rule_id`, `invalidation_rule_id`, or durable rule revision history.

## Architecture Decision

Use the existing additive `SignalResultDto.triggerContract` property as the one canonical trigger-evidence packet for current Signal Generation read surfaces.

Do not introduce a second sibling packet such as `canonicalTriggerEvidence` in this child. That would widen backend and downstream compatibility work without adding product value.

The first child should instead upgrade `triggerContract` so that:

- non-legacy rows can become canonically self-describing even when some business fields are unavailable;
- every required trigger field is labeled as `proven`, `compatibility-only`, or `unavailable`;
- packet origin distinguishes persisted reads from request-local generation;
- timestamp semantics distinguish source-bar timing from persisted row audit timestamps;
- current intentionally unavailable fields no longer force ambiguous "contract incomplete" semantics for otherwise current rows.

## Canonicalization Rule

For this child, a current non-legacy row is `COMPLETE` when the packet fully explains field provenance, even if some individual business fields are `null`.

That means:

- `COMPLETE` = the packet is canonically self-describing;
- `LEGACY_INCOMPLETE` = legacy row lacks current audit/readiness basis;
- `CONTRACT_INCOMPLETE` = implementation failed to classify required evidence explicitly.

This is the core difference between `CF-W1-SIG-02` and the earlier compatibility-only projection work.

## Timestamp / Provenance Decision

Current owned persisted timestamps should not stay unavailable.

Decision:

- `created_at` and `updated_at` must be surfaced from repository-owned persisted `SignalResult` fields.
- run `status`, `startedAt`, and `completedAt` must be surfaced when `generationRunId` resolves through repository-owned run evidence.
- `trigger_timestamp` may continue to use `sourcePriceDate` or `sourceDataDate`, but only with explicit semantics that it is source timing, not durable rule-fire timing.
- request-local `latestForInstrument()` regeneration must be labeled explicitly at packet level even when the generated row is persisted before the response returns.
- `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only in this child because their current evidence is request-local enrichment rather than persisted trigger provenance.

Repository reads/mapping are therefore required for the first child if Team 00 starts from current `dev`.

## Exact Future File Reservations

Reserve this exact one-writer set for the implementation pass:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Reason for reserving the full set:

- current `dev` still lacks the accepted `CF-W1-SIG-TRIGGER-02A` repository/provenance surfacing;
- `CF-W1-SIG-02` cannot honestly become canonical without those same file scopes staying under one writer.

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- `backend/src/modules/signal-generation-engine/index.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.controller.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.router.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.module.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.config.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/today-trade-review/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/alerts-monitoring/**`
- `backend/src/modules/portfolio-management/**`
- `backend/src/modules/portfolio-intelligence/**`
- `backend/src/modules/watchlist-management/**`
- `backend/src/modules/ai-investment-copilot/**`
- `backend/src/modules/market-data-foundation/**`
- `frontend/src/**`
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration files
- paid/cloud, broker, or telemetry files

## Dependency And Parallel-Safety Notes

- Dependency 1: accepted `CF-W1-SIG-TRIGGER-01` commit `6ab3999` is already part of current `dev`; `triggerContract` exists today.
- Dependency 2: accepted `CF-W1-SIG-TRIGGER-02A` commit `788c237` is parked and not clean-integrated into current `dev`. Team 00 must either stack on that commit or allow `CF-W1-SIG-02` to fold the same semantics into the reserved file set.
- Dependency 3: Team 04 still needs a dedicated `CF-W1-SIG-02` QA plan. The older `CF-W1-SIG-TRIGGER-02A` QA plan is necessary context but not sufficient because it does not cover packet-complete semantics or request-local origin labeling.
- Parallel rule: do not run any other `signal-generation-engine` implementation slice against these files in parallel.

## QA Handoff For Team 04

Team 04 should plan focused backend QA for these cases:

- current trusted persisted row is `COMPLETE` even when unavailable business fields remain explicitly unavailable;
- legacy row remains `LEGACY_INCOMPLETE`;
- `created_at` and `updated_at` surface from persisted row evidence and are no longer marked unavailable on current rows;
- run audit fields surface only when the linked run row exists;
- `trigger_timestamp` semantics distinguish `SOURCE_PRICE_DATE`, `SOURCE_DATA_DATE`, and `UNAVAILABLE`;
- `latestForInstrument()` request-local generation is labeled explicitly and cannot be mistaken for pre-existing persisted-origin evidence;
- `asset_class`, `region`, `strategy_id`, and `strategy_version` are labeled compatibility-only when derived from request-local enrichment;
- `trigger_price`, `timeframe`, rule ids, and any lifecycle state richer than optional `detected` remain unavailable;
- strict DQ trusted read/run/latest behavior does not regress.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.repository.test.ts signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Readiness Result

Ready candidate.

Conditions on that recommendation:

- Team 00 must sequence it as one `signal-generation-engine` writer pass with the parked `CF-W1-SIG-TRIGGER-02A` semantics;
- Team 04 must prepare the dedicated QA plan first;
- any need for schema, shared contracts, route changes, frontend adoption, downstream consumer changes, or durable rule-version persistence immediately returns this item to split/blocker routing.

# TEAM-03 CF-W1-SIG-02 Architecture

Date: 2026-05-19

Team: Team 03 - Architecture Factory

Work item: `CF-W1-SIG-02` canonical trigger evidence compatibility

Status: Ready candidate

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SIG-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SIG-02-canonical-trigger-evidence-compatibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SIG-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-SIG-02-architecture.md`

## Files Inspected

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

## Exact Evidence

- Current `dev` still exposes `triggerContract` as a compatibility projection, not a canonical self-describing packet.
- Prisma and repository code prove persisted `SignalResult.createdAt`, `SignalResult.updatedAt`, `generationRunId`, `sourceDataDate`, `sourcePriceDate`, and the `SignalGenerationRun` relation already exist.
- Current service code still hard-codes `created_at` and `updated_at` to `null` and does not mark request-local generation origin explicitly.
- The accepted `CF-W1-SIG-TRIGGER-02A` implementation branch commit `788c237` already closed part of this gap, but `12-ready-queue/ready-for-implementation.md` records it as parked for later clean integration rather than merged into current `dev`.
- `latestForInstrument()` can still generate-and-persist on the read path, so canonical trigger evidence must label request-local origin explicitly even when the row is persisted before response return.

## Ready-Candidate Result

`CF-W1-SIG-02` is a `Ready candidate` for one bounded backend-only child.

Reason:

- no new schema, route, shared-contract, frontend, or downstream-consumer split is required for the first child;
- the existing `triggerContract` packet can become canonical by adding explicit provenance and packet-origin semantics;
- current owned persisted timestamps should be surfaced, not left unavailable.

## Timestamp / Provenance Decision

Decision recorded on 2026-05-19:

- current owned persisted row timestamps require repository reads/mapping and must be surfaced as proven evidence;
- current owned run timing/status requires repository relation reads and must be surfaced when available;
- `trigger_timestamp` remains source-date timing only and must carry explicit semantics;
- request-local `latestForInstrument()` generation must be labeled explicitly even after the generated row is persisted;
- `asset_class`, `region`, `strategy_id`, and `strategy_version` remain compatibility-only in this child because current evidence is request-local enrichment rather than persisted trigger provenance.

## Exact Future File Reservations

- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.repository.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.repository.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- backend/frontend route registries
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

## Dependencies

- Ancestor dependency already present in `dev`: `CF-W1-SIG-TRIGGER-01` commit `6ab3999`
- Sequencing dependency not yet clean-integrated into `dev`: accepted parked `CF-W1-SIG-TRIGGER-02A` commit `788c237`
- Next required doc gate: Team 04 dedicated `CF-W1-SIG-02` QA plan

Sequencing instruction for Team 00:

1. either stack `CF-W1-SIG-02` on top of parked commit `788c237`; or
2. reserve the same Signal Generation writer set and fold the `CF-W1-SIG-TRIGGER-02A` semantics into the `CF-W1-SIG-02` implementation pass.

Do not run a separate parallel writer on these same Signal Generation files.

## QA Handoff

Team 04 should plan backend QA for:

- canonical `COMPLETE` status on current rows with explicit provenance classification;
- `LEGACY_INCOMPLETE` handling on legacy rows;
- request-local generation origin labeling;
- compatibility-only asset/region and transient strategy provenance labeling;
- persisted row timestamp exposure;
- run audit exposure only when linked run evidence exists;
- explicit source-date timestamp semantics;
- continued unavailability for trigger price, timeframe, and rule ids;
- strict DQ fail-closed regression protection.

## Tests / Validation In This Docs Pass

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none

Skipped by scope:

- all executable validation, because this was docs-only architecture prep

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

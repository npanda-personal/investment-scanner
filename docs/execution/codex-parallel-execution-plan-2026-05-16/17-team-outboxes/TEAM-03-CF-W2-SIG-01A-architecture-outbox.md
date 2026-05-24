# TEAM-03 Outbox - CF-W2-SIG-01A Architecture

Date: 2026-05-24

## Result

Architecture readiness prepared for `CF-W2-SIG-01A` Signal Generation run-path DQ fail-closed behavior.

## Docs Changed

- `03-architecture/CF-W2-SIG-01A-architecture-review.md`
- `06-contracts/CF-W2-SIG-01A-signal-generation-run-path-dq-fail-closed-contract.md`
- `08-work-packets/CF-W2-SIG-01A-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W2-SIG-01A-architecture-outbox.md`

## Source Inspected Read-Only

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Readiness Status

Ready for Team 04 QA planning.

Not Ready for implementation until Team 04 QA planning completes and Team 00 promotes the slice.

## Exact File Reservations

Allowed implementation files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Forbidden without Team 00 reopening:

- Data Quality Engine source/tests
- Market Data source/tests
- Signal Generation types, repository, controller, router, module, or index
- frontend files
- Prisma/schema/migrations
- route registries
- shared utilities/UI
- package manifests
- generated/common fixtures
- provider/live/startup/backfill behavior
- Angel One, broker, paid/cloud, telemetry, or credential files
- root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`

## Required QA Focus

- omitted `useDataQualityFilter` defaults to `true`;
- explicit `useDataQualityFilter: false` remains preserved as a legacy/research bypass;
- default missing DQ behavior is `SKIP`;
- strict DQ runs generate only DQ-ready instruments;
- DQ filter failure fails closed with zero generated signals and DQ exclusion/missing counts;
- DQ evidence is preserved on eligible generated outputs where current DTO behavior supports it;
- skipped DQ rows are not counted as generation failures;
- no target, R:R, synthetic target, advice, guaranteed-outcome, or Trade Plan-first wording is introduced.

Suggested validation:

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

## Blockers

No Product Owner blocker.

No architecture blocker if implementation stays within the reserved Signal Generation service/validation/test files.

Stop condition: if implementation needs DQE source/public-contract changes, Signal Generation type changes, routes, schema, frontend, generated files, shared utilities, packages, providers, startup/backfill, or target/R:R/Trade Plan semantics, return to Team 00.

## Team 00 Routing Recommendation

Send `CF-W2-SIG-01A` to Team 04 QA planning next.

After QA planning, Team 00 can evaluate Ready promotion to Team 06 in a dedicated worktree:

- branch: `codex/team06-strategy-signal/CF-W2-SIG-01A`
- worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SIG-01A`

## Teams Ready To Pick Up New Tasks

- Team 04: QA planning for `CF-W2-SIG-01A`.
- Team 06: standby for implementation only after Team 00 Ready promotion.
- Team 03: ready for the next architecture prep/signoff item.

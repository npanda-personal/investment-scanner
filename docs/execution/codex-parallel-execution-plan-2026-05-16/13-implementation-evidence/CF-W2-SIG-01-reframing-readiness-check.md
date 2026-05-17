# CF-W2-SIG-01 Reframing Readiness Check

Date: 2026-05-17

## Decision

Implementation allowed for narrower bounded slice: yes.

Reframed requirement: `CF-W2-SIG-01A - Signal Generation run-path DQ fail-closed behavior`.

This does not complete full `CF-W1-SIG-01`.

## Current Dirty Change Summary

The current Signal Generation dirty change:

- Defaults `SignalGenerationEngineService.run()` to use Data Quality filtering unless `useDataQualityFilter: false` is explicitly supplied.
- Defaults run-path missing DQ behavior to `SKIP`.
- Fails closed when the Data Quality filter throws by generating no signals for the resolved run universe.
- Preserves explicit `useDataQualityFilter: false` as a legacy/research bypass.
- Updates request parsing so omitted `useDataQualityFilter` becomes `true`.
- Updates focused Signal Generation tests for default filtering and DQ-filter failure.

## Full CF-W1-SIG-01 Status

Full `CF-W1-SIG-01` is incomplete.

The current change is narrower than the draft trusted-run contract because it does not implement persisted trust classification, read-path filtering, latest-signal auto-generation gating, or the complete trigger object contract.

## Boundary Verification

| Check | Result |
| --- | --- |
| Module-local to `signal-generation-engine` | Yes |
| Requires Data Quality source changes | No |
| Requires Market Data source changes | No |
| Requires Prisma/schema changes | No |
| Requires route registry changes | No |
| Requires shared utilities | No |
| Requires package/generated/common fixture changes | No |
| Uses Angel One | No |
| Uses live providers | No |
| Uses startup/backfill | No |
| Uses UI | No |
| Introduces target-price semantics | No |
| Overclaims trusted signal behavior | No, if documented as run-path only |

## Known Gap Classification

| Gap | Classification | Notes |
| --- | --- | --- |
| `useDataQualityFilter: false` is still accepted | Unresolved but acceptable limitation for narrower slice | Explicit bypass remains research/legacy behavior and must not be treated as trusted downstream enforcement. |
| No persisted trusted/untrusted classification exists | Unresolved but acceptable limitation for narrower slice | Requires separate contract and likely repository/read-path work. |
| `topSignals()` can expose existing persisted signals without DQ trust filtering | Unresolved but acceptable limitation for narrower slice | Read-path filtering is out of scope for `CF-W2-SIG-01A`. |
| `screener()` can expose existing persisted signals without DQ trust filtering | Unresolved but acceptable limitation for narrower slice | Read-path filtering is out of scope for `CF-W2-SIG-01A`. |
| `latestForInstrument()` can auto-generate through `generateForInstrument()` without run-level DQ gating | Unresolved but acceptable limitation for narrower slice | Requires separate latest/read-path work packet. |
| Active docs marked `CF-W1-SIG-01` blocked/draft | Resolved for narrower slice only | `CF-W2-SIG-01A` has its own requirement, contract, QA plan, and work packet. |
| Trigger object contract remains incomplete | Unresolved but acceptable limitation for narrower slice | No trigger contract changes are claimed. |

## Current Evidence Inspected

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`
- `backend/src/modules/data-quality-engine/**` read-only context
- `backend/tests/modules/data-quality-engine/**` read-only context
- `06-contracts/CF-W1-SIG-01-signal-generation-dq-fail-closed-contract.md`
- `03-architecture/CF-W1-SIG-01-architecture-review.md`
- `04-qa/CF-W1-SIG-01-qa-plan.md`
- `08-work-packets/CF-W1-SIG-01-signal-generation-dq-fail-closed-work-packet.md`
- `13-implementation-evidence/CF-W2-dirty-change-reconciliation-report.md`
- `13-implementation-evidence/CF-W2-dirty-change-decision-packet.md`

## Allowed Files

Source:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`

Tests:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

Docs:

- Active execution docs for `CF-W2-SIG-01A` requirement, contract, QA, work packet, evidence, review, signoff, acceptance, summary, board, risk, and ready queue updates.

## Forbidden Files

- `backend/src/modules/data-quality-engine/**`
- `backend/tests/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/tests/modules/market-data-foundation/**`
- `frontend/src/**`
- Prisma schema or migrations
- Backend route registry
- Frontend route registry
- Shared backend utilities
- Shared UI
- Package manifests
- Generated types/common fixtures
- `backend/src/server.ts`
- `backend/.env.example`
- `.gitignore`
- Root `AGENTS.md`
- `docs/AGENTS.md`
- `docs/codex-agent-team-plan/**`
- Angel One provider files
- Live provider files
- Startup/backfill code

## Readiness Result

`CF-W2-SIG-01A` is allowed as a bounded run-path slice because the current dirty change is module-local, the Product Owner has delegated acceptance for bounded slices, the remaining gaps can be documented as limitations, and no real consent blocker is present.


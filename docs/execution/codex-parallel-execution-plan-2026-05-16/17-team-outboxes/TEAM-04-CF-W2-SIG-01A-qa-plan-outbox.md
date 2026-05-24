# TEAM-04 CF-W2-SIG-01A QA Plan Outbox

Date: 2026-05-24

## Team

Team 04 - QA Factory

## Work Item

`CF-W2-SIG-01A` - Signal Generation run-path Data Quality fail-closed behavior.

## Result

QA plan prepared.

Team 00 can evaluate this item for Ready after confirming:

- requirement exists and is current;
- architecture contract and work packet remain current;
- exact file reservations are recorded;
- no shared-file conflict exists;
- Team 06 implementation worktree/branch is assigned;
- no open Product Owner, Architect, or QA blocker exists.

## Docs Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/04-qa/CF-W2-SIG-01A-qa-plan.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-CF-W2-SIG-01A-qa-plan-outbox.md`

## Source Inspected Read-Only

- `AGENTS.md`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.validation.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-dq-enforcement.invariants.test.ts`

## Required Validation Commands

```text
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-dq-enforcement.invariants.test.ts --runInBand
npm.cmd run build
```

Language guard:

```text
rg -n "targetPrice|profitTarget|priceTarget|rewardRiskRatio|R:R|buy now|sell now|guaranteed|financial advice" backend/src/modules/signal-generation-engine backend/tests/modules/signal-generation-engine
```

## QA Focus

- Omitted `useDataQualityFilter` defaults to `true`.
- Explicit `useDataQualityFilter: false` remains a legacy/research bypass and must not be claimed as trusted DQ enforcement.
- Missing DQ behavior defaults to `SKIP`.
- DQ missing, blocked, stale hard-blocked, unsupported, `NOT_READY`, `UNUSABLE`, or filter-throw cases fail closed for trusted generation.
- Strict DQ filtered runs generate only DQ-ready instruments.
- Generated eligible outputs preserve DQ eligibility evidence where current DTO behavior supports it.
- No target/R:R/advice framing is introduced.

## Blockers

None for Team 00 Ready evaluation.

Implementation remains blocked until Team 00 promotes the slice and assigns Team 06 with exact reservations.

## Teams Ready To Pick Up New Tasks

- Team 00: Ready evaluation and Team 06 handoff for `CF-W2-SIG-01A`.
- Team 06: implementation only after Team 00 promotion.
- Team 04: QA verification after Team 06 developer handoff.
- Team 03: next architecture prep/signoff item while Team 06 implements.

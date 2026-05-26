# CF-W2-SPL-01B Ready Promotion

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration

## Work Item

`CF-W2-SPL-01B` - Signal Position Ledger active rows backend read model.

## Gate Verdict

Ready for bounded Team 06 implementation as a backend-only, active-only, read-path-only child.

This promotion does not authorize route-registry mounting, frontend UI, shared UI, schema, generated files, package changes, provider/live calls, startup/backfill work, durable lifecycle storage, closed history, broker semantics, portfolio P/L, target prices, reward/risk, or financial-advice wording.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-SPL-01B-signal-position-ledger-active-positions-read-model-requirement.md`
- Architecture review: `03-architecture/CF-W2-SPL-01B-architecture-review.md`
- Contract: `06-contracts/CF-W2-SPL-01B-active-position-read-model-contract.md`
- Work packet: `08-work-packets/CF-W2-SPL-01B-work-packet.md`
- QA plan: `04-qa/CF-W2-SPL-01B-qa-plan.md`
- Team 03 outbox: `17-team-outboxes/TEAM-03-CF-W2-SPL-01B-architecture-outbox.md`
- Team 04 outbox: `17-team-outboxes/TEAM-04-CF-W2-SPL-01B-qa-plan-outbox.md`
- Open decisions: one unrelated DQ-RS1 decision only; it does not block this workstream.

## Branch / Worktree

- Branch: `codex/team06-strategy-signal/CF-W2-SPL-01B`
- Worktree: `C:\work\repo\investment-scanner-worktrees\team06-CF-W2-SPL-01B`
- Required base: latest `dev` after Team 00 docs checkpoint containing this Ready promotion.

## Allowed Implementation Files

- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

Optional only if isolated module-local router/controller assertions are added without route-registry mounting:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`

## Allowed Reporting Docs

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-01B-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-01B-developer-handoff.md`

## Required Behavior

- Expose one paginated active-row read model inside the backend module.
- Include rows only when current persisted/public evidence proves entry trigger timestamp and source-backed trigger price.
- Keep trigger type, entry reason summary, strategy id/code, strategy version, and entry-rule provenance visible when current source supports them.
- Compute `currentReturnPercent` only from source-proven entry trigger price and latest trusted persisted price.
- Show explicit stale or unavailable current-return status when latest price, DQ, or trust basis is not usable.
- Project DQ/trust evidence from current public/persisted DQ evidence; do not recompute DQ locally.
- Emit only `EXIT_TRIGGERED` or `RISK_WARNING` as limited health compatibility states on current `dev`.
- Keep all other lifecycle evidence explicit unavailable.
- Preserve research-support wording.

## Forbidden Scope

- `backend/src/api/routes.ts`
- all `frontend/src/**`
- all `frontend/tests/**`
- all Today Review, Trade Plan, Portfolio, Backtesting, and provider/startup/live files
- Prisma schema or migrations
- generated files
- package manifests or lockfiles
- shared backend utilities
- shared frontend components
- durable lifecycle/open/closed storage
- broker, portfolio P/L, account performance, target price, reward/risk, `R:R`, or direct advice semantics

## Required Validation

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand
npm.cmd run build
```

Recommended reused-evidence regression:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.trigger-contract.test.ts strategy-decision-engine.service.test.ts market-data.service.test.ts data-quality-engine.service.test.ts data-quality-engine.invariants.test.ts --runInBand
```

Optional only if module-local router assertions are added:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.routes.test.ts --runInBand
```

Language guard:

```powershell
rg -n "active trade|open trade|closed trade|buy now|sell now|target price|price target|profit target|reward/risk|R:R|realized profit|account gain|portfolio profit|financial advice" backend/src/modules/signal-position-ledger backend/tests/modules/signal-position-ledger
```

## Stop Conditions

Stop and return to Team 00 if implementation requires route-registry wiring, frontend UI, shared UI, schema/storage, generated/package changes, provider/live/startup/backfill behavior, Today Review/Trade Plan/Portfolio/Backtesting source edits, closed-history proof, or advice/target/R:R wording.

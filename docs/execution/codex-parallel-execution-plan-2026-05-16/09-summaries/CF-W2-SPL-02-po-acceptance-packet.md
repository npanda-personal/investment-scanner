# CF-W2-SPL-02 Delegated Product Owner Acceptance Packet

Date: 2026-05-26

Owner: Team 00 - Master Orchestrator / Integration under standing delegation

## Work Item

`CF-W2-SPL-02` - Signal Position Ledger active positions surface.

## Acceptance Decision

Accepted under standing delegation.

Human Product Owner action required: no.

## Scope Accepted

Accepted implementation scope:

- mount the accepted Signal Position Ledger active endpoint at `GET /api/v1/signals/position-ledger/active`
- add the protected `/signal-position-ledger` frontend route
- add first-class navigation label `Signal Position Ledger` under `Daily Work`
- render `Active Positions` as the only truth-bearing tab in this child
- keep `Closed History` placeholder-only with no API call, rows, counts, detail route, mock data, or inferred close evidence
- show active position rows with entry date, entry price, current price, return since entry, entry reason, evidence state, and exit/invalidation compatibility context from the accepted read model
- avoid direct advice, target-price, reward/risk, broker/execution, realized P/L, or Trade Plan-first language

## Accepted Files

- `backend/src/api/routes.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`
- `frontend/src/app/routes.tsx`
- `frontend/src/app/navigationMetadata.tsx`
- `frontend/src/features/signal-position-ledger/**`
- `frontend/tests/ui/signal-position-ledger.spec.ts`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-06-CF-W2-SPL-02-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W2-SPL-02-architect-signoff-outbox.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-developer-handoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-qa-verification.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-code-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/18-integration-queue/CF-W2-SPL-02-architecture-signoff.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/09-summaries/CF-W2-SPL-02-po-acceptance-packet.md`

Excluded from the scoped implementation commit:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-04-qa-factory.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-10-review-release.md`

Those common outbox diffs were not needed for release because specific SPL-02 QA and code-review evidence files exist, and committing the common outbox rewrites would risk unrelated historical evidence churn.

## Gate Evidence

- Requirement: `10-requirements/CF-W2-SPL-02-signal-position-ledger-active-surface-requirement.md`
- UX plan: `05-ux/CF-W2-SPL-02-signal-position-ledger-active-surface-ux-plan.md`
- Architecture review: `03-architecture/CF-W2-SPL-02-architecture-review.md`
- Contract: `06-contracts/CF-W2-SPL-02-active-surface-contract.md`
- Work packet: `08-work-packets/CF-W2-SPL-02-work-packet.md`
- QA plan: `04-qa/CF-W2-SPL-02-qa-plan.md`
- Ready promotion: `13-implementation-evidence/CF-W2-SPL-02-ready-promotion.md`
- Developer handoff: `18-integration-queue/CF-W2-SPL-02-developer-handoff.md`
- QA verification: `18-integration-queue/CF-W2-SPL-02-qa-verification.md`
- Code review: `18-integration-queue/CF-W2-SPL-02-code-review.md`
- Architect signoff: `18-integration-queue/CF-W2-SPL-02-architecture-signoff.md`

## Validation Evidence

Passed:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.routes.test.ts --runInBand
npm.cmd run build
cd frontend
npm.cmd run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5181'; npm.cmd run test:ui -- signal-position-ledger.spec.ts --workers=1
```

Additional checks:

- product-language guard passed with no forbidden advice, target, reward/risk, broker/execution, or realized P/L wording
- `git diff --check` passed with line-ending warnings only
- Team 04 QA accepted
- Team 10 Code Review rereview accepted
- Team 03 Architect Signoff accepted

## Product Review

Accepted product behavior:

- The user can reach a dedicated Signal Position Ledger page from the protected application shell.
- The first slice truthfully shows only active signal-derived position rows.
- The page gives entry trigger context, reason summary, current return from entry, and exit/invalidation compatibility signals without calling it a broker ledger or Trade Plan.
- Closed History is visible only as a deferred proof area and cannot overclaim closed lifecycle data.

Rejected or deferred scope:

- no closed-history API/data/detail route/counts
- no durable trade lifecycle storage
- no Prisma/schema/migration/generated/package change
- no shared UI or shared context change
- no provider/live/startup/backfill/scheduler behavior
- no broker, execution, advice, target, reward/risk, realized P/L, or automated trade language

## Residual Risk

- UI smoke evidence is mock-backed rather than live backend-fed browser validation.
- The post-review QA rerun was frontend-only because the rejected defect was frontend-only; backend evidence was carried forward from the earlier accepted handoff.
- The implementation commit must exclude the common Team 04 and Team 10 outbox rewrites noted above.

## Release Decision

Team 00 may create a scoped local commit on branch `codex/team06-strategy-signal/CF-W2-SPL-02` after exact staged-scope verification passes.

Do not push or merge to `dev` during this acceptance packet.

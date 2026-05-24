# CF-W1-DQ-02B Work Packet

Date: 2026-05-24

## Work Item

`CF-W1-DQ-02B` residual DQ currentness public/read-path follow-up.

## State

Blocked. No implementation handoff is authorized under the current no-schema/no-shared constraint set.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: unassigned pending Team 00 consent
- Lane: Lane 1
- Module: `data-quality-engine`

## Why This Packet Is Blocked

Accepted `CF-W1-DQ-02A` already covered the bounded service-local currentness classifier on parked branch `c2d6753`.

The residual parent value is persisted read-side/public-contract value. On current `dev`, that value sits behind:

- `data-quality-engine.repository.ts`
- service methods that proxy repository read paths
- potentially additive API response semantics for `summary`, `list`, and `diagnostics`

Any attempt to avoid that surface would create selective truth, duplicate evaluation behavior, or a misleading investor/trader contract.

## Current Allowed Files

Docs-only Team 03 writer set for this pass:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-DQ-02B-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-DQ-02B-dq-currentness-public-read-path-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-DQ-02B-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-DQ-02B-architecture-outbox.md`

## No Implementation Reservation Exists Now

Do not assign a developer against `CF-W1-DQ-02B` yet.

## Future Consent-Gated Implementation Reservation

Only if Team 00 explicitly reopens the packet, reserve:

- `backend/src/modules/data-quality-engine/data-quality-engine.repository.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.service.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.types.ts`
- `backend/src/modules/data-quality-engine/data-quality-engine.md`
- `backend/tests/modules/data-quality-engine/data-quality-engine.service.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.invariants.test.ts`
- `backend/tests/modules/data-quality-engine/data-quality-engine.repository.test.ts` if needed

Additional reservation only with separate approval:

- controller/route response tests if additive HTTP payload changes are approved
- Prisma/schema/migration files if durable stored currentness fields are required

## Exact Forbidden Files Under Current Constraint Set

- `backend/src/modules/market-data-foundation/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source/tests

## Required Future Behavior After Consent

Any reopened implementation must:

- keep Market Data Foundation as the owner of market-session evidence;
- keep DQE as the evaluator and fail-closed readiness owner;
- expose consistent currentness semantics across persisted `summary`, `list`, and `diagnostics` read paths;
- avoid downstream duplication of DQ/session logic.

## QA Handoff Notes

No executable QA packet should be started for `DQ-02B` now.

When reopened, QA must verify:

- persisted rows and read-path summaries expose consistent currentness states;
- currentness reasons/dates trace back to Market Data session evidence;
- stale/missing/blocked outcomes still fail closed for downstream trusted consumers;
- no accidental widening into Market Data source, shared utilities, routes, or schema unless separately approved.

## Stop Conditions

Stop immediately and return to Team 00 if reopening would require:

- route registry edits
- Market Data Foundation source edits
- shared utility/shared UI edits
- generated/package changes
- schema/migration changes without separate consent

## Next Gate

Team 00 decision:

1. keep `CF-W1-DQ-02` residual parent blocked, or
2. explicitly open a DQE read-side/public-contract packet stacked after accepted `CF-W1-DQ-02A`.

Until that consent exists, this item is not Ready.

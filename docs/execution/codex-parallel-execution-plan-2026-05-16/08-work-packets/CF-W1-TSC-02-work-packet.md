# CF-W1-TSC-02 Work Packet

Date: 2026-05-25

## Work Item

Parent requirement:

- `CF-W1-TSC-02 - Active Signal Health rule-backed exit/invalidation evidence`

Historical first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

## State

Blocked. Do not promote to Ready.

The original smallest honest first child already ran to acceptance and local commit `34c9993 feat: add today review active signal health`.

There is no fresh implementation packet to open under parent `CF-W1-TSC-02` from the current workspace state.

## Owner / Lane / Module

- Architecture owner: Team 03 - Architecture Factory
- Historical implementation owner: Team 07 - Portfolio / Watchlist / Alerts / Today Review
- Lane: Lane 3 with Lane 2 evidence inputs
- Backend module: `today-trade-review`
- Frontend feature: `today-trade-review`

## Historical Base And Outcome

- historical required base: accepted `CF-W1-TSC-01A-TREV` commit `9fbc989`
- historical accepted child outcome: `34c9993 feat: add today review active signal health`

That historical child is already complete. Do not treat its base or its work packet as a new assignment request.

## Smallest Honest First Child

Historical first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

Current fresh-child result:

- none

If Product still wants more active-signal-health scope after the current Today Review no-target sequence, Team 02 must define a new residual child instead of reusing this packet.

## Exact Future File Reservations

### Current reservation decision

No new application file reservation is granted under parent `CF-W1-TSC-02` now.

### Provisional future Today Review-local writer set if a new residual child is explicitly opened later

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

These files are currently unavailable because the same writer set is occupied by active `CF-W2-TSC-04A` and stacked `CF-W2-TSC-05A`.

### Forbidden files

- Prisma schema or migrations
- generated files
- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- Signal Generation, Strategy Decision, Data Quality, Market Data, Backtesting, Trade Plan, Portfolio, Watchlist, Alerts, Copilot, Research Hub, Market Context, and Historical Context source/tests
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Sequencing Relative To Current Today Review Stack

1. `CF-W1-TSC-02A-TREV-HEALTH` is already the accepted upstream health slice.
2. `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` currently holds the Today Review writer set in Team 07 and Team 04 QA.
3. `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is already prepared and stacked immediately behind accepted `TSC-04A` evidence.
4. Do not start a reopened `CF-W1-TSC-02` packet before, between, or parallel to those two Today Review no-target packets.
5. If Team 00 later wants more active-signal-health work, it must first decide whether `TSC-05A` runs or is explicitly deferred on the same writer set.

## Dependencies

### Already satisfied

- historical `CF-W1-TSC-01A-TREV` base
- historical Team 04 `CF-W1-TSC-02A-TREV-HEALTH` QA plan
- historical Team 00 Ready promotion and Team 07 implementation of `TSC-02A`

### Current blockers

- active `CF-W2-TSC-04A` Today Review writer ownership
- stacked `CF-W2-TSC-05A` on the same writer set
- no new residual active-signal-health child requirement

## Branch / Worktree Recommendation

None now.

Do not open a new branch/worktree for parent `CF-W1-TSC-02` from current main.

If a new residual child is later approved, Team 00 must provide:

- the exact accepted post-`TSC-04A` or post-`TSC-05A` base commit;
- a fresh single-writer reservation;
- a new child-specific branch/worktree assignment.

## QA Handoff Recommendation

No new Team 04 QA handoff is recommended on parent `CF-W1-TSC-02` now.

Use the prior `CF-W1-TSC-02A-TREV-HEALTH` QA plan only as historical reference.

If a new residual child is later opened, Team 04 should:

- verify against the accepted post-no-target Today Review base;
- confirm accepted health-state semantics still hold;
- confirm no target, reward/risk, paper-review, or Trade Plan-first leakage on touched surfaces;
- reject any widening into upstream modules, shared files, schema, routes, or generated types.

## Stop Conditions

Stop and return to Team 00 / Team 02 / Architect if someone attempts to use this packet to:

- reopen `CF-W1-TSC-02A-TREV-HEALTH` as if it were not already complete;
- promote the parent to Ready;
- reserve the active Today Review writer set during `TSC-04A` / `TSC-05A`;
- invent a new child without a new requirement packet;
- widen into forbidden upstream/shared/schema/route/package scope.

## Next Gate

No immediate implementation gate.

The next honest gate is:

- Team 02 residual requirement definition only if a post-`TSC-04A` / post-`TSC-05A` health gap still exists.

## Ready Recommendation

- Parent `CF-W1-TSC-02`: blocked
- Fresh Ready-candidate child under current parent: none
- Historical first child `CF-W1-TSC-02A-TREV-HEALTH`: already accepted and committed

# CF-W1-TSC-02 Architecture Review

Date: 2026-05-25

Owner: Team 03 - Architecture Factory

## Status

BLOCKED. NOT READY. NOT A FRESH READY-CANDIDATE.

`CF-W1-TSC-02` should not move to Ready from the current workspace state.

The smallest honest first child remains:

- `CF-W1-TSC-02A-TREV-HEALTH`

But that child is already consumed: it was accepted and locally committed on `codex/team07-portfolio-alerts/CF-W1-TSC-02A-TREV-HEALTH` as `34c9993 feat: add today review active signal health`.

That means the parent no longer has a fresh first-child promotion path. Any further active-signal-health work needs a new residual child requirement after the current Today Review no-target stack is resolved.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-TSC-02-active-signal-health-rule-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W2-TSC-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W2-TSC-05-today-review-no-target-ranking-eligibility-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-07-current-assignment.md`
- existing `CF-W1-TSC-02`, `CF-W1-TSC-03`, `CF-W2-TSC-04`, and `CF-W2-TSC-05` architecture/contract/work-packet docs
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current-State Findings

### 1. The original first child is already complete

Current execution control docs record:

- `CF-W1-TSC-02A-TREV-HEALTH` accepted through QA, Team 10 review, Architect Signoff, delegated Product Owner acceptance, and staged-scope verification;
- local commit `34c9993 feat: add today review active signal health`;
- later Today Review work already stacks on that accepted outcome.

So the parent cannot honestly be described as waiting for its first child to be promoted. That step already happened.

### 2. Current main is not the correct base for any new health follow-on

Current main-workspace Today Review source still shows pre-`CF-W2-TSC-04A` target/reward, reward/risk, paper-review, and Trade Plan-first language and semantics in the service, detail page, and UI smoke spec.

That means any reopened active-signal-health child must not start from current main. It would need an accepted post-`TSC-04A` base, and likely a post-`TSC-05A` base if the same writer set remains occupied by ranking/eligibility cleanup.

### 3. The Today Review writer set is currently occupied

Current orchestration records show:

- `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is implemented in the Team 07 worktree and is under active Team 04 QA verification.
- `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is already prepared by Team 03 and intentionally blocked until accepted `TSC-04A` base evidence is recorded.
- Team 00 explicitly documents that `TSC-04A` and `TSC-05A` reserve the same Today Review writer set and must not run in parallel.

Any fresh `CF-W1-TSC-02` follow-on would collide with that same writer set.

### 4. Older `CF-W1-TSC-02` prep docs are stale if read as current promotion guidance

The older `CF-W1-TSC-02` architecture/contract/work-packet docs said:

- `CF-W1-TSC-02A-TREV-HEALTH` was the next Ready candidate;
- Team 04 QA planning and Team 00 promotion were still pending.

Those statements are no longer current. They must now be treated as historical traceability, not current routing guidance.

### 5. No fresh residual child is defined yet

The parent requirement still describes a broad health capability, but the only bounded child that Team 03 previously proved honest was `CF-W1-TSC-02A-TREV-HEALTH`, and that child is already done.

If Product still wants more active-signal-health scope after the current Today Review no-target pair lands, Team 02 must open a new residual child requirement. Team 03 should not silently invent `TSC-02B` from this parent while `TSC-04A` and `TSC-05A` are unresolved.

## Architecture Decision

Keep `CF-W1-TSC-02` blocked in the architecture/readiness lane.

Do not:

- promote the parent to Ready;
- label the parent as a fresh Ready-candidate;
- create a new child under the parent without a new residual requirement and new Team 03 packet;
- reserve the Today Review writer set for a fresh `CF-W1-TSC-02` implementation pass while `TSC-04A` and stacked `TSC-05A` are the active path.

Treat `CF-W1-TSC-02A-TREV-HEALTH` as the historical first child that satisfied the original bounded architecture split.

## Smallest Honest First Child

Historical first child:

- `CF-W1-TSC-02A-TREV-HEALTH`

Historical outcome:

- accepted and locally committed as `34c9993 feat: add today review active signal health`

Fresh-child result from the current workspace state:

- none

Any new active-signal-health work after this point must be redefined as a new residual child on top of the accepted no-target Today Review stack, not reopened under the old first-child packet.

## Exact Future File Reservations

### Current reservation decision

No new implementation reservation is granted under parent `CF-W1-TSC-02` now.

### Provisional future writer set if Team 00 later opens a new residual health child

These are the only plausible module-local files for a future Today Review-owned residual health slice, but they are not currently reservable because `TSC-04A` and stacked `TSC-05A` occupy the same writer set:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

### Forbidden files

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
- generated files
- Prisma schema or migrations
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `frontend/src/features/data-quality-engine/**`
- `frontend/src/features/pipeline-ops/**`
- all other application source/tests outside the provisional Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Sequencing Relative To `TSC-04A` And `TSC-05A`

1. `CF-W1-TSC-02A-TREV-HEALTH` is already upstream historical base work. It is not the next task.
2. `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` currently owns the Today Review writer set in the Team 07 worktree and remains ahead of any fresh `CF-W1-TSC-02` action.
3. `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` is already prepared and stays immediately behind accepted `TSC-04A` evidence on the same writer set.
4. Do not place a reopened `CF-W1-TSC-02` child before, between, or parallel to `TSC-04A` and `TSC-05A`.
5. If Product still sees a residual health gap after the no-target pair lands, Team 02 must define that residual gap explicitly and Team 03 must redraw the child against the accepted post-`TSC-04A` or post-`TSC-05A` base that Team 00 selects.

## QA Handoff Recommendation

No new Team 04 QA planning is recommended for parent `CF-W1-TSC-02` now.

Use existing `CF-W1-TSC-02A-TREV-HEALTH` QA material as historical evidence only.

If Team 00 later opens a new residual health child, Team 04 should:

- plan against the accepted post-`TSC-04A` or post-`TSC-05A` base, never current main;
- verify no regression to accepted `TSC-02A` health-state semantics;
- verify no target price, reward/risk, paper-review, or Trade Plan-first leakage on touched Today Review surfaces;
- verify any new health delta remains rule-backed, DQ-safe, and explicit about missing evidence;
- reject any attempted widening into upstream modules or shared files.

## Ready Recommendation

`CF-W1-TSC-02`: blocked.

Reason:

- the smallest honest first child already landed;
- current Today Review writer capacity is occupied by `TSC-04A` and stacked `TSC-05A`;
- no new residual child is defined yet.

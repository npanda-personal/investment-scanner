# Team 02 Rolling Direct-Value Discovery - 2026-05-24

Date: 2026-05-24

Owner: Team 02 - Product Owner / Requirement Factory

Mode: Docs-only backlog audit and refinement. No app source, tests, Prisma, route registries, package manifests, generated files, `docs/AGENTS.md`, root `AGENTS.md`, or `docs/codex-agent-team-plan/**` were modified.

## Scope Read

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/next-top-10-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/top-10-ready-candidates.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/00-control/active-work-board.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/12-ready-queue/ready-for-implementation.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/requirements-backlog.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/refinement-queue.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-04-today-review-no-target-candidate-language-cleanup-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-BT-05-backtesting-rule-exit-invalidation-evidence-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-proof-basis-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-strategy-signal-rules.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`

## Queue Truth Confirmed

- `CF-W1-SIG-LATEST-01` is already accepted from 2026-05-17 and must stay out of fresh pulls.
- `CF-W2-SIG-01A` is accepted and locally committed on the Team 06 branch as `24f938b`.
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is the only active Today Review implementation slice and keeps Today Review implementation files reserved by Team 07.
- `CF-W2-TSC-04` and `CF-W2-BT-05` are legitimate planning-only direct-value candidates.
- No Team 02 action should assume parallel Today Review source edits can start now.

## Direct-Value Findings

### 1. The current front of the queue is still correct

The best immediate investor/trader-value stack remains:

1. `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`
2. `CF-W2-TSC-04`
3. `CF-W2-BT-05`
4. `CF-W1-DQ-02` residual parent only after Team 00 deliberately reopens a DQE read-side/public-contract slice

Reason:

- it stays aligned with the Product Owner order of operations: freshness/provenance, DQ readiness, trusted signal workflow, then exit/invalidation and backtesting/calibration trust;
- it avoids reopening accepted or parked work;
- it avoids colliding with Team 07's active Today Review writer set.

### 2. Today Review has one additional real gap beyond language cleanup

`CF-W2-TSC-04` correctly addresses user-facing no-target copy cleanup, but source/docs still show a deeper trust problem:

- Today Review ranking still allocates score to trade-plan reward/risk and geometry.
- Lite candidate promotion still derives fixed-multiple target values and reward/risk thresholds.
- Candidate reasons and page copy still treat trade-plan geometry as part of trusted shortlist logic.

That means copy cleanup alone would still leave target-shaped assumptions inside trusted candidate ranking behavior.

### 3. Backtesting trust work is correctly focused on evidence separation, not simulation expansion

`CF-W2-BT-05` is still the right next backtesting planning item because current source/docs show:

- exit diagnostics are useful but can mix documented rule exits with simulation-assumption exits;
- take-profit style assumptions must not leak into Today Review or signal-health support as trusted target evidence;
- there is no need to widen into walk-forward, Monte Carlo, or advanced validation in this slice.

### 4. Upstream consent-gated items remain valuable but should stay gated

The following remain real backlog value but should not move in front of current trust work:

- `CF-W1-MD-02A` durable market-data evidence storage
- `CF-W1-SQLAB-02B` durable Signal Quality learning memory

These are still blocked by explicit storage/schema consent boundaries and should not be reframed as immediate no-schema pulls.

## New Requirement Stub Drafted

### `CF-W2-TSC-05`

File:

- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`

Why it was added:

- `CF-W2-TSC-04` covers no-target language cleanup.
- It does not fully cover the separate ranking/promotion problem in Today Review.
- Current Today Review docs and source still depend on reward/risk thresholds, target geometry, and fixed-multiple target generation for Lite/trusted candidate logic.

Acceptance intent:

- remove target/R:R dependence from Today Review ranking and eligibility semantics;
- keep entry evidence, DQ readiness, signal health, blockers, and supporting-trust evidence central;
- keep the slice planning-only until Team 07 releases Today Review file ownership.

## Recommended Next Candidates For Team 00 To Keep In View

1. `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`
   - active Team 07 implementation; finish current Today Review trust chain first.
2. `CF-W2-TSC-04`
   - first Today Review cleanup follow-on after the writer set is released.
3. `CF-W2-BT-05`
   - safe for Team 03 architecture prep now because it is disjoint from active Today Review work.
4. `CF-W2-TSC-05`
   - new planning-only follow-on for Today Review ranking/promotion semantics after `TSC-04` or as a narrower split Team 03 recommends.
5. `CF-W1-DQ-02` residual parent
   - only if Team 00 intentionally opens a new DQE read-side/public-contract packet.

## Blockers And Decision Needs

- No new Product Owner decision is required to record this audit.
- Team 07 still owns Today Review implementation files through `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`; no parallel Today Review implementation should start.
- `CF-W1-DQ-02` residual remains blocked unless Team 00/Architect open an explicit DQE public-contract/read-side packet.
- `CF-W1-MD-02A` and `CF-W1-SQLAB-02B` remain consent-gated and should not be treated as immediate Ready-prep work.

## Teams Ready To Pick Up New Tasks

- Team 02: continue rolling discovery after this checkpoint; no further Today Review source assumptions until Team 07 releases files.
- Team 03:
  - prepare architecture for `CF-W2-BT-05` now;
  - prepare a bounded contract split recommendation for `CF-W2-TSC-05` later, after Today Review files are free.
- Team 04:
  - standby for QA planning on `CF-W2-BT-05`;
  - later prepare rejection checks for `CF-W2-TSC-04` and `CF-W2-TSC-05` target/R:R leakage once Team 03 defines the bounded slices.
- Team 07: continue the active `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` implementation only.

## Files Changed

- Added `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W2-TSC-05-today-review-no-target-ranking-and-eligibility-reframe-requirement.md`
- Added `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-rolling-direct-value-discovery-2026-05-24.md`

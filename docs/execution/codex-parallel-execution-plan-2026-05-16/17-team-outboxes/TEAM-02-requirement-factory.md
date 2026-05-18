# TEAM-02 Requirement Factory Outbox

Date: 2026-05-18

Mode: docs-only value-discovery and prioritization cycle. No application code, tests, Prisma, route registries, shared utilities/UI, package manifests, generated files, or Team 00 control docs changed.

## Work Item

Run the next persistent Product Owner / requirements cycle while implementation gates continue in parallel.

## Files Changed

- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `17-team-outboxes/TEAM-02-requirement-factory.md`

## Files Inspected

- `AGENTS.md`
- `10-requirements/next-top-10-candidates.md`
- `10-requirements/requirements-backlog.md`
- `12-ready-queue/ready-for-implementation.md`
- `10-requirements/refinement-queue.md`
- `10-requirements/top-10-ready-candidates.md`
- `10-requirements/CF-W1-DQ-02-dq-currentness-evidence-requirement.md`
- `16-team-inboxes/TEAM-09-current-assignment.md`
- `11-module-audits/audit-market-data-data-quality.md`
- `11-module-audits/audit-backtesting-trade-risk.md`
- `11-module-audits/audit-strategy-signal-rules.md`
- `11-module-audits/audit-ux-research-copilot.md`
- `11-module-audits/audit-portfolio-watchlist-alerts.md`
- `11-module-audits/audit-qa-test-infrastructure.md`

## Source-Backed Findings

- The queue needed to move away from auth/sub promotion-watch work because Team 09 has already pulled combined `CF-W1-AUTH-SUB-01` into a separate implementation worktree.
- `CF-W1-DQ-02` is the clearest next unassigned item because currentness is the upstream fail-closed gate for every downstream trust surface.
- `CF-W1-MCTX-01` and `CF-W1-CAL-01` remain the next direct trust-evidence layers once currentness is made explicit.
- `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, and `CF-W1-MD-02` remain high-value support items that keep learning, provenance, and durable evidence aligned.
- `CF-W1-TP-01B`, `CF-W1-SQLAB-01`, `CF-W1-UX-01`, and `CF-W1-L3-INTEL-03` stay useful but remain below the upstream trust stack.
- `CF-W1-BT-02` and `CF-W1-HCTX-01` are active lanes and should not be re-routed as new discovery work.

## Re-Prioritized Top 10

1. `CF-W1-DQ-02`
2. `CF-W1-MCTX-01`
3. `CF-W1-CAL-01`
4. `CF-W1-SQLAB-02`
5. `CF-W1-STRAT-02`
6. `CF-W1-MD-02`
7. `CF-W1-TP-01B`
8. `CF-W1-SQLAB-01`
9. `CF-W1-UX-01`
10. `CF-W1-L3-INTEL-03`

## New / Refined Requirement Output

- Refined `CF-W1-DQ-02` to make session-aware currentness explicit so downstream consumers can distinguish latest-session freshness from calendar-age heuristics.
- Refined `CF-W1-MCTX-01` with persisted-versus-fresh regime provenance and denominator clarity.
- Refined `CF-W1-CAL-01` so the first child stays on trust-state semantics and is sequenced behind context evidence.
- Refined `CF-W1-SQLAB-02` so the next post-preview path remains learning-focused and separate from durable storage.
- Refined `CF-W1-STRAT-02` so rule provenance and DQ-gated trust stay explicit before rule behavior changes.

## Ready / Promotion Read

No item was moved to Ready.

Recommended next Team 00 promotion candidate:

- none changed in this cycle

Reason:

- Team 09 is already implementing combined `CF-W1-AUTH-SUB-01` in a separate worktree;
- this cycle was intentionally about docs-only next-lane discovery, not changing Team 00's live Ready routing.

Recommended next Team 00 architecture / QA prep target:

- `CF-W1-DQ-02`

Reason:

- currentness is the upstream fail-closed gate for downstream trust surfaces;
- the remaining gap is bounded to session-aware currentness evidence and QA prep;
- Team 03 can refresh contract/QA prep without touching active `BT-02` or `HCTX-01` lanes.

## Dependencies / Blockers

- `CF-W1-DQ-02`: must stay additive and session-aware without widening into durable storage or provider rewrites.
- `CF-W1-MCTX-01`: must clarify persisted-versus-fresh provenance and denominator quality without changing regime math.
- `CF-W1-CAL-01`: should follow context evidence prep rather than race ahead of the evidence chain.
- `CF-W1-SQLAB-02`: durable-storage child remains blocked behind a separate storage packet even if the no-schema preview child continues.
- `CF-W1-STRAT-02`: should stay upstream of any rule-behavior change and keep DQ gate policy explicit.
- `CF-W1-TP-01B`: should stay bounded to no-target/DQ hard-block semantics and not widen into UI/schema migration.
- `CF-W1-UX-01`: active `CF-W1-UX-01A` child must finish before any follow-on UX trust-surface expansion.

## Teams Ready To Pick Up New Tasks

- Team 03: `CF-W1-BT-02`, `CF-W1-HCTX-01`, `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-DQ-02`, `CF-W1-MD-02`
- Team 04: QA-plan prep for `CF-W1-BT-02`, HCTX, MCTX, CAL, SQLAB-02, STRAT-02, DQ-02, and MD-02 once Team 03 contract packets land or refresh
- Team 07 lane teams: `CF-W1-L3-WATCH-01` and then `CF-W1-L3-INTEL-03` when current portfolio / alert lane reservations free up
- Team 08: `CF-W1-UX-01` follow-on definition after the active frontend child closes

## Validation

- Tests run: none
- Builds run: none
- UI checks run: none
- Live local data checks run: none
- Skipped reason: Team 02 cycle was docs-only and stayed inside the allowed write scope

## Next Gate

Keep Team 00 live implementation routing unchanged. Use the refreshed backtesting/context/calibration/signal-quality/strategy/DQ/market-data ordering for the next docs-only contract / QA-prep delegation cycle while Team 09 continues `CF-W1-AUTH-SUB-01` in its separate worktree.

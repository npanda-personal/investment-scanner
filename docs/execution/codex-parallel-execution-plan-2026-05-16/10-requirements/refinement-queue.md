# Refinement Queue

Date: 2026-05-25

Status: Team 02 updated after reconciling the active `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` QA gate with the current Today Review source/docs state. Team 07 implementation is complete in the dedicated worktree, Team 04 QA verification is active, and Team 03 has already prepared the stacked `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` follow-on. `TSC-05A` remains blocked until Team 00 records accepted `TSC-04A` branch/commit evidence. Current main still contains pre-`TSC-04A` target/R:R and Trade Plan-first Today Review semantics, so no new follow-on should be routed from current main. This queue is refinement-only. Team 00 still owns Ready movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh refinement-front items.

## Current Refinement Stack Behind The Active TSC-04A Gate

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-05` | Today Review ranking and eligibility still need a no-target reframe after `TSC-04A` clears visible language cleanup. | Keep blocked / stacked until accepted `TSC-04A` base evidence is recorded; then re-anchor `TSC-05A` to that base before QA planning or Ready evaluation. |
| 2 | `CF-W1-TSC-02` | Trusted candidates still need rule-based health tracking after entry until exit, invalidation, expiry, or blockage. | Requirement-ready; Team 03 architecture prep is the next direct requirement/architecture packet after the Today Review no-target pair unless an isolated writer-safe path appears sooner. |
| 3 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but the parent still has read-side/public-contract scope that may need a bounded no-schema child. | Blocked by the residual read-side/public-contract split decision until Team 03 confirms a bounded follow-up. |
| 4 | `CF-W1-MD-02A` | Durable market-data evidence storage still has clear investor value, but it is consent-gated. | Blocked by schema/storage consent until Team 00 opens the durable evidence packet. |
| 5 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current read/review trust slices. | Blocked by storage consent until Team 00 opens the durable memory packet. |
| 6 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for explainability and review trust. | Blocked by schema/migration/generated/repository consent until Team 00 opens the revision-history packet. |
| 7 | `CF-W1-L3-DQ-01A` | Passive readiness display semantics remain a real Lane 3 trust contract gap. | Contract-only until Team 03/04 define a bounded child that does not collide with active Lane 3 work or shared UI rules. |
| 8 | `CF-W1-UX-01` residual parent | Workbench still lacks verified scope, trusted-date, blocker provenance, and downstream eligibility proof behind the accepted `UX-01A` framing child. | Keep behind upstream trust packets; do not reopen accepted `UX-01A`. |
| 9 | `CF-W1-UX-02` | Copilot trust UX still matters, but it remains downstream of the core data and strategy trust stack. | Downstream trust UX candidate; keep behind direct investor/trader value unless a trust blocker appears. |
| 10 | `CF-W1-UX-05` | Copilot-only product language cleanup can reduce advice-like wording after trust UX scope is clear. | Downstream copy-cleanup candidate; fold into or follow `CF-W1-UX-02`, and do not reserve shared UI yet. |

## Audit-Backed Notes

- Team 00 runtime checkpoint records `CF-W2-TSC-04A` as implemented in the Team 07 worktree and under active Team 04 QA verification. That makes `CF-W2-TSC-04` an in-flight parent, not a fresh refinement-front planning item.
- Team 03 has already defined `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` and explicitly blocked it behind accepted `TSC-04A` base evidence.
- Current main still contains pre-`TSC-04A` Today Review target/R:R and Trade Plan-first language in the module doc, service, and Today Review page/detail surfaces, so `TSC-05A` must not start from current main.
- `CF-W1-TSC-02` remains the next active signal health gap after the Today Review no-target cleanup pair.
- `CF-W1-DQ-02A` is accepted and locally committed as `c2d6753`; only the `DQ-02` residual parent stays in this stack behind active TSC/DQ work.
- `CF-W1-SQLAB-01` is accepted and locally committed as `1a41d95`; `CF-W1-SQLAB-02A` is promoted and assigned, so the next Signal Quality storage child remains `CF-W1-SQLAB-02B`.
- `CF-W3-MDPIPE-01B5`, `CF-W3-MDPIPE-01B6`, and `CF-W3-MDPIPE-01C` stay in the pipeline lane and do not create a new Team 02 requirement gap in this pass.
- `CF-W1-TP-03` remains paused/stale as framed. Do not revive Trade Plan proof freshness work unless it is fully reframed into Trusted Signal Candidate health with no targets or R:R leakage.

## Not Fresh Discovery

These items remain valid but should stay out of the immediate refinement front:

- `CF-W2-TSC-04` parent and active `CF-W2-TSC-04A` child
- `CF-W1-TSC-02A-TREV-HEALTH`
- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`
- `CF-W2-SIG-01A`
- `CF-W2-BT-05`
- `CF-W1-BT-04`
- `CF-W1-MD-05`
- `CF-W1-RH-03`
- `CF-W1-RH-02A`
- `CF-W1-SIG-LATEST-01`
- `CF-W1-SIG-TRIGGER-ENTRY-01`
- `CF-W1-SQLAB-03`
- `CF-W1-SQLAB-01`
- `CF-W1-STRAT-04`
- `CF-W1-CAL-01A`
- `CF-W1-TP-01A`
- `CF-W1-DQ-02A`
- `CF-W3-MDPIPE-01B5`
- `CF-W3-MDPIPE-01B6`
- `CF-W3-MDPIPE-01C`

Reason: active, accepted, parked, blocked behind an accepted base, or already assigned in the live gate path.

## Teams Ready For New Prep

- Team 02: keep rolling discovery active and keep the direct-value queue clean while `TSC-04A` finishes QA/review/signoff.
- Team 03: ready to re-anchor `CF-W2-TSC-05A` after Team 00 records accepted `TSC-04A` base evidence; otherwise ready to prep `CF-W1-TSC-02` next when Team 00 releases the Today Review writer set.
- Team 04: active on `CF-W2-TSC-04A` QA verification; ready to prepare `CF-W2-TSC-05A` QA planning once the accepted base is available.
- Team 10: ready for `CF-W2-TSC-04A` code review after Team 04 acceptance.
- Team 07: ready for bounded `TSC-04A` rework if QA/review rejects it; otherwise standby for stacked `TSC-05A` after Team 00 re-promotes from the accepted base.
- Team 00: keep `CF-W2-TSC-05A` blocked behind accepted `TSC-04A`; do not reopen `CF-W2-TSC-04` parent or move anything to Ready from this file.

## Team 02 Constraint Reminder

Do not move anything to Ready from this file.

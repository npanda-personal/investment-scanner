# Refinement Queue

Date: 2026-05-25

Status: Team 00 routing correction after Team 03 confirmed `CF-W1-TSC-02` has no fresh executable child. Team 07 implementation for `CF-W2-TSC-04A-TREV-CANDIDATE-LANGUAGE` is accepted through QA, Team 10 review, Architect Signoff, delegated PO acceptance, and local branch commit `68f0a19 feat: clean today review candidate language`. Team 03 has already prepared the stacked `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME` follow-on, which can now be re-anchored to accepted `TSC-04A` commit `68f0a19` for QA planning / Ready evaluation. This queue is refinement-only. Team 00 still owns Ready movement.

Team 00 override: `CF-W1-BT-03`, `CF-W1-CAL-01A`, `CF-W1-TP-01A`, and `CF-W1-DQ-02A` are accepted parked branch commits, not fresh refinement-front items.

## Current Refinement Stack Behind Accepted TSC-04A

| Rank | ID | Why it stays next | Team 00 routing note |
| --- | --- | --- | --- |
| 1 | `CF-W2-TSC-05` | Today Review ranking and eligibility still need a no-target reframe after accepted `TSC-04A` visible language cleanup. | Re-anchor `TSC-05A` to accepted `TSC-04A` commit `68f0a19`, then route Team 04 QA planning / Team 00 Ready evaluation. |
| 2 | `CF-W1-DQ-02` residual parent | `DQ-02A` is complete, but the parent still has read-side/public-contract scope that may need a bounded no-schema child. | Route Team 03 to confirm or reject a bounded residual child after `TSC-05A` sequencing is underway. |
| 3 | `CF-W1-MD-02A` | Durable market-data evidence storage still has clear investor value, but it is consent-gated. | Blocked by schema/storage consent until Team 00 opens the durable evidence packet. |
| 4 | `CF-W1-SQLAB-02B` | Durable Signal Quality learning memory remains useful after the current read/review trust slices. | Blocked by storage consent until Team 00 opens the durable memory packet. |
| 5 | `CF-W1-STRAT-02B` | Durable strategy revision history still matters for explainability and review trust. | Blocked by schema/migration/generated/repository consent until Team 00 opens the revision-history packet. |
| 6 | `CF-W1-L3-DQ-01A` | Passive readiness display semantics remain a real Lane 3 trust contract gap. | Contract-only until Team 03/04 define a bounded child that does not collide with active Lane 3 work or shared UI rules. |
| 7 | `CF-W1-UX-01` residual parent | Workbench still lacks verified scope, trusted-date, blocker provenance, and downstream eligibility proof behind the accepted `UX-01A` framing child. | Keep behind upstream trust packets; do not reopen accepted `UX-01A`. |
| 8 | `CF-W1-UX-02` | Copilot trust UX still matters, but it remains downstream of the core data and strategy trust stack. | Downstream trust UX candidate; keep behind direct investor/trader value unless a trust blocker appears. |
| 9 | `CF-W1-UX-05` | Copilot-only product language cleanup can reduce advice-like wording after trust UX scope is clear. | Downstream copy-cleanup candidate; fold into or follow `CF-W1-UX-02`, and do not reserve shared UI yet. |
| 10 | `CF-W1-TSC-02` residual | Historical first child `CF-W1-TSC-02A-TREV-HEALTH` is already accepted as `34c9993`; only a new residual health child could create fresh value. | Do not route now. Team 02 must define a new residual child after `TSC-04A` / `TSC-05A` if a real health gap remains. |

## Audit-Backed Notes

- Team 00 accepted and committed `CF-W2-TSC-04A` on Team 07 branch commit `68f0a19`; `CF-W2-TSC-04` is no longer a fresh refinement-front planning item.
- Team 03 has already defined `CF-W2-TSC-05A-TREV-RANKING-ELIGIBILITY-REFRAME`; it should now be re-anchored to accepted `TSC-04A` commit `68f0a19`.
- `CF-W1-TSC-02A-TREV-HEALTH` is accepted and locally committed as `34c9993`; Team 03 found no fresh executable `CF-W1-TSC-02` child remains under the current parent.
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

- Team 04: prepare `CF-W2-TSC-05A` QA planning against accepted `TSC-04A` commit `68f0a19`.
- Team 03: ready for `CF-W1-DQ-02` residual architecture clarification after `TSC-05A` QA planning starts.
- Team 02: keep rolling discovery active and keep the direct-value queue clean.
- Team 07: standby for stacked `TSC-05A` after Team 00 Ready promotion.
- Team 10: standby for the next QA-accepted handoff.
- Team 00: re-anchor `CF-W2-TSC-05A` to commit `68f0a19`; do not reopen `CF-W2-TSC-04` or parent `CF-W1-TSC-02`.

## Team 02 Constraint Reminder

Do not move anything to Ready from this file.

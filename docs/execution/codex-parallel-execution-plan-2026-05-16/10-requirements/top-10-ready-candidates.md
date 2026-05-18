# Top 10 Candidate Queue

Date: 2026-05-18

Status: Refreshed by Team 02 after Team 03/04 post-decision readiness refresh evidence and after Team 00 promoted `CF-W1-L3-PORT-01A`. This is a top-candidate list, not proof of implementation readiness. The current Ready-promotion front-runners after the PORT-01A rework routing are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`. See `12-ready-queue/ready-for-implementation.md` for actual implementation-ready items.

## Current Top Candidates

There are ten active top/refinement candidates after removing completed bounded slices and the promoted `CF-W1-L3-PORT-01A` implementation handoff from active pull.

| Rank | ID | Candidate | Severity | Current readiness | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | CF-W1-L3-TREV-01 | Today Review publication evidence | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Daily shortlist trust depends on matching readiness mode, trusted-universe evidence, and publish/withhold explanations. |
| 2 | CF-W1-BT-02 | Backtesting outcome review traceability | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Backtesting results need a trust frame for partial, diagnostic, and legacy-repaired outcomes. |
| 3 | CF-W1-L3-ALERT-03 | Alert follow-through traceability | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Alert inbox review needs durable outcome state so trigger follow-up is traceable beyond read/dismiss. |
| 4 | CF-W1-CAL-01 | Signal Calibration reliability drift | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Calibration already has trust-state machinery, but missing DQ and weak evidence can still look authoritative. |
| 5 | CF-W1-HCTX-01 | Historical Context explainability | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Historical lookups need selected-snapshot provenance, lag, and gap explanation for downstream trust. |
| 6 | CF-W1-MCTX-01 | Market Context regime evidence | P1 | Requirement draft prepared; needs Team 00/03 architecture and QA prep | Regime labels need evidence, denominators, and partial-context framing before downstream consumers trust them. |
| 6 | CF-W1-TP-01B | Trade Plan backend-only DQ hard-block child | P0 | Architecture, QA plan, Team 03 file-reservation matrix, and Team 06 readiness inspection prepared; needs Team 00 Ready promotion | Current Team 00 dispatch and Team 06 inspection keep this as the next Team 06 candidate after the PORT-01A routing. |
| 7 | CF-W1-NOTIF-02 | Notification log redaction | P1 | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 file-reservation matrix exist; needs Ready promotion | Current Team 00 dispatch keeps this as the next Team 09 candidate after `CF-W1-TP-01B`; auth/subscription decisions do not block the redaction slice. |
| 8 | CF-W1-L3-ALERT-01 | Alert readiness suppression child | P0 | Architecture, QA plan, and Team 03 file-reservation matrix prepared; needs Team 00 Ready promotion | Action-like alerts must not be generated from untrusted data, but this remains behind the current PORT/TP/NOTIF dispatch order. |
| 9 | CF-W1-L3-AUTH-03 | Alert rule target ownership child | P0 | Requirement, architecture, contract, work packet, and QA plan prepared; needs Team 00 Ready promotion | Portfolio/watchlist alert rules must not point at another user's resource. |
| 10 | CF-W1-MD-02 | Durable Market Data readiness evidence ADR | P0 | Option B ADR direction accepted; formal ADR still needed | Schema/source implementation remains blocked until separate slices are approved. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These are not app-code ready. No item is blocked by an open Decision Inbox item, but policy-resolved items still need Team 00 Ready promotion and exact implementation handoff before source/test work.

| Rank | ID | Prep gate |
| --- | --- | --- |
| 1 | CF-W1-L3-TREV-01 | Team 00/03 reservation and QA plan for prepared Today Review publication-evidence packet. |
| 2 | CF-W1-L3-ALERT-03 | Team 00/03 reservation and QA plan for prepared alert follow-through packet. |
| 3 | CF-W1-CAL-01 | Team 00/03 reservation and QA plan for prepared Signal Calibration reliability packet. |
| 4 | CF-W1-HCTX-01 | Team 00/03 reservation and QA plan for prepared Historical Context explainability packet. |
| 5 | CF-W1-MCTX-01 | Team 00/03 reservation and QA plan for prepared Market Context regime-evidence packet. |
| 5 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation and exact implementation handoff. |
| 6 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation. |
| 7 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation. |
| 8 | CF-W1-MD-02 | Formal ADR and ADR QA checklist for approved companion durable readiness/evidence storage direction. |
| 9 | CF-W1-AUTH-01 | Team 00 Ready evaluation for prepared backend fail-closed controller packet; sequence or combine with `CF-W1-SUB-01`. |
| 10 | CF-W1-SUB-01 | Team 00 Ready evaluation for prepared backend admin/manual-only subscription packet; sequence or combine with `CF-W1-AUTH-01`. |

## Implementation-Ready Result

`CF-W1-L3-PORT-01A` is implementation-ready through the Team 00 handoff in `12-ready-queue/ready-for-implementation.md` and `16-team-inboxes/TEAM-07-current-assignment.md`.

The nearest remaining child candidates are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, `CF-W1-L3-ALERT-01`, and `CF-W1-L3-AUTH-03`; each still needs Team 00 Ready promotion and exact implementation handoff. Team 00 still owns any future Ready queue update. Team 03's 2026-05-18 near-ready file-reservation matrix is supporting evidence only, not a Ready promotion for the remaining items.

The resolved decisions and prepared child contracts/QA plans are planning inputs only. They do not satisfy Ready criteria by themselves.

## Completed Or Removed From Active Pull

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded Signal Generation run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-L3-AUTH-01` completed portfolio/watchlist child ownership implementation and was committed locally as `74ba6dd`.
- `CF-W1-L3-AUTH-02` completed bounded alert event ownership and was committed locally as `503bcd9`.
- `CF-W1-SIG-TRIGGER-01` completed bounded optional Signal Generation trigger DTO projection and was committed locally as `6ab3999`.

Legacy parent items `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` must not be pulled as active implementation work without a new split requirement.

`CF-W1-L3-PORT-01` remains the parent portfolio/watchlist requirement. `CF-W1-L3-PORT-01B` watchlist readiness DTOs remain a future child after the portfolio-only slice is handled.

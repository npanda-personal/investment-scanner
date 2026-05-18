# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory in daemon scheduler mode after prior bounded decision items were resolved, after the 2026-05-17 Product Owner resolutions for Lane 3 readiness, Trade Plan no-target/DQ hard-block behavior, and Market Data durable readiness ADR direction, and after Team 03/04 post-decision child prep. Refreshed by Team 02 on 2026-05-18 after Team 00 promoted `CF-W1-L3-PORT-01A`, routed the PORT-01A rework back through Team 07, and Team 03/04 prepared post-decision contracts, work packets, and QA refreshes. The current Ready-promotion front-runners are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`.

## Current Top Candidates

There are eleven active refinement candidates after removing completed bounded slices and the promoted `CF-W1-L3-PORT-01A` implementation handoff from the pull path.

The top three Ready-promotion candidates are `CF-W1-TP-01B`, `CF-W1-NOTIF-02`, and `CF-W1-L3-ALERT-01`.

| Rank | ID | Next gate | Notes |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-TREV-01 | Team 00/Team 03 reservation and QA plan | Today Review already persists readiness, review-universe, and scan-funnel evidence, but the trust gap needs a bounded coherence contract. |
| 2 | CF-W1-SQLAB-02 | Team 00/Team 03 reservation and QA plan | Signal-quality outcome calculations already exist, but the learning loop still lacks a durable journal. |
| 3 | CF-W1-BT-02 | Team 00/Team 03 reservation and QA plan | Backtesting already has availability, benchmark, exit, and repair evidence, but the review trust gap needs a bounded contract. |
| 4 | CF-W1-L3-ALERT-03 | Team 00/Team 03 reservation and QA plan | Alert follow-through needs a bounded contract so trigger review outcomes and notes are traceable. |
| 5 | CF-W1-L3-INTEL-03 | Team 00/Team 03 reservation and QA plan | Portfolio concentration and exposure review need a bounded contract before traders can action them confidently. |
| 6 | CF-W1-L3-WATCH-01 | Team 00/Team 03 reservation and QA plan | Watchlist ideas need deterministic review-priority and reason-summary treatment before traders can action them confidently. |
| 7 | CF-W1-CAL-01 | Team 00/Team 03 reservation and QA plan | Signal calibration already exposes trust-state machinery, but DQ gaps can still look authoritative unless calibration drift is labeled. |
| 8 | CF-W1-HCTX-01 | Team 00/Team 03 reservation and QA plan | Historical context snapshots need selected-snapshot provenance, lag, and gap explanation. |
| 9 | CF-W1-MCTX-01 | Team 00/Team 03 reservation and QA plan | Regime labels need evidence, denominators, and partial-context framing before downstream consumers trust them. |
| 10 | CF-W1-TP-01B | Team 00 Ready evaluation | Trade Plan backend compatibility/DQ hard-block contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 06 readiness inspection are prepared, but no app-code slice is Ready until Team 00 gates pass. |
| 11 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 reservation matrix exist, but no app-code slice is Ready until exact promotion and handoff. |

## Focused Priority Readiness Result

These are the current Team 02 priorities. None is app-code ready.

| ID | What is proven | What is missing | Current disposition |
| --- | --- | --- | --- |
| CF-W1-L3-TREV-01 | Today Review readiness, review-universe, and scan-funnel evidence exist in the module snapshot; today-review UI already surfaces mismatch warnings and trust status. | Bounded publication-evidence contract, exact file reservation, and Team 00 Ready promotion. | Keep out of Ready until Team 00/03 prep exists. |
| CF-W1-SQLAB-02 | Signal-quality outcome calculations exist, but the learning loop still lacks a durable journal. | Bounded journal contract, exact file reservation, and Team 00/03 prep. | Keep out of Ready until Team 00/03 prep exists. |
| CF-W1-L3-ALERT-03 | Alert inbox read/dismiss flow exists, but no durable follow-through outcome or review-note state is persisted. | Bounded follow-through contract, exact file reservation, and Team 00/03 prep. | Keep out of Ready until Team 00/03 prep exists. |
| CF-W1-L3-INTEL-03 | Portfolio intelligence already exposes concentration and red flags, but no durable exposure-review state is persisted. | Bounded concentration-review contract, exact file reservation, and Team 00/03 prep. | Keep out of Ready until Team 00/03 prep exists. |
| CF-W1-L3-WATCH-01 | Watchlist sort/enrichment exists, but no durable review-priority or reason-summary state is persisted. | Bounded actionability contract, exact file reservation, and Team 00/03 prep. | Keep out of Ready until Team 00/03 prep exists. |
| CF-W1-L3-PORT-01A | Parent policy accepted; portfolio-only requirement, parent architecture contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 07 readiness inspection exist. | None for Ready promotion. Team 07 implementation now begins. | Promoted to Ready by Team 00 on 2026-05-18. |
| CF-W1-TP-01B | Parent policy accepted; backend-only child architecture contract, Team 03 reservation matrix, backend reservations, QA plan, and Team 06 readiness inspection exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-NOTIF-02 | Requirement, architecture, contract, work packet, platform QA plan, and Team 03 reservation matrix exist. | Team 00/Team 09 Ready promotion and implementation handoff. | Keep out of Ready until promotion gates pass. |
| CF-W1-L3-ALERT-01 | Parent policy accepted; child architecture contract, Team 03 reservation matrix, backend reservations, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-L3-AUTH-03 | Requirement, architecture review, contract, work packet, and QA plan exist. | Team 00 Ready promotion and implementation handoff. | Keep out of Ready until Team 00 gates pass. |
| CF-W1-MD-02 | Requirement, draft contract, ADR QA plan, and Option B ADR direction acceptance exist. | Formal ADR, migration/rollback/query/test strategy, and later source/schema work packet. | Keep in ADR prep; source/schema work blocked by shared-file gates. |
| CF-W1-AUTH-01 | Option A policy, Team 03 contract/work packet, and Team 04 QA refresh exist. | Team 00 Ready promotion, Team 09 handoff, and sequencing/combining decision with `CF-W1-SUB-01`. | Keep out of Ready until promotion gates pass. |
| CF-W1-SUB-01 | Option A policy, Team 03 contract/work packet, Team 04 QA refresh, and known frontend limitation scope exist. | Team 00 Ready promotion, Team 09 handoff, and sequencing/combining decision with `CF-W1-AUTH-01`. | Keep out of Ready until promotion gates pass. |
| CF-W1-MD-01 | Option A policy, Team 03 validation-only contract/work packet, and Team 04 QA refresh exist. | Team 05 readiness acceptance and Team 00 Ready promotion. | Keep out of Ready until promotion gates pass. |
| CF-W1-UX-02 | Option B policy, Team 03 Copilot-only contract/work packet, and Team 04 QA refresh exist. | Team 08 source-supported trust-field mapping, exact implementation handoff, startup/resource plan, and Team 00 Ready promotion. | Keep out of Ready until promotion gates pass. |
| CF-W1-UX-05 | Option A policy, Team 03 Copilot-only contract/work packet, and Team 04 QA refresh exist. | Sequencing with or folding into `CF-W1-UX-02`; no shared UI handoff. | Keep out of Ready until the Copilot handoff is selected. |

## Next Docs-Only Prep / Ready-Evaluation Candidates

These items are not app-code ready. Some are ready-evaluation candidates; policy-resolved items remain docs-only until Team 00 promotes an exact implementation handoff.

| Rank | ID | Prep gate | Guardrail |
| --- | --- | --- | --- |
| 1 | CF-W1-L3-TREV-01 | Team 00/Team 03 reservation and QA plan | No Today Review source changes until Team 00/Team 03 prep exists. |
| 2 | CF-W1-SQLAB-02 | Team 00/Team 03 reservation and QA plan | No signal-outcome journal source changes until Team 00/Team 03 prep exists. |
| 3 | CF-W1-BT-02 | Team 00/Team 03 reservation and QA plan | No backtesting source changes until Team 00/Team 03 prep exists. |
| 4 | CF-W1-L3-ALERT-03 | Team 00/Team 03 reservation and QA plan | No alert follow-through source changes until Team 00/Team 03 prep exists. |
| 5 | CF-W1-CAL-01 | Team 00/Team 03 reservation and QA plan | No Signal Calibration source changes until Team 00/Team 03 prep exists. |
| 6 | CF-W1-HCTX-01 | Team 00/Team 03 reservation and QA plan | No Historical Context source changes until Team 00/Team 03 prep exists. |
| 7 | CF-W1-MCTX-01 | Team 00/Team 03 reservation and QA plan | No Market Context source changes until Team 00/Team 03 prep exists. |
| 8 | CF-W1-TP-01B | Team 00 Ready evaluation | No Trade Plan source changes until Team 00 gates pass. |
| 9 | CF-W1-NOTIF-02 | Team 00/Team 09 Ready evaluation | No notification source changes until promotion gates pass. |
| 10 | CF-W1-L3-ALERT-01 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 11 | CF-W1-L3-AUTH-03 | Team 00 Ready evaluation | No alerts source changes until Team 00 gates pass. |
| 12 | CF-W1-MD-02 | Formal ADR and ADR QA checklist | No Prisma, schema, source, provider, startup, or test changes until separate implementation approval. |

## Completed Or Removed From Active Top 10

- `CF-W1-QA-01` completed as documentation-only focused command matrix.
- `CF-W2-DQ-01` completed Data Quality fail-closed defaults.
- `CF-W2-SIG-01A` completed bounded run-path DQ fail-closed behavior.
- `CF-W1-SIG-01B` completed trusted signal list read-path filtering.
- `CF-W1-SIG-LATEST-01` completed latest-instrument DQ gating.
- `CF-W1-STRAT-01` completed as bounded Strategy Decision Option B-Strict compatibility.
- `CF-W1-L3-AUTH-01` completed portfolio/watchlist child ownership implementation and was committed locally as `74ba6dd`.
- `CF-W1-L3-AUTH-02` completed bounded alert event ownership and was committed locally as `503bcd9`.
- `CF-W1-SIG-TRIGGER-01` completed bounded optional Signal Generation trigger DTO projection and was committed locally as `6ab3999`.
- `CF-W1-SIG-01`, `CF-W1-DQ-01`, and `CF-W1-TP-01` are legacy parent/superseded items and should not be treated as active implementation work.

## Product Agent Recommendation

Do not pull application-code work except the Team 00-promoted `CF-W1-L3-PORT-01A` handoff until another current item has an accepted requirement, accepted child contract or architecture review, exact file reservation, QA plan, and no unresolved Product Owner, Architect, QA, shared-file, schema, provider, UI, or upstream blocker. The resolved decisions are policy inputs only; they do not satisfy Ready criteria by themselves. Team 00 remains the only owner for Ready queue updates.

`CF-W1-L3-PORT-01` remains the parent portfolio/watchlist requirement and `CF-W1-L3-PORT-01B` remains the later watchlist child. `CF-W1-UX-05` is now tracked in the active ten as a sequenced Copilot-only child; shared `StatusBadge` work remains future.
